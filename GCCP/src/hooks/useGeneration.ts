import { useState, useRef, useEffect } from 'react';
import { useGenerationStore, cleanupContentBuffer } from '@/lib/store/generation';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { GenerationParams } from '@/types/content';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GenerationStatus, Json } from '@/types/database';
import { generationLog as log } from '@/lib/utils/env-logger';

export const useGeneration = () => {
    const store = useGenerationStore();
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const { user, session } = useAuth();  // Get session from auth hook
    const supabase = getSupabaseClient();

    // Cleanup AbortController and content buffer on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            cleanupContentBuffer();
        };
    }, []);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            store.setStatus('idle');
            store.addLog('Generation stopped by user', 'warning');
            abortControllerRef.current = null;
        }
    };

    const clearStorage = () => {
        localStorage.removeItem('generation-storage');
        // also clear logs if needed, but store.reset() usually handles state
        store.reset();
        // Optional: clear DB or just local state. The user requested clearing storage.
        // Reload to ensure fresh state
        window.location.reload();
    };

    const startGeneration = async () => {
        // 1. Abort previous if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 2. Create new controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Get API key from env (for client-side generation)
        const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '';

        let orchestrator;
        try {
            orchestrator = new Orchestrator(apiKey);
        } catch (e: any) {
            setError(e.message);
            return;
        }

        store.clearGenerationState();
        store.setStatus('generating');
        setError(null);
        store.addLog(`Starting generation for topic: ${store.topic}`, 'info');

        const params: GenerationParams = {
            topic: store.topic,
            subtopics: store.subtopics,
            mode: store.mode,
            transcript: store.transcript || '',
            additionalInstructions: '',
            assignmentCounts: store.assignmentCounts
        };

        try {
            const generator = orchestrator.generate(params, controller.signal);
            let chunkCount = 0;
            const logInterval = 100; // Log every 100 chunks

            for await (const event of generator) {
                // Check if aborted logic is handled in the orchestrator, but we can also double check
                if (controller.signal.aborted) break;

                if (event.type === 'step') {
                    console.log('[useGeneration] Step:', event.agent, event.message);
                    store.setCurrentAgent(event.agent || 'System');
                    store.setCurrentAction(event.action || event.message || '');
                    // Add log with agent info for stepper tracking
                    store.addStepLog(event.agent || 'System', event.message || '');
                } else if (event.type === 'chunk') {
                    chunkCount++;
                    if (chunkCount % logInterval === 0) {
                        console.log(`[useGeneration] Processing chunks... (${chunkCount} received)`);
                    }
                    store.updateContent(event.content as string || '');
                } else if (event.type === 'gap_analysis') {
                    store.setGapAnalysis(event.content);
                    store.addLog('Gap analysis complete', 'success');
                } else if (event.type === 'course_detected') {
                    // Show detected domain to user
                    const courseData = event.content as any;
                    const domain = courseData?.domain || 'general';
                    const confidence = courseData?.confidence || 0;
                    store.addStepLog('CourseDetector', `Detected: ${domain} (${Math.round(confidence * 100)}%)`);
                    store.addLog(`Content domain detected: ${domain}`, 'success');
                } else if (event.type === 'replace') {
                    console.log('[useGeneration] Content replaced by agent');
                    store.setContent(event.content as string);
                    store.addLog('Content updated by agent', 'info');
                } else if (event.type === 'formatted') {
                    console.log('[useGeneration] Content formatted');
                    store.setFormattedContent(event.content as string);
                    store.addLog('Content formatted for LMS', 'success');
                } else if (event.type === 'complete') {
                    console.log('[useGeneration] Generation complete');
                    log.info('COMPLETE event received, starting save process...');
                    
                    // Flush any buffered content before completing
                    store.flushContentBuffer();

                    store.setStatus('complete');
                    store.addLog('Generation completed successfully', 'success');

                    // Track estimated cost
                    if (typeof event.cost === 'number') {
                        store.setEstimatedCost(event.cost);
                    }

                    // Persist to Supabase - use user from auth hook (captured at generation start)
                    const currentStore = useGenerationStore.getState();
                    log.debug('Current store state', {
                        data: {
                            topic: currentStore.topic,
                            mode: currentStore.mode,
                            hasContent: !!currentStore.finalContent
                        }
                    });

                    // Use the user from auth context (captured when generation started)
                    log.debug('User from auth hook', { data: { id: user?.id, email: user?.email } });
                    
                    if (!user) {
                        log.warn('No user available from auth hook');
                        store.addLog('Not logged in - generation not saved to cloud', 'warning');
                        return;
                    }

                    try {
                        log.debug('Inserting generation', {
                            data: {
                                user_id: user.id,
                                topic: currentStore.topic,
                                mode: currentStore.mode
                            }
                        });
                        
                        // Combine and limit content size (max ~500KB to be safe)
                        const fullContent = (currentStore.finalContent || '') + (event.content as string || '');
                        const maxContentLength = 500000; // ~500KB
                        const truncatedContent = fullContent.length > maxContentLength 
                            ? fullContent.slice(0, maxContentLength) + '\n\n[Content truncated due to size...]'
                            : fullContent;
                        
                        log.debug('Content size', { data: { original: fullContent.length, truncated: truncatedContent.length } });
                        
                        const insertData = {
                            user_id: user.id,
                            topic: currentStore.topic,
                            subtopics: currentStore.subtopics,
                            mode: currentStore.mode,
                            status: 'completed' as GenerationStatus,
                            current_step: 0,
                            gap_analysis: currentStore.gapAnalysis as Json | null,
                            final_content: truncatedContent,
                            assignment_data: currentStore.formattedContent ? 
                                { formatted: currentStore.formattedContent } as Json : null,
                            estimated_cost: currentStore.estimatedCost || 0,
                        };
                        
                        log.debug('Insert data prepared, calling Supabase...');
                        
                        // Use fetch API directly to bypass Supabase client issues
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        
                        if (!supabaseUrl || !supabaseKey) {
                            log.error('Missing Supabase credentials');
                            store.addLog('Missing Supabase credentials', 'error');
                            return;
                        }
                        
                        // Use session from auth hook (already available, no async call needed)
                        const accessToken = session?.access_token;
                        
                        log.debug('Session token available', { data: { hasToken: !!accessToken } });
                        
                        if (!accessToken) {
                            log.warn('No access token - user may need to re-login');
                            store.addLog('Session expired - please re-login', 'warning');
                            return;
                        }
                        
                        // Use direct fetch to Supabase REST API (fire and forget)
                        log.debug('Using direct REST API call...');
                        const testStart = Date.now();
                        
                        fetch(`${supabaseUrl}/rest/v1/generations`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'apikey': supabaseKey,
                                'Authorization': `Bearer ${accessToken}`,
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify(insertData)
                        })
                        .then(async (response) => {
                            const elapsed = Date.now() - testStart;
                            log.debug(`REST API response in ${elapsed}ms`, { data: { status: response.status, statusText: response.statusText } });
                            
                            if (!response.ok) {
                                const errorText = await response.text();
                                log.error('REST API error', { data: errorText });
                                store.addLog(`Failed to save: ${response.status} ${errorText}`, 'warning');
                            } else {
                                log.info('Saved successfully via REST API!');
                                store.addLog('Saved to cloud successfully', 'success');
                            }
                        })
                        .catch((err) => {
                            log.error('REST API fetch error', { data: err });
                            store.addLog(`Network error: ${err.message}`, 'warning');
                        });
                        
                        store.addLog('Saving to cloud...', 'info');
                        
                    } catch (err: any) {
                        log.error('Error in save process', { data: err });
                        store.addLog(`Error saving: ${err.message}`, 'error');
                    }

                } else if (event.type === 'mismatch_stop') {
                    // Transcript mismatch detected - stop and let user decide
                    store.setStatus('mismatch');
                    store.addLog(event.message as string || 'Transcript mismatch detected', 'warning');
                    setError(event.message as string || 'Transcript does not match topic/subtopics');
                    // Don't continue processing - generator will return after this
                } else if (event.type === 'error') {
                    // console.error(event.message);
                    store.addLog(event.message || 'Error occurred', 'error');
                    setError(event.message || 'Unknown error');
                    store.setStatus('error');
                }
            }
        } catch (e: any) {
            if (e.message === 'Aborted' || e.name === 'AbortError') {
                store.addLog('Generation stopped by user', 'warning');
                store.setStatus('idle');
            } else {
                setError(e.message);
                store.addLog(e.message, 'error');
                store.setStatus('error');
            }
        } finally {
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    };

    return {
        ...store,
        logs: store.logs,
        formattedContent: store.formattedContent,
        estimatedCost: store.estimatedCost,
        setTranscript: store.setTranscript,
        setFormattedContent: store.setFormattedContent,
        error,
        startGeneration,
        stopGeneration,
        clearStorage
    };
};
