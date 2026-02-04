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

    const checkBudget = async (): Promise<{ allowed: boolean; remaining: number }> => {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const userId = sessionData.session?.user?.id;
            if (!userId) {
                console.warn('[useGeneration] No user ID found for budget check');
                return { allowed: false, remaining: 0 };
            }

            // Try to get profile with spent_credits (new schema)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('credits, spent_credits')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.warn('[useGeneration] Profile query error:', profileError.message);
                // If spent_credits column doesn't exist, fall back to old method
                if (profileError.message?.includes('spent_credits') || profileError.code === 'PGRST116') {
                    console.log('[useGeneration] Falling back to generation-based spending calculation');
                    return await checkBudgetLegacy(userId);
                }
                // For other errors, allow generation to not block users
                return { allowed: true, remaining: 0 };
            }

            // Convert budget and spent from cents to dollars
            const budgetInDollars = (profile?.credits || 0) / 100;
            // Handle case where spent_credits might be null/undefined (column exists but no value)
            const spentInDollars = (profile?.spent_credits ?? 0) / 100;
            const remaining = budgetInDollars - spentInDollars;

            console.log('[useGeneration] Budget check:', { budgetInDollars, spentInDollars, remaining });
            return { allowed: remaining > 0, remaining };
        } catch (err) {
            console.error('[useGeneration] Budget check failed:', err);
            return { allowed: true, remaining: 0 }; // Allow on error to not block users
        }
    };

    // Legacy budget check - calculates spent from generations table
    // Used as fallback when spent_credits column doesn't exist yet
    const checkBudgetLegacy = async (userId: string): Promise<{ allowed: boolean; remaining: number }> => {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single();

            const { data: generations } = await supabase
                .from('generations')
                .select('estimated_cost')
                .eq('user_id', userId);

            const budgetInDollars = (profile?.credits || 0) / 100;
            const spent = generations?.reduce((sum: number, g: { estimated_cost: number | null }) => sum + (g.estimated_cost || 0), 0) || 0;
            const remaining = budgetInDollars - spent;

            console.log('[useGeneration] Legacy budget check:', { budgetInDollars, spent, remaining });
            return { allowed: remaining > 0, remaining };
        } catch (err) {
            console.error('[useGeneration] Legacy budget check failed:', err);
            return { allowed: true, remaining: 0 };
        }
    };

    const startGeneration = async () => {
        // Prevent double-execution if already generating
        if (store.status === 'generating') {
            console.warn('[useGeneration] Already generating - ignoring duplicate call');
            return;
        }

        // Check budget before starting
        const budgetCheck = await checkBudget();
        if (!budgetCheck.allowed) {
            setError(`Budget exhausted! You have $${budgetCheck.remaining.toFixed(4)} remaining. Please contact an administrator to increase your budget.`);
            store.addLog('Generation blocked: Budget exhausted', 'error');
            return;
        }

        // 1. Abort previous if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // 2. Create new controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Get API key from env (for client-side generation)
        const apiKey = process.env.XAI_API_KEY || '';

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
                            hasContent: !!currentStore.finalContent,
                            contentLength: currentStore.finalContent?.length || 0
                        }
                    });

                    // Get fresh session directly from Supabase client to ensure we have current auth state
                    // This is more reliable than using the hook's captured values
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
                    
                    if (sessionError) {
                        log.error('Failed to get session', { data: sessionError });
                        store.addLog('Failed to verify session - generation not saved', 'warning');
                        console.error('[useGeneration] Session error:', sessionError);
                        return;
                    }
                    
                    const currentUser = sessionData.session?.user;
                    const accessToken = sessionData.session?.access_token;
                    
                    log.debug('Fresh session check', { 
                        data: { 
                            hasUser: !!currentUser, 
                            userId: currentUser?.id,
                            hasToken: !!accessToken,
                            tokenLength: accessToken?.length || 0
                        } 
                    });
                    
                    console.log('[useGeneration] Session check:', {
                        hasUser: !!currentUser,
                        userId: currentUser?.id,
                        hasToken: !!accessToken
                    });
                    
                    if (!currentUser) {
                        log.warn('No user in current session');
                        store.addLog('Not logged in - generation not saved to cloud', 'warning');
                        console.warn('[useGeneration] No user found - content will not be saved');
                        return;
                    }
                    
                    if (!accessToken) {
                        log.warn('No access token - user may need to re-login');
                        store.addLog('Session expired - please re-login', 'warning');
                        console.warn('[useGeneration] No access token - user needs to re-login');
                        return;
                    }

                    // Prepare full content
                    const fullContent = (currentStore.finalContent || '') + (event.content as string || '');
                    
                    if (!fullContent || fullContent.trim().length === 0) {
                        log.warn('No content to save');
                        store.addLog('No content generated to save', 'warning');
                        return;
                    }
                    
                    // Use the reliable persistence service - await to ensure save completes
                    store.addLog('Saving to cloud...', 'info');
                    console.log('[useGeneration] Starting save to cloud...');
                    
                    try {
                        const saveData = {
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
                        };
                        
                        console.log('[useGeneration] Save data prepared:', {
                            user_id: saveData.user_id,
                            topic: saveData.topic,
                            mode: saveData.mode,
                            contentLength: saveData.final_content.length
                        });
                        
                        const result = await saveGeneration(saveData, accessToken);
                        
                        console.log('[useGeneration] Save result:', result);
                        
                        if (result.success) {
                            log.info('Saved successfully', { data: { id: result.generation_id, retries: result.retryCount } });
                            store.addLog(`Saved to cloud successfully${result.generation_id ? ` (ID: ${result.generation_id.slice(0, 8)}...)` : ''}`, 'success');
                        } else {
                            log.error('Save failed', { data: { error: result.error } });
                            console.error('[useGeneration] Save failed:', result.error);
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
