import { memo, useState } from 'react';
import { GapAnalysisResult, InstructorQualityResult } from "@/types/content";
import { CheckCircle, XCircle, AlertCircle, FileText, Award, ChevronDown, ChevronUp, TrendingUp, MessageCircle, Lightbulb } from "lucide-react";

interface GapAnalysisPanelProps {
  analysis: GapAnalysisResult | null;
  instructorQuality?: InstructorQualityResult | null;
}

export const GapAnalysisPanel = memo(function GapAnalysisPanel({ analysis, instructorQuality }: GapAnalysisPanelProps) {
  if (!analysis && !instructorQuality) return null;
  
  return (
    <div className="space-y-4 mb-4 animate-fade-in-fast">
      {/* Instructor Quality Panel */}
      {instructorQuality && (
        <InstructorQualityPanel quality={instructorQuality} />
      )}
      
      {/* Gap Analysis Panel */}
      {analysis && (
        <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm transition-all duration-150 transform-gpu">
          <h3 className="font-semibold mb-3 text-gray-900 flex items-center gap-2">
            <span>Transcript Coverage Analysis</span>
            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
               {new Date(analysis.timestamp).toLocaleTimeString()}
            </span>
          </h3>
          
          {/* 2-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT: Coverage Status */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subtopic Coverage</h4>
              
              {analysis.covered.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-green-700">Covered: </span>
                    <span className="text-green-600">{analysis.covered.join(', ')}</span>
                  </div>
                </div>
              )}
              
              {analysis.partiallyCovered.length > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-yellow-700">Partial: </span>
                    <span className="text-yellow-600">{analysis.partiallyCovered.join(', ')}</span>
                  </div>
                </div>
              )}

              {analysis.notCovered.length > 0 && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                  <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-bold text-red-700">Not Covered: </span>
                    <span className="text-red-600">{analysis.notCovered.join(', ')}</span>
                  </div>
                </div>
              )}
              
              {analysis.covered.length === 0 && analysis.partiallyCovered.length === 0 && analysis.notCovered.length === 0 && (
                   <p className="text-sm text-gray-500 italic">No coverage data available.</p>
              )}
            </div>
            
            {/* RIGHT: Topics in Transcript */}
            <div className="border-l border-gray-100 pl-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText size={12} />
                Topics in Transcript
              </h4>
              
              {analysis.transcriptTopics && analysis.transcriptTopics.length > 0 ? (
                <ul className="text-sm text-gray-700 space-y-1">
                  {analysis.transcriptTopics.map((topic, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-gray-400">•</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 italic">No topics extracted yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Instructor Quality Panel Component
const InstructorQualityPanel = memo(function InstructorQualityPanel({ quality }: { quality: InstructorQualityResult }) {
  const [expanded, setExpanded] = useState(false);
  
  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 8) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500' };
    if (score >= 6) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500' };
    if (score >= 4) return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' };
  };
  
  const scoreColors = getScoreColor(quality.overallScore);
  
  return (
    <div className="border border-purple-200 rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 to-white shadow-sm">
      {/* Header - Always Visible */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-purple-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreColors.bg} ring-2 ${scoreColors.ring}`}>
            <span className={`text-lg font-bold ${scoreColors.text}`}>
              {quality.overallScore.toFixed(1)}
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award size={16} className="text-purple-600" />
              Instructor Teaching Quality
            </h3>
            <p className="text-xs text-gray-500">
              {quality.breakdown?.length || 0} criteria evaluated • {new Date(quality.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronUp size={20} className="text-gray-400" />
          ) : (
            <ChevronDown size={20} className="text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Expandable Content */}
      {expanded && (
        <div className="p-4 pt-0 border-t border-purple-100 animate-fade-in-fast">
          {/* Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Strengths */}
            {quality.strengths && quality.strengths.length > 0 && (
              <div className="bg-green-50 rounded-lg p-3">
                <h4 className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Strengths
                </h4>
                <ul className="text-sm text-green-800 space-y-1">
                  {quality.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-green-500">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Improvement Areas */}
            {quality.improvementAreas && quality.improvementAreas.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-3">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Lightbulb size={12} />
                  Areas to Improve
                </h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  {quality.improvementAreas.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          {/* Learning Continuity */}
          {quality.continuityAnalysis && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <MessageCircle size={12} />
                Learning Continuity
              </h4>
              <div className="flex gap-4 text-sm mb-2">
                <span className={quality.continuityAnalysis.previousSessionRef ? 'text-green-600' : 'text-gray-400'}>
                  {quality.continuityAnalysis.previousSessionRef ? '✓' : '✗'} References Previous Session
                </span>
                <span className={quality.continuityAnalysis.nextSessionPreview ? 'text-green-600' : 'text-gray-400'}>
                  {quality.continuityAnalysis.nextSessionPreview ? '✓' : '✗'} Previews Next Session
                </span>
              </div>
              {quality.continuityAnalysis.details && (
                <p className="text-xs text-blue-700 italic">{quality.continuityAnalysis.details}</p>
              )}
            </div>
          )}
          
          {/* Detailed Breakdown */}
          {quality.breakdown && quality.breakdown.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Detailed Breakdown</h4>
              <div className="space-y-2">
                {quality.breakdown.map((item, i) => (
                  <CriterionRow key={i} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// Individual Criterion Row
const CriterionRow = memo(function CriterionRow({ item }: { item: { criterion: string; score: number; weight: number; evidence: string; suggestion?: string } }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getBarColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">{item.criterion}</span>
            <span className="text-sm font-bold text-gray-700">{item.score}/10</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getBarColor(item.score)} transition-all duration-500`}
              style={{ width: `${item.score * 10}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-gray-400">{item.weight}%</span>
      </button>
      
      {showDetails && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in-fast">
          <div className="text-xs bg-gray-50 p-2 rounded border-l-2 border-purple-400">
            <span className="font-medium text-gray-600">Evidence: </span>
            <span className="text-gray-700 italic">"{item.evidence}"</span>
          </div>
          {item.suggestion && (
            <div className="text-xs bg-amber-50 p-2 rounded border-l-2 border-amber-400">
              <span className="font-medium text-amber-700">Suggestion: </span>
              <span className="text-amber-800">{item.suggestion}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
