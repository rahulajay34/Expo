'use client';

import { memo } from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { GenerationLog } from '@/types/database';

interface LiveActivityFeedProps {
  logs: GenerationLog[];
  status: 'idle' | 'generating' | 'complete' | 'error' | 'mismatch';
  progress: { percent: number; message: string };
  currentAgent?: string | null;
}

export const LiveActivityFeed = memo(function LiveActivityFeed({
  logs,
  status,
  progress,
  currentAgent,
}: LiveActivityFeedProps) {
  // Group logs by agent
  const stepLogs = logs.filter(l => l.log_type === 'step');
  const latestStepLog = stepLogs[stepLogs.length - 1];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-4 space-y-3">
      {/* Header with Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-700 flex items-center gap-2">
            {status === 'generating' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            {status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
            Live Activity
          </h3>
          <span className="text-xs font-bold text-blue-600">{Math.round(progress.percent)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        
        {/* Current Status Message */}
        <p className="text-xs text-zinc-600">
          {progress.message || 'Waiting...'}
        </p>
      </div>

      {/* Live Agent Status */}
      {status === 'generating' && currentAgent && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg animate-pulse">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-blue-700">
            {currentAgent}
          </span>
          <span className="text-xs text-blue-600 ml-auto">
            {latestStepLog?.message || 'Working...'}
          </span>
        </div>
      )}

      {/* Activity Stream - Last 10 logs */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {stepLogs.slice(-10).map((stepLog, idx) => {
          const isLatest = idx === stepLogs.slice(-10).length - 1;
          const isActive = isLatest && status === 'generating';
          
          return (
            <div 
              key={stepLog.id || idx}
              className={`flex items-start gap-2 p-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-50 border border-blue-200' 
                  : 'bg-zinc-50 border border-transparent'
              }`}
            >
              {isActive ? (
                <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${
                    isActive ? 'text-blue-700' : 'text-zinc-700'
                  }`}>
                    {stepLog.agent_name}
                  </span>
                  {stepLog.created_at && (
                    <span className="text-[10px] text-zinc-400">
                      {new Date(stepLog.created_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${
                  isActive ? 'text-blue-600' : 'text-zinc-500'
                } truncate`}>
                  {stepLog.message}
                </p>
              </div>
            </div>
          );
        })}
        
        {stepLogs.length === 0 && status === 'generating' && (
          <div className="flex items-center gap-2 p-3 text-center justify-center text-zinc-400">
            <Circle className="w-3 h-3 animate-pulse" />
            <span className="text-xs">Initializing pipeline...</span>
          </div>
        )}
      </div>

      {/* Completion Message */}
      {status === 'complete' && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <span className="text-xs font-semibold text-green-700">
            Generation completed successfully!
          </span>
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-xs font-semibold text-red-700">
            Generation failed
          </span>
        </div>
      )}
    </div>
  );
});
