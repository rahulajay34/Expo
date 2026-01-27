import { memo } from 'react';
import { GapAnalysisResult } from "@/types/content";
import { CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";

export const GapAnalysisPanel = memo(function GapAnalysisPanel({ analysis }: { analysis: GapAnalysisResult | null }) {
  if (!analysis) return null;
  
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white mb-4 shadow-sm transition-colors">
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
  );
});

