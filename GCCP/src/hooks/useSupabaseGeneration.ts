/**
 * useSupabaseGeneration Hook - Cloud-based generation with Realtime updates
 * 
 * This hook manages the generation lifecycle in the cloud:
 * 1. Creates a generation record in Supabase
 * 2. Triggers the Edge Function orchestrator
 * 3. Subscribes to Realtime for live progress updates
 * 4. Handles retry logic using checkpoints
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenerationStore } from '@/lib/store/generation';
import { 
  Generation, 
  GenerationLog, 
  GenerationInsert,
  GenerationStatus,
  Checkpoint 
} from '@/types/database';
import { ContentMode } from '@/types/content';

interface UseSupabaseGenerationOptions {
  /** Called when generation completes successfully */
  onComplete?: (generation: Generation) => void;
  /** Called when generation fails */
  onError?: (error: string) => void;
}

interface GenerationParams {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  assignmentCounts?: {
    mcsc: number;
    mcmc: number;
    subjective: number;
  };
}

export function useSupabaseGeneration(options: UseSupabaseGenerationOptions = {}) {
  const supabase = getSupabaseClient();
  const { user } = useAuth();
  const store = useGenerationStore();
  
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Subscribe to realtime updates for a generation
   */
  const subscribeToGeneration = useCallback((generationId: string) => {
    // Cleanup existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to generation updates
    const channel = supabase
      .channel(`generation:${generationId}`)
      // Listen for generation status changes
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
          console.log('[Realtime] Generation updated:', updated.status);

          // Update store based on generation state
          store.setStatus(mapDbStatusToStore(updated.status));
          
          if (updated.final_content) {
            store.setContent(updated.final_content);
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
            options.onComplete?.(updated);
          } else if (updated.status === 'failed') {
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
          console.log('[Realtime] New log:', newLog.agent_name, newLog.message);
          
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
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;
  }, [supabase, store, options]);

  /**
   * Cleanup subscription on unmount
   */
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase]);

  /**
   * Start a new generation
   */
  const startGeneration = useCallback(async (params: GenerationParams) => {
    if (!user) {
      setError('You must be logged in to generate content');
      return null;
    }

    setIsStarting(true);
    setError(null);
    setLogs([]);
    store.clearGenerationState();
    store.setStatus('generating');

    try {
      // 1. Create generation record
      const newGeneration: GenerationInsert = {
        user_id: user.id,
        topic: params.topic,
        subtopics: params.subtopics,
        mode: params.mode,
        transcript: params.transcript || null,
        status: 'queued',
        assignment_data: params.assignmentCounts ? { counts: params.assignmentCounts } : null,
      };

      const { data: generation, error: insertError } = await supabase
        .from('generations')
        .insert(newGeneration)
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      setCurrentGenerationId(generation.id);
      store.addLog(`Starting generation for topic: ${params.topic}`, 'info');

      // 2. Subscribe to realtime updates
      subscribeToGeneration(generation.id);

      // 3. Trigger Edge Function (fire-and-forget)
      // The Edge Function will be triggered by a database webhook
      // Or we can call it directly:
      const { error: fnError } = await supabase.functions.invoke('generate-content', {
        body: { generation_id: generation.id },
      });

      if (fnError) {
        console.warn('[Generation] Edge function invoke warning:', fnError);
        // Don't throw - the webhook might still trigger it
      }

      return generation.id;
    } catch (err: any) {
      setError(err.message);
      store.setStatus('error');
      store.addLog(err.message, 'error');
      return null;
    } finally {
      setIsStarting(false);
    }
  }, [user, supabase, store, subscribeToGeneration]);

  /**
   * Retry a failed generation from the last checkpoint
   */
  const retryGeneration = useCallback(async (generationId: string) => {
    if (!user) {
      setError('You must be logged in');
      return false;
    }

    setError(null);
    store.setStatus('generating');
    store.addLog('Retrying from last checkpoint...', 'info');

    try {
      // 1. Get the last checkpoint
      const { data: checkpoint } = await supabase
        .from('checkpoints')
        .select('*')
        .eq('generation_id', generationId)
        .order('step_number', { ascending: false })
        .limit(1)
        .single();

      // 2. Reset generation status
      const { error: updateError } = await supabase
        .from('generations')
        .update({ 
          status: 'queued' as GenerationStatus,
          error_message: null 
        })
        .eq('id', generationId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // 3. Subscribe to updates
      setCurrentGenerationId(generationId);
      subscribeToGeneration(generationId);

      // 4. Trigger Edge Function with checkpoint info
      const { error: fnError } = await supabase.functions.invoke('generate-content', {
        body: { 
          generation_id: generationId,
          resume_from: checkpoint?.step_name || null,
          resume_content: checkpoint?.content_snapshot || null,
        },
      });

      if (fnError) {
        console.warn('[Generation] Retry invoke warning:', fnError);
      }

      return true;
    } catch (err: any) {
      setError(err.message);
      store.setStatus('error');
      return false;
    }
  }, [user, supabase, store, subscribeToGeneration]);

  /**
   * Stop an in-progress generation
   */
  const stopGeneration = useCallback(async () => {
    if (!currentGenerationId) return;

    try {
      // Update status to failed (Edge Function should check this)
      await supabase
        .from('generations')
        .update({ 
          status: 'failed' as GenerationStatus,
          error_message: 'Stopped by user' 
        })
        .eq('id', currentGenerationId);

      store.setStatus('idle');
      store.addLog('Generation stopped by user', 'warning');
    } catch (err: any) {
      console.error('[Generation] Stop error:', err);
    }
  }, [currentGenerationId, supabase, store]);

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
      console.error('[Generation] Fetch error:', error);
      return [];
    }

    return data;
  }, [user, supabase]);

  /**
   * Load a specific generation
   */
  const loadGeneration = useCallback(async (generationId: string) => {
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
    const { data: genLogs } = await supabase
      .from('generation_logs')
      .select('*')
      .eq('generation_id', generationId)
      .order('created_at', { ascending: true });

    setCurrentGenerationId(generationId);
    setLogs(genLogs || []);

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
  }, [supabase, store, subscribeToGeneration]);

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

    if (currentGenerationId === generationId) {
      setCurrentGenerationId(null);
      setLogs([]);
      store.reset();
    }

    return true;
  }, [supabase, currentGenerationId, store]);

  return {
    // State
    currentGenerationId,
    generationLogs: logs, // Renamed to avoid conflict with store.logs
    isStarting,
    error,
    
    // Actions
    startGeneration,
    retryGeneration,
    stopGeneration,
    loadGeneration,
    fetchGenerations,
    deleteGeneration,
    
    // Store passthrough (includes logs from local store)
    ...store,
  };
}

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
      return 'complete'; // or could add 'pending' state
    default:
      return 'idle';
  }
}
