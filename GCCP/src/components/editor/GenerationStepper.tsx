'use client';
import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface Log {
    type: string;
    message?: string;
    action?: string;
    agent?: string;
    content?: any;
    timestamp?: number;
}

interface StepperProps {
    logs: Log[];
    status: 'idle' | 'generating' | 'complete' | 'error' | 'mismatch';
    mode?: string;
    hasTranscript?: boolean;
}

// Average durations per agent (in seconds) - based on typical usage
const AVERAGE_STAGE_TIMES: Record<string, number> = {
    CourseDetector: 4,
    Analyzer: 4,
    Creator: 60,
    Sanitizer: 10,
    Reviewer: 10,
    Refiner: 10,
    Formatter: 30,
};

// Define the full agent pipeline
const getAgentPipeline = (mode: string = 'lecture', hasTranscript: boolean = false) => {
    const pipeline = [
        { id: 'CourseDetector', label: 'Context', required: true }, // Always runs first
        hasTranscript ? { id: 'Analyzer', label: 'Analysis', required: true } : null,
        { id: 'Creator', label: 'Draft', required: true },
        hasTranscript ? { id: 'Sanitizer', label: 'Fact-Check', required: true } : null,
        { id: 'Reviewer', label: 'Review', required: true },
        { id: 'Refiner', label: 'Polish', required: false }, // Conditional
        mode === 'assignment' ? { id: 'Formatter', label: 'Format', required: true } : null
    ].filter(Boolean) as Array<{ id: string; label: string; required: boolean }>;
    
    return pipeline;
};

// Format seconds to readable time
const formatTime = (seconds: number): string => {
    if (seconds < 60) return `~${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `~${mins}m ${secs}s`;
};

export const GenerationStepper = memo(function GenerationStepper({ logs, status, mode = 'lecture', hasTranscript = false }: StepperProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    
    // Start timer when generation begins
    useEffect(() => {
        if (status === 'generating' && !startTimeRef.current) {
            startTimeRef.current = Date.now();
        }
        if (status !== 'generating') {
            startTimeRef.current = null;
        }
    }, [status]);
    
    // Update elapsed time every second for snappier feedback
    useEffect(() => {
        if (status !== 'generating') return;
        
        const interval = setInterval(() => {
            if (startTimeRef.current) {
                setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
        }, 1000); // Back to 1s for responsive time display
        
        return () => clearInterval(interval);
    }, [status]);
    
    // Filter out only relevant steps to show in the UI
    const completedSteps = logs.filter(l => l.type === 'step');
    const pipeline = getAgentPipeline(mode, hasTranscript);
    
    // Find current active agent from logs
    const currentAgent = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1].agent : null;
    
    // Calculate progress
    const completedCount = pipeline.filter(stage => 
        completedSteps.some(s => s.agent === stage.id)
    ).length;
    const progressPercent = pipeline.length > 0 ? (completedCount / pipeline.length) * 100 : 0;
    
    // Estimate remaining time
    const remainingStages = pipeline.filter(stage => 
        !completedSteps.some(s => s.agent === stage.id)
    );
    const estimatedRemaining = remainingStages.reduce((sum, stage) => 
        sum + (AVERAGE_STAGE_TIMES[stage.id] || 5), 0
    );

    return (
        <div className="mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm animate-fade-in-fast transition-all duration-150">
            {/* Header with compact view */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Pipeline
                    </h3>
                    {/* Compact View - GPU accelerated */}
                    <div className="flex items-center gap-2 transform-gpu">
                        {pipeline.map((stage, idx) => {
                            const hasCompleted = completedSteps.some(s => s.agent === stage.id);
                            const isActive = status === 'generating' && currentAgent === stage.id;
                            
                            return (
                                <div key={idx} className="flex items-center gap-1">
                                    {idx > 0 && (
                                        <div className={`w-6 h-0.5 ${hasCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                                    )}
                                    <div className={`
                                        flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all
                                        ${isActive ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200' : 
                                          hasCompleted ? 'bg-emerald-50 text-emerald-700' : 
                                          'bg-gray-100 text-gray-400'}
                                    `}>
                                        {isActive ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : hasCompleted ? (
                                            <CheckCircle2 className="w-3 h-3" />
                                        ) : (
                                            <Circle className="w-3 h-3" />
                                        )}
                                        <span className="hidden sm:inline">{stage.id}</span>
                                    </div>
                                </div>
                            );
                        })}
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
            
            {/* Time Estimation */}
            {status === 'generating' && (
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-gray-400" />
                        <span>Elapsed: {formatTime(elapsedTime)}</span>
                    </div>
                    {estimatedRemaining > 0 && (
                        <span className="text-blue-600 font-medium">
                            ~{formatTime(estimatedRemaining)} remaining
                        </span>
                    )}
                </div>
            )}
            
            {/* Progress bar */}
            <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${status === 'complete' ? 100 : progressPercent}%` }}
                />
            </div>
            
            {/* Expanded detailed view */}
            {isExpanded && (
                <div className="space-y-3 mt-3 pt-3 border-t border-gray-100">
                    {pipeline.map((stage, idx) => {
                        // Find the specific log entry for this agent to get the real action message
                        // We filter for ALL logs for this agent and take the LAST one to show current state/conclusion
                        const agentLogs = completedSteps.filter(s => s.agent === stage.id);
                        const agentLog = agentLogs.length > 0 ? agentLogs[agentLogs.length - 1] : undefined;
                        
                        const hasCompleted = agentLogs.length > 0;
                        const isActive = status === 'generating' && currentAgent === stage.id;
                        
                        // If pipeline is complete but this step (which is optional) didn't run, it's skipped
                        const isSkipped = status === 'complete' && !hasCompleted && !stage.required;
                        const isPending = !hasCompleted && !isActive && !isSkipped;
                        
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
                                <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                        isActive ? 'text-blue-700 dark:text-blue-400' : 
                                        hasCompleted ? 'text-gray-900 dark:text-gray-900' : 
                                        isSkipped ? 'text-gray-400 line-through' :
                                        'text-gray-400 dark:text-gray-600'
                                    }`}>
                                        {stage.id}: {stage.label}
                                    </p>
                                    
                                    {/* Sub-label showing specific action or state */}
                                    {isActive && (
                                        <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 animate-pulse">
                                            Processing...
                                        </p>
                                    )}
                                    {isPending && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            Pending...
                                        </p>
                                    )}
                                    {isSkipped && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 italic">
                                            Not needed
                                        </p>
                                    )}
                                    {hasCompleted && !isActive && (
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                            {/* Show the actual message from the agent if available, else generic complete */}
                                            {agentLog?.action || agentLog?.message || '✓ Complete'}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {status === 'complete' && (
                <div className="mt-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wide">All Agents Complete</span>
                </div>
            )}
        </div>
    );
});

