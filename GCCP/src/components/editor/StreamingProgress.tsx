'use client';

import { memo, useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react';

interface StreamingProgressProps {
  progress: { percent: number; message: string };
  status: 'idle' | 'generating' | 'complete' | 'error' | 'mismatch';
  currentAgent?: string | null;
  currentAction?: string | null;
  startTime?: number;
}

export const StreamingProgress = memo(function StreamingProgress({
  progress,
  status,
  currentAgent,
  currentAction,
  startTime,
}: StreamingProgressProps) {
  const [elapsed, setElapsed] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (status !== 'generating' || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startTime]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAgentEmoji = (agent: string) => {
    const lowerAgent = agent.toLowerCase();
    if (lowerAgent.includes('detector') || lowerAgent.includes('detection')) return '🔍';
    if (lowerAgent.includes('analyzer') || lowerAgent.includes('analysis')) return '📊';
    if (lowerAgent.includes('creator') || lowerAgent.includes('creation')) return '✍️';
    if (lowerAgent.includes('sanitizer')) return '🛡️';
    if (lowerAgent.includes('reviewer') || lowerAgent.includes('review')) return '⚖️';
    if (lowerAgent.includes('refiner') || lowerAgent.includes('polish')) return '✨';
    if (lowerAgent.includes('formatter') || lowerAgent.includes('format')) return '📝';
    return '🤖';
  };

  const getStatusColor = () => {
    if (status === 'generating') return 'blue';
    if (status === 'complete') return 'green';
    if (status === 'error') return 'red';
    return 'gray';
  };

  const color = getStatusColor();

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border-2 
      ${color === 'blue' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50' : ''}
      ${color === 'green' ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' : ''}
      ${color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 to-pink-50' : ''}
      shadow-lg p-6 space-y-4
    `}>
      {/* Animated Background */}
      {status === 'generating' && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse" />
        </div>
      )}

      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'generating' && (
              <div className="relative">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <Zap className="w-4 h-4 text-yellow-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            )}
            {status === 'complete' && <CheckCircle2 className="w-8 h-8 text-green-600" />}
            {status === 'error' && <XCircle className="w-8 h-8 text-red-600" />}
            
            <div>
              <h3 className={`text-lg font-bold ${color === 'blue' ? 'text-blue-900' : color === 'green' ? 'text-green-900' : 'text-red-900'}`}>
                {status === 'generating' && 'Generating Content'}
                {status === 'complete' && 'Generation Complete'}
                {status === 'error' && 'Generation Failed'}
              </h3>
              {status === 'generating' && startTime && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{formatTime(elapsed)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Percentage */}
          <div className={`
            text-3xl font-black tabular-nums
            ${color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-green-700' : 'text-red-700'}
          `}>
            {Math.round(progress.percent)}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="h-4 bg-white/60 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`
                h-full transition-all duration-500 ease-out relative overflow-hidden
                ${color === 'blue' ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500' : ''}
                ${color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : ''}
                ${color === 'red' ? 'bg-gradient-to-r from-red-500 to-pink-500' : ''}
              `}
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            >
              {status === 'generating' && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="absolute -top-1 left-0 right-0 flex justify-between px-1">
            {[0, 25, 50, 75, 100].map((milestone) => (
              <div
                key={milestone}
                className={`w-1.5 h-6 rounded-full transition-colors ${
                  progress.percent >= milestone 
                    ? color === 'blue' ? 'bg-blue-600' : color === 'green' ? 'bg-green-600' : 'bg-red-600'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Current Agent & Action */}
        {status === 'generating' && currentAgent && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/80 rounded-xl border border-blue-100 shadow-sm">
              <span className="text-2xl animate-bounce">{getAgentEmoji(currentAgent)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Current Agent</div>
                <div className="text-sm font-bold text-blue-900 truncate">{currentAgent}</div>
              </div>
            </div>
            
            {currentAction && (
              <div className="px-4 py-2 bg-blue-100/50 rounded-lg border border-blue-100">
                <div className="text-xs text-blue-700 font-medium line-clamp-2">{currentAction}</div>
              </div>
            )}
          </div>
        )}

        {/* Status Message */}
        {progress.message && (
          <div className={`
            text-sm font-medium text-center p-3 rounded-lg
            ${color === 'blue' ? 'bg-blue-100/50 text-blue-700' : ''}
            ${color === 'green' ? 'bg-green-100/50 text-green-700' : ''}
            ${color === 'red' ? 'bg-red-100/50 text-red-700' : ''}
          `}>
            {progress.message}
          </div>
        )}
      </div>

      {/* Custom CSS for shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
});
