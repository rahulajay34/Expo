import { useState, useRef, useEffect } from 'react';
import { useGenerationStore, cleanupContentBuffer } from '@/lib/store/generation';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { GenerationParams } from '@/types/content';
import { getSupabaseClient } from '@/lib/supabase/client';
import { GenerationStatus } from '@/types/database';
import { generationLog as log } from '@/lib/utils/env-logger';
import { saveGeneration } from '@/lib/storage/persistence';

export const useGeneration = () => {
    const store = useGenerationStore();
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
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

            for await (const event of generator) {
                // Check if aborted logic is handled in the orchestrator, but we can also double check
                if (controller.signal.aborted) break;
                
                console.log('[useGeneration] Event received:', event.type);

                if (event.type === 'step') {
                    store.setCurrentAgent(event.agent || 'System');
                    store.setCurrentAction(event.action || event.message || '');
                    // Add log with agent info for stepper tracking
                    store.addStepLog(event.agent || 'System', event.message || '');
                } else if (event.type === 'chunk') {
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
                    store.setContent(event.content as string);
                    store.addLog('Content updated by agent', 'info');
                } else if (event.type === 'formatted') {
                    store.setFormattedContent(event.content as string);
                    store.addLog('Content formatted for LMS', 'success');
                } else if (event.type === 'complete') {
                    log.info('COMPLETE event received, starting save process...');
                    
                    // Flush any buffered content before completing
                    store.flushContentBuffer();

                    store.setStatus('complete');
                    store.addLog('Generation completed successfully', 'success');

                    // Track estimated cost
                    if (typeof event.cost === 'number') {
                        store.setEstimatedCost(event.cost);
                    }

                    // Persist to Supabase using reliable persistence service
                    const currentStore = useGenerationStore.getState();
                    log.debug('Current store state', {
                        data: {
                            topic: currentStore.topic,
                            mode: currentStore.mode,
                            hasContent: !!currentStore.finalContent
                        }
                    });

                    // Get fresh session directly from Supabase client to ensure we have current auth state
                    // This is more reliable than using the hook's captured values
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                    
                    if (sessionError) {
                        log.error('Failed to get session', { data: sessionError });
                        store.addLog('Failed to verify session - generation not saved', 'warning');
                        return;
                    }
                    
                    const currentUser = sessionData.session?.user;
                    const accessToken = sessionData.session?.access_token;
                    
                    log.debug('Fresh session check', { 
                        data: { 
                            hasUser: !!currentUser, 
                            userId: currentUser?.id,
                            hasToken: !!accessToken 
                        } 
                    });
                    
                    if (!currentUser) {
                        log.warn('No user in current session');
                        store.addLog('Not logged in - generation not saved to cloud', 'warning');
                        return;
                    }
                    
                    if (!accessToken) {
                        log.warn('No access token - user may need to re-login');
                        store.addLog('Session expired - please re-login', 'warning');
                        return;
                    }

                    // Prepare full content
                    const fullContent = (currentStore.finalContent || '') + (event.content as string || '');
                    
                    // Use the reliable persistence service - await to ensure save completes
                    store.addLog('Saving to cloud...', 'info');
                    
                    try {
                        const result = await saveGeneration({
                            user_id: currentUser.id,
                            topic: currentStore.topic,
                            subtopics: currentStore.subtopics,
                            mode: currentStore.mode,
                            status: 'completed' as GenerationStatus,
                            final_content: fullContent,
                            gap_analysis: currentStore.gapAnalysis,
                            assignment_data: currentStore.formattedContent ? 
                                { formatted: currentStore.formattedContent } : null,
                            estimated_cost: currentStore.estimatedCost || 0,
                        }, accessToken);
                        
                        if (result.success) {
                            log.info('Saved successfully', { data: { id: result.generation_id, retries: result.retryCount } });
                            store.addLog('Saved to cloud successfully', 'success');
                        } else {
                            log.error('Save failed', { data: { error: result.error } });
                            store.addLog(`Save failed: ${result.error}`, 'warning');
                            
                            // If it was a duplicate detection, that's OK - don't show as error
                            if (!result.error?.includes('Duplicate detected')) {
                                setError(`Failed to save: ${result.error}`);
                            }
                        }
                    } catch (err: any) {
                        log.error('Save error', { data: err });
                        store.addLog(`Save error: ${err.message}`, 'error');
                        setError(`Save error: ${err.message}`);
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
