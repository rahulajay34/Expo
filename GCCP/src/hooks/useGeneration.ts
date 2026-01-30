/**
 * useGeneration Hook - Production v2.0
 * 
 * This hook has been migrated to use the server-based architecture:
 * - No client-side Orchestrator instantiation
 * - API calls to /api/generate endpoint
 * - Supabase Realtime subscription for progress updates
 * - Session recovery on page load
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useGenerationStore, cleanupContentBuffer } from '@/lib/store/generation';
import { GenerationParams } from '@/types/content';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Generation, 
  GenerationLog, 
  GenerationInsert,
  GenerationStatus,
  GenerationUpdate,
  HistoricalTimingData 
} from '@/types/database';
import { generationLog as log } from '@/lib/utils/env-logger';

interface UseGenerationOptions {
  /** Called when generation completes successfully */
  onComplete?: (generation: Generation) => void;
  /** Called when generation fails */
  onError?: (error: string) => void;
}

export const useGeneration = (options: UseGenerationOptions = {}) => {
  const store = useGenerationStore();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [historicalData, setHistoricalData] = useState<HistoricalTimingData[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentGenerationIdRef = useRef<string | null>(null);
  
  const { user, session } = useAuth();
  const supabase = getSupabaseClient();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      cleanupContentBuffer();
    };
  }, [supabase]);

  // Session recovery on page load - check for active generations
  useEffect(() => {
    if (!user) return;

    const recoverSession = async () => {
      try {
        // Look for any processing or queued generations for this user
        const { data: activeGenerations, error } = await supabase
          .from('generations')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['queued', 'processing'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          log.error('Session recovery error', { data: error });
          return;
        }

        if (activeGenerations && activeGenerations.length > 0) {
          const generation = activeGenerations[0];
          log.info('Recovering active generation', { data: { id: generation.id, status: generation.status } });
          
          // Restore state
          currentGenerationIdRef.current = generation.id;
          store.setTopic(generation.topic);
          store.setSubtopics(generation.subtopics);
          store.setMode(generation.mode);
          store.setStatus('generating');
          
          if (generation.transcript) {
            store.setTranscript(generation.transcript);
          }
          
          // Update progress from recovered state
          setProgress({
            percent: generation.progress_percent || 0,
            message: generation.progress_message || 'Recovering...',
          });
          
          // Subscribe to realtime updates
          subscribeToGeneration(generation.id);
          
          // Load existing logs
          loadGenerationLogs(generation.id);
        }
      } catch (err) {
        log.error('Session recovery failed', { data: err });
      }
    };

    recoverSession();
  }, [user, supabase, store]);

  /**
   * Load historical timing data for progress estimation
   */
  const loadHistoricalData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('historical_timing')
        .select('*')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      setHistoricalData(data || []);
    } catch (err) {
      log.error('Failed to load historical timing data', { data: err });
    }
  }, [supabase]);

  /**
   * Load logs for a generation
   */
  const loadGenerationLogs = useCallback(async (generationId: string) => {
    try {
      const { data, error } = await supabase
        .from('generation_logs')
        .select('*')
        .eq('generation_id', generationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      log.error('Failed to load generation logs', { data: err });
    }
  }, [supabase]);

  /**
   * Subscribe to realtime updates for a generation
   */
  const subscribeToGeneration = useCallback((generationId: string) => {
    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to generation updates (includes progress_percent, progress_message, partial_content)
    const channel = supabase
      .channel(`generation:${generationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generations',
          filter: `id=eq.${generationId}`,
        },
        (payload) => {
          const updated = payload.new as Generation;
          log.debug('[Realtime] Generation updated', { data: { status: updated.status, progress: updated.progress_percent } });

          // Update progress state
          if (updated.progress_percent !== undefined) {
            setProgress({
              percent: updated.progress_percent,
              message: updated.progress_message || updated.progress_message || 'Processing...',
            });
          }

          // Update store status
          store.setStatus(mapDbStatusToStore(updated.status));
          
          // Update current agent
          if (updated.current_agent) {
            store.setCurrentAgent(updated.current_agent);
          }
          
          // Update content if available
          if (updated.final_content) {
            store.setContent(updated.final_content);
          }
          
          // Update partial content for streaming display
          if (updated.partial_content) {
            try {
              const partial = JSON.parse(updated.partial_content);
              if (partial.questions) {
                store.setFormattedContent(JSON.stringify(partial, null, 2));
              }
            } catch {
              // Not JSON, treat as raw content
              store.updateContent(updated.partial_content);
            }
          }
          
          if (updated.assignment_data) {
            store.setFormattedContent(JSON.stringify(updated.assignment_data, null, 2));
          }
          
          if (updated.gap_analysis) {
            store.setGapAnalysis(updated.gap_analysis);
          }

          if (updated.estimated_cost) {
            store.setEstimatedCost(updated.estimated_cost);
          }

          if (updated.error_message) {
            setError(updated.error_message);
            store.addLog(updated.error_message, 'error');
          }

          // Handle completion
          if (updated.status === 'completed') {
            currentGenerationIdRef.current = null;
            options.onComplete?.(updated);
          } else if (updated.status === 'failed') {
            currentGenerationIdRef.current = null;
            options.onError?.(updated.error_message || 'Generation failed');
          }
        }
      )
      // Listen for new logs
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'generation_logs',
          filter: `generation_id=eq.${generationId}`,
        },
        (payload) => {
          const newLog = payload.new as GenerationLog;
          log.debug('[Realtime] New log', { data: { agent: newLog.agent_name, message: newLog.message } });
          
          setLogs((prev) => [...prev, newLog]);
          
          // Update store with agent info
          store.setCurrentAgent(newLog.agent_name);
          store.setCurrentAction(newLog.message);
          
          // Add to store logs
          if (newLog.log_type === 'step') {
            store.addStepLog(newLog.agent_name, newLog.message);
          } else {
            store.addLog(newLog.message, newLog.log_type);
          }
        }
      )
      .subscribe((status) => {
        log.debug('[Realtime] Subscription status', { data: { status } });
      });

    channelRef.current = channel;
  }, [supabase, store, options]);

  /**
   * Start a new generation via API endpoint
   */
  const startGeneration = useCallback(async (params?: GenerationParams) => {
    if (!user) {
      setError('You must be logged in to generate content');
      return null;
    }

    // Abort any previous generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsStarting(true);
    setError(null);
    setLogs([]);
    setProgress({ percent: 0, message: 'Initializing...' });
    store.clearGenerationState();
    store.setStatus('generating');

    // Use params or fall back to store state
    const generationParams: GenerationParams = params || {
      topic: store.topic,
      subtopics: store.subtopics,
      mode: store.mode,
      transcript: store.transcript || '',
      additionalInstructions: '',
      assignmentCounts: store.assignmentCounts,
    };

    try {
      // 1. Create generation record in database
      const newGeneration: GenerationInsert = {
        user_id: user.id,
        topic: generationParams.topic,
        subtopics: generationParams.subtopics,
        mode: generationParams.mode,
        transcript: generationParams.transcript || null,
        status: 'queued',
        assignment_data: generationParams.assignmentCounts ? { counts: generationParams.assignmentCounts } : null,
        progress_percent: 0,
        progress_message: 'Initializing...',
      };

      const { data: generation, error: insertError } = await supabase
        .from('generations')
        .insert(newGeneration)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      currentGenerationIdRef.current = generation.id;
      store.addLog(`Starting generation for topic: ${generationParams.topic}`, 'info');

      // 2. Subscribe to realtime updates
      subscribeToGeneration(generation.id);

      // 3. Call the API endpoint to trigger generation
      const apiUrl = '/api/generate';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ generation_id: generation.id }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result = await response.json();
      log.info('Generation API response', { data: result });

      return generation.id;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        store.addLog('Generation stopped by user', 'warning');
        store.setStatus('idle');
      } else {
        setError(err.message);
        store.setStatus('error');
        store.addLog(err.message, 'error');
      }
      return null;
    } finally {
      setIsStarting(false);
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [user, session, supabase, store, subscribeToGeneration]);

  /**
   * Stop an in-progress generation
   */
  const stopGeneration = useCallback(async () => {
    const generationId = currentGenerationIdRef.current;
    if (!generationId) return;

    // Abort the API call
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    try {
      // Update status to failed in database
      const update: GenerationUpdate = {
        status: 'failed',
        error_message: 'Stopped by user',
        progress_message: 'Generation stopped by user',
      };

      await supabase
        .from('generations')
        .update(update)
        .eq('id', generationId);

      currentGenerationIdRef.current = null;
      store.setStatus('idle');
      store.addLog('Generation stopped by user', 'warning');
    } catch (err: any) {
      log.error('Stop generation error', { data: err });
    }
  }, [supabase, store]);

  /**
   * Retry a failed generation from the last checkpoint
   */
  const retryGeneration = useCallback(async (generationId: string) => {
    if (!user) {
      setError('You must be logged in');
      return false;
    }

    setError(null);
    setProgress({ percent: 0, message: 'Resuming from checkpoint...' });
    store.setStatus('generating');
    store.addLog('Retrying from last checkpoint...', 'info');

    try {
      // Get the generation to retrieve resume token
      const { data: generation, error: fetchError } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Reset generation status
      const { error: updateError } = await supabase
        .from('generations')
        .update({ 
          status: 'queued' as GenerationStatus,
          error_message: null,
          progress_percent: 0,
          progress_message: 'Resuming from checkpoint...',
        })
        .eq('id', generationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      currentGenerationIdRef.current = generationId;
      subscribeToGeneration(generationId);

      // Call API with resume token
      const apiUrl = '/api/generate';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ 
          generation_id: generationId,
          resume_token: generation.resume_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      store.setStatus('error');
      return false;
    }
  }, [user, session, supabase, store, subscribeToGeneration]);

  /**
   * Load a specific generation
   */
  const loadGeneration = useCallback(async (generationId: string) => {
    try {
      const { data: generation, error: genError } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generationId)
        .single();

      if (genError) {
        setError(genError.message);
        return null;
      }

      // Load logs for this generation
      await loadGenerationLogs(generationId);

      currentGenerationIdRef.current = generationId;

      // Update store
      store.setTopic(generation.topic);
      store.setSubtopics(generation.subtopics);
      store.setMode(generation.mode);
      store.setStatus(mapDbStatusToStore(generation.status));
      
      if (generation.final_content) {
        store.setContent(generation.final_content);
      }
      if (generation.gap_analysis) {
        store.setGapAnalysis(generation.gap_analysis);
      }
      if (generation.transcript) {
        store.setTranscript(generation.transcript);
      }

      // If still processing, subscribe to updates
      if (generation.status === 'processing' || generation.status === 'queued') {
        subscribeToGeneration(generationId);
      }

      return generation;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [supabase, store, subscribeToGeneration, loadGenerationLogs]);

  /**
   * Fetch user's generation history
   */
  const fetchGenerations = useCallback(async (limit = 20) => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error('Fetch generations error', { data: error });
      return [];
    }

    return data;
  }, [user, supabase]);

  /**
   * Delete a generation
   */
  const deleteGeneration = useCallback(async (generationId: string) => {
    const { error } = await supabase
      .from('generations')
      .delete()
      .eq('id', generationId);

    if (error) {
      setError(error.message);
      return false;
    }

    if (currentGenerationIdRef.current === generationId) {
      currentGenerationIdRef.current = null;
      setLogs([]);
      store.reset();
    }

    return true;
  }, [supabase, store]);

  /**
   * Clear storage and reset state
   */
  const clearStorage = useCallback(() => {
    localStorage.removeItem('generation-storage');
    store.reset();
    setLogs([]);
    setProgress({ percent: 0, message: '' });
    currentGenerationIdRef.current = null;
    window.location.reload();
  }, [store]);

  return {
    // State
    ...store,
    logs,
    progress,
    historicalData,
    isStarting,
    error,
    currentGenerationId: currentGenerationIdRef.current,
    
    // Actions
    startGeneration,
    stopGeneration,
    retryGeneration,
    loadGeneration,
    fetchGenerations,
    deleteGeneration,
    clearStorage,
    loadHistoricalData,
  };
};

/**
 * Map database status to store status
 */
function mapDbStatusToStore(dbStatus: GenerationStatus): 'idle' | 'generating' | 'complete' | 'error' | 'mismatch' {
  switch (dbStatus) {
    case 'queued':
    case 'processing':
      return 'generating';
    case 'completed':
      return 'complete';
    case 'failed':
      return 'error';
    case 'waiting_approval':
      return 'complete';
    default:
      return 'idle';
  }
}
