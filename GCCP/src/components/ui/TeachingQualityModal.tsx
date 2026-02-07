import React from 'react';
import { X, GraduationCap, CheckCircle2, AlertCircle, BarChart3, ArrowUpRight, Sparkles } from 'lucide-react';

interface TeachingQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: any; // Using any for flexibility with JSONB, but structure is known
  topic: string;
}

export function TeachingQualityModal({ isOpen, onClose, analysis, topic }: TeachingQualityModalProps) {
  if (!isOpen || !analysis) return null;

  const { overallScore, summary, dimensions, strengths, improvements } = analysis;

  // Determine color theme based on score
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    if (score >= 6) return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    return 'text-red-400 border-red-500/30 bg-red-500/10';
  };

  const scoreColorClass = getScoreColor(overallScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${scoreColorClass}`}>
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Teaching Quality Analysis</h2>
              <p className="text-sm text-gray-400 truncate max-w-md">{topic}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          {/* Top Section: Score & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Score Card */}
            <div className={`col-span-1 rounded-xl border p-5 flex flex-col items-center justify-center text-center ${scoreColorClass.replace('text-', 'border-').split(' ')[1]} bg-gray-800/50`}>
              <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Overall Score</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-bold ${scoreColorClass.split(' ')[0]}`}>{overallScore}</span>
                <span className="text-xl text-gray-500">/10</span>
              </div>
              <div className="mt-3 flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full ${i < Math.round(overallScore) ? scoreColorClass.split(' ')[0].replace('text-', 'bg-') : 'bg-gray-700'}`}
                  />
                ))}
              </div>
            </div>

            {/* Assessment Summary */}
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                <ArrowUpRight size={16} className="text-blue-400" />
                Pedagogical Assessment
              </h3>
              <p className="text-gray-300 leading-relaxed text-sm bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                "{summary || "No pedagogical summary available for this analysis."}"
              </p>
            </div>
          </div>

          {/* Detailed Dimensions Breakdown */}
          {(analysis.breakdown && analysis.breakdown.length > 0) ? (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400" />
                Detailed Performance Analysis
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {analysis.breakdown.map((item: any, idx: number) => {
                  const score = Number(item.score);
                  const isHigh = score >= 8;
                  const isMed = score >= 6 && score < 8;
                  const colorClass = isHigh ? 'emerald' : isMed ? 'amber' : 'red';
                  
                  return (
                    <div key={idx} className="bg-gray-800/40 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600 transition-colors">
                      {/* Header */}
                      <div className="px-4 py-3 flex items-center justify-between bg-gray-800/50 border-b border-gray-700/30">
                        <span className="font-medium text-gray-200 text-sm">{item.criterion}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full bg-${colorClass}-500`}
                              style={{ width: `${score * 10}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold text-${colorClass}-400 w-8 text-right`}>
                            {score}/10
                          </span>
                        </div>
                      </div>
                      
                      {/* Body */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-gray-900/40">
                        <div>
                          <span className="text-gray-500 uppercase tracking-wider font-semibold block mb-1.5 text-[10px]">Evidence</span>
                          <p className="text-gray-300 leading-relaxed">"{item.evidence || "No specific evidence cited."}"</p>
                        </div>
                        {item.suggestion && (
                          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/30">
                            <span className="text-amber-400/80 uppercase tracking-wider font-semibold block mb-1 text-[10px] flex items-center gap-1">
                              <Sparkles size={10} /> Suggestion
                            </span>
                            <p className="text-gray-400 leading-relaxed">{item.suggestion}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : dimensions && (
            // Fallback for legacy data without breakdown
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400" />
                Performance on Key Dimensions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(dimensions).map(([key, value]: [string, any]) => (
                  <div key={key} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-gray-400 capitalize group-hover:text-gray-200 transition-colors">{key}</span>
                      <span className={`text-sm font-medium ${Number(value) >= 8 ? 'text-emerald-400' : Number(value) >= 6 ? 'text-amber-400' : 'text-red-400'}`}>
                        {value}/10
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${Number(value) >= 8 ? 'bg-emerald-500' : Number(value) >= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Number(value) * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            {strengths?.length > 0 && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {strengths.map((str: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                      {str}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {improvements?.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Areas for Improvement
                </h3>
                <ul className="space-y-2">
                  {improvements.map((imp: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      {imp}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors border border-gray-700"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
