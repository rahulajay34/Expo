'use client';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { HistoricalTimingData, ContentMode } from '@/types/database';

interface Log {
    type: string;
    message?: string;
    action?: string;
    agent?: string;
    content?: unknown;
    timestamp?: number;
}

interface StepperProps {
    logs: Log[];
    status: 'idle' | 'generating' | 'complete' | 'error' | 'mismatch';
    mode?: ContentMode;
    hasTranscript?: boolean;
    progressPercent?: number;
    progressMessage?: string;
}

// Stage display names mapping
const STAGE_DISPLAY_NAMES: Record<string, string> = {
    'Initialization': 'Setup',
    'CourseDetection': 'Context',
    'GapAnalysis': 'Analysis',
    'DraftCreation': 'Draft',
    'Sanitization': 'Fact-Check',
    'Review': 'Review',
    'Refinement': 'Polish',
    'FinalPolish': 'Final Polish',
    'Formatting': 'Format',
    'Completion': 'Complete',
    'CourseDetector': 'Context',
    'Analyzer': 'Analysis',
    'Creator': 'Draft',
    'Sanitizer': 'Fact-Check',
    'Reviewer': 'Review',
    'Refiner': 'Polish',
    'Formatter': 'Format',
    'Orchestrator': 'Setup',
};

// Reverse mapping: agent names (from Edge Function logs) to stage IDs
const AGENT_TO_STAGE: Record<string, string> = {
    'Orchestrator': 'Initialization',
    'CourseDetector': 'CourseDetection',
    'Analyzer': 'GapAnalysis',
    'Creator': 'DraftCreation',
    'Sanitizer': 'Sanitization',
    'Reviewer': 'Review',
    'Refiner': 'Refinement',
    'Formatter': 'Formatting',
};

// Reverse mapping: stage IDs to agent names
const STAGE_TO_AGENT: Record<string, string> = {
    'Initialization': 'Orchestrator',
    'CourseDetection': 'CourseDetector',
    'GapAnalysis': 'Analyzer',
    'DraftCreation': 'Creator',
    'Sanitization': 'Sanitizer',
    'Review': 'Reviewer',
    'Refinement': 'Refiner',
    'FinalPolish': 'Refiner',
    'Formatting': 'Formatter',
    'Completion': 'Orchestrator',
};

// Helper function to check if a stage is complete based on agent logs
const isStageComplete = (stage: { id: string }, completedSteps: Log[]): boolean => {
    const agentName = STAGE_TO_AGENT[stage.id];
    return completedSteps.some(s =>
        s.agent === stage.id ||
        s.agent === agentName ||
        (agentName && AGENT_TO_STAGE[s.agent || ''] === stage.id)
    );
};

// Helper function to check if a stage is currently active
const isStageActive = (stageId: string, currentAgent: string | null | undefined): boolean => {
    if (!currentAgent) return false;
    const expectedAgent = STAGE_TO_AGENT[stageId];
    return currentAgent === stageId || 
           currentAgent === expectedAgent ||
           AGENT_TO_STAGE[currentAgent] === stageId;
};

// Define the full agent pipeline with new stage names
const getAgentPipeline = (mode: ContentMode = 'lecture', hasTranscript: boolean = false) => {
    const pipeline = [
        { id: 'Initialization', label: 'Setup', required: true },
        { id: 'CourseDetection', label: 'Context', required: true },
        hasTranscript ? { id: 'GapAnalysis', label: 'Analysis', required: true } : null,
        { id: 'DraftCreation', label: 'Draft', required: true },
        hasTranscript ? { id: 'Sanitization', label: 'Fact-Check', required: true } : null,
        { id: 'Review', label: 'Review', required: true },
        { id: 'Refinement', label: 'Polish', required: false },
        { id: 'FinalPolish', label: 'Final Polish', required: true },
        mode === 'assignment' ? { id: 'Formatting', label: 'Format', required: true } : null,
        { id: 'Completion', label: 'Complete', required: true },
    ].filter(Boolean) as Array<{ id: string; label: string; required: boolean }>;
    
    return pipeline;
};

// Format seconds to readable time
const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
};

export const GenerationStepper = memo(function GenerationStepper({ 
    logs, 
    status, 
    mode = 'lecture', 
    hasTranscript = false,
    progressPercent: externalProgressPercent,
    progressMessage: externalProgressMessage,
}: StepperProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [historicalData, setHistoricalData] = useState<HistoricalTimingData[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const supabase = getSupabaseClient();

    // Load historical timing data when generation starts
    useEffect(() => {
        if (status === 'generating' && historicalData.length === 0) {
            loadHistoricalData();
        }
    }, [status]);

    const loadHistoricalData = async () => {
        setIsLoadingHistory(true);
        try {
            const { data, error } = await supabase
                .from('historical_timing')
                .select('*')
                .eq('mode', mode)
                .order('last_updated', { ascending: false });

            if (!error && data) {
                setHistoricalData(data);
            }
        } catch {
            // Silently fail - historical data is optional
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Start timer when generation begins
    useEffect(() => {
        if (status === 'generating' && !startTimeRef.current) {
            startTimeRef.current = Date.now();
        }
        if (status !== 'generating') {
            startTimeRef.current = null;
            setElapsedTime(0);
        }
    }, [status]);
    
    // Update elapsed time every 2 seconds
    useEffect(() => {
        if (status !== 'generating') return;
        
        const interval = setInterval(() => {
            if (startTimeRef.current) {
                setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
        }, 2000);
        
        return () => clearInterval(interval);
    }, [status]);
    
    // Filter out only relevant steps to show in the UI
    const completedSteps = logs.filter(l => l.type === 'step');
    const pipeline = getAgentPipeline(mode, hasTranscript);
    
    // Find current active agent from logs
    const currentAgent = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].agent : null;
    
    // Use external progress if provided (from useGeneration hook), otherwise calculate locally
    const displayProgress = externalProgressPercent !== undefined 
        ? externalProgressPercent 
        : (pipeline.length > 0 ? (completedSteps.length / pipeline.length) * 100 : 0);

    // Calculate estimated remaining time based on historical data
    const estimatedRemaining = useMemo(() => {
        if (historicalData.length === 0) return null;
        
        const remainingStages = pipeline.filter(stage => !isStageComplete(stage, completedSteps));
        
        return remainingStages.reduce((sum, stage) => {
            const historical = historicalData.find(h => h.stage_name === stage.id);
            return sum + (historical ? historical.avg_duration_ms / 1000 : 10); // Default 10s if no data
        }, 0);
    }, [historicalData, pipeline, completedSteps]);

    // Get current stage from progress message
    const currentStage = useMemo(() => {
        if (externalProgressMessage) {
            // Extract stage name from message if possible
            for (const stage of pipeline) {
                if (externalProgressMessage.toLowerCase().includes(stage.id.toLowerCase()) ||
                    externalProgressMessage.toLowerCase().includes(stage.label.toLowerCase())) {
                    return stage;
                }
            }
        }
        return pipeline.find(s => s.id === currentAgent) || pipeline[0];
    }, [externalProgressMessage, currentAgent, pipeline]);

    return (
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-2 transition-colors">
            {/* Header with compact view */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Pipeline
                    </h3>
                    
                    {/* Percentage Display */}
                    {status === 'generating' && (
                        <div className="flex items-center gap-2">
                            <div className="text-lg font-bold text-blue-600">
                                {Math.round(displayProgress)}%
                            </div>
                            {isLoadingHistory && (
                                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                            )}
                        </div>
                    )}
                    
                    {/* Compact Pipeline View */}
                    <div className="hidden sm:flex items-center gap-1">
                        {pipeline.slice(0, 5).map((stage, idx) => {
                            const hasCompleted = isStageComplete(stage, completedSteps);
                            const isActive = status === 'generating' && isStageActive(stage.id, currentAgent);
                            
                            return (
                                <div key={idx} className="flex items-center">
                                    {idx > 0 && (
                                        <div className={`w-3 h-0.5 ${hasCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                    )}
                                    <div className={`
                                        w-2 h-2 rounded-full transition-all
                                        ${isActive ? 'bg-blue-500 ring-2 ring-blue-200' : 
                                          hasCompleted ? 'bg-emerald-400' : 
                                          'bg-gray-200'}
                                    `} />
                                </div>
                            );
                        })}
                        {pipeline.length > 5 && (
                            <span className="text-xs text-gray-400 ml-1">+{pipeline.length - 5}</span>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    {isExpanded ? 'Less' : 'More'}
                </button>
            </div>
            
            {/* Progress Info */}
            {status === 'generating' && (
                <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-gray-500">
                            <Clock size={12} className="text-gray-400" />
                            <span>{formatTime(elapsedTime)}</span>
                        </div>
                        {externalProgressMessage && (
                            <span className="text-blue-600 font-medium truncate max-w-[200px]">
                                {externalProgressMessage}
                            </span>
                        )}
                    </div>
                    {estimatedRemaining !== null && estimatedRemaining > 0 && (
                        <span className="text-gray-400">
                            ~{formatTime(estimatedRemaining)} remaining
                        </span>
                    )}
                </div>
            )}
            
            {/* Progress bar with percentage */}
            <div className="mt-2 relative">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${status === 'complete' ? 100 : displayProgress}%` }}
                    />
                </div>
                {/* Progress markers */}
                <div className="flex justify-between mt-1">
                    {['0%', '25%', '50%', '75%', '100%'].map((mark) => (
                        <span key={mark} className="text-[10px] text-gray-300">{mark}</span>
                    ))}
                </div>
            </div>

            {/* Learning from history indicator */}
            {status === 'generating' && historicalData.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600">
                    <Sparkles className="w-3 h-3" />
                    <span>Learning from {historicalData.reduce((sum, h) => sum + h.sample_count, 0)} past generations</span>
                </div>
            )}
            
            {/* Expanded detailed view */}
            {isExpanded && (
                <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                    {pipeline.map((stage, idx) => {
                        const expectedAgent = STAGE_TO_AGENT[stage.id];
                        const agentLogs = completedSteps.filter(s =>
                            s.agent === stage.id || 
                            s.agent === expectedAgent ||
                            AGENT_TO_STAGE[s.agent || ''] === stage.id
                        );
                        const agentLog = agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : undefined;
                        
                        const hasCompleted = isStageComplete(stage, completedSteps);
                        const isActive = status === 'generating' && isStageActive(stage.id, currentAgent);
                        
                        const isSkipped = status === 'complete' && !hasCompleted && !stage.required;
                        const isPending = !hasCompleted && !isActive && !isSkipped;
                        
                        // Get historical timing for this stage
                        const stageHistory = historicalData.find(h => h.stage_name === stage.id);
                        
                        return (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5">
                                    {isActive ? (
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                    ) : hasCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    ) : isSkipped ? (
                                         <Circle className="w-4 h-4 text-gray-200" /> 
                                    ) : (
                                        <Circle className="w-4 h-4 text-gray-300" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm font-medium ${
                                            isActive ? 'text-blue-700' : 
                                            hasCompleted ? 'text-gray-900' : 
                                            isSkipped ? 'text-gray-400 line-through' :
                                            'text-gray-400'
                                        }`}>
                                            {stage.label}
                                        </p>
                                        {stageHistory && (
                                            <span className="text-[10px] text-gray-400">
                                                avg {formatTime(stageHistory.avg_duration_ms / 1000)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {isActive && (
                                        <p className="text-xs text-blue-500 mt-0.5 animate-pulse">
                                            {externalProgressMessage || 'Processing...'}
                                        </p>
                                    )}
                                    {isPending && (
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Pending...
                                        </p>
                                    )}
                                    {isSkipped && (
                                        <p className="text-xs text-gray-400 mt-0.5 italic">
                                            Not needed
                                        </p>
                                    )}
                                    {hasCompleted && !isActive && agentLog && (
                                        <p className="text-xs text-emerald-600 mt-0.5 truncate">
                                            {agentLog.action || agentLog.message || '✓ Complete'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {status === 'complete' && (
                <div className="mt-2 flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">Generation Complete</span>
                </div>
            )}
        </div>
    );
});
