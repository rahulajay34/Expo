'use client';

import { useGeneration } from '@/hooks/useGeneration';
import { useGenerationStore } from '@/lib/store/generation';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import 'katex/dist/katex.min.css';
// Custom code theme loaded in globals.css
import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import debounce from 'lodash/debounce';
import { FileText, Loader2, Download, RefreshCw, Square, Trash2, Activity, Maximize2, Minimize2, FileDown } from 'lucide-react';
import { GapAnalysisPanel } from '@/components/editor/GapAnalysis';
import { MetricsDashboard } from '@/components/editor/MetricsDashboard';
import { ContentMode } from '@/types/content';
import { GenerationStepper } from '@/components/editor/GenerationStepper';
import { AssignmentWorkspace } from '@/components/editor/AssignmentWorkspace';
import dynamic from 'next/dynamic';
import { useTheme } from '@/components/providers/ThemeProvider';
import { exportToPDF } from '@/lib/exporters/pdf';
import { useAuth } from '@/hooks/useAuth';

// Lazy load Monaco Editor for better initial page load
const Editor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-zinc-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  ),
});

// Memoized Markdown Preview component with HTML support and XSS protection
const MarkdownPreview = memo(function MarkdownPreview({ content }: { content: string }) {
  return (
    <SafeMarkdown math highlight mermaid>
      {content}
    </SafeMarkdown>
  );
});

export default function EditorPage() {
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { 
      topic, subtopics, mode, status, finalContent, formattedContent, error, gapAnalysis, logs,
      setTopic, setSubtopics, setMode, setTranscript: hookSetTranscript, startGeneration, stopGeneration, clearStorage,
      setContent, setFormattedContent,
      currentAgent, currentAction,
      assignmentCounts, setAssignmentCounts,
      estimatedCost
  } = useGeneration();
  
  const [showTranscript, setShowTranscript] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Handle ?view=<generation_id> query parameter to load a saved generation
  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId && session?.access_token) {
      setIsLoadingGeneration(true);
      // Fetch the generation from Supabase
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        fetch(`${supabaseUrl}/rest/v1/generations?id=eq.${viewId}&select=*`, {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
          .then(res => res.json())
          .then(data => {
            if (data && data[0]) {
              const gen = data[0];
              setTopic(gen.topic);
              setSubtopics(gen.subtopics);
              setMode(gen.mode);
              setContent(gen.final_content || '');
              useGenerationStore.getState().setGapAnalysis(gen.gap_analysis || null);
              if (gen.assignment_data?.formatted) {
                setFormattedContent(gen.assignment_data.formatted);
              }
              useGenerationStore.getState().setStatus('complete');
            }
          })
          .catch(err => console.error('Failed to load generation:', err))
          .finally(() => setIsLoadingGeneration(false));
      }
    }
  }, [searchParams, session?.access_token, setTopic, setSubtopics, setMode, setContent, setFormattedContent]);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const text = await file.text();
      hookSetTranscript(text);
      if (!showTranscript) setShowTranscript(true);
  };
  

  
  const handleDownloadMarkdown = () => {
        if (!finalContent || isExporting) return;
        setIsExporting(true);
        try {
          const blob = new Blob([finalContent], { type: 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${topic.replace(/\s+/g, '_')}.md`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } finally {
          setIsExporting(false);
        }
  };

  const handleDownloadPDF = async () => {
    if (!finalContent || isExporting) return;
    setIsExporting(true);
    try {
      await exportToPDF(finalContent, {
        title: topic || 'Educational Content',
        filename: `${topic.replace(/\s+/g, '_')}.pdf`
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Use hook's transcript (from store)
  const { transcript } = useGeneration(); 

  // 1. Add this ref for auto-scrolling (within preview panel only)
  const bottomRef = useRef<HTMLDivElement>(null);

  // Local state for immediate editor updates
  const [localContent, setLocalContent] = useState('');
  
  // Sync local content with store content when generation updates (streaming)
  useEffect(() => {
    if (finalContent !== undefined && finalContent !== null) {
      setLocalContent(finalContent);
    }
  }, [finalContent]);

  // Debounced content update for PREVIEW/STORE to prevent lag
  // Using useMemo + cleanup to prevent memory leaks
  const debouncedSetContent = useMemo(
    () => debounce((value: string) => setContent(value), 300),
    [setContent]
  );
  
  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSetContent.cancel();
    };
  }, [debouncedSetContent]);
  
  // Handler for user typing
  const handleEditorChange = (value: string | undefined) => {
    // Prevent editor changes during generation to avoid conflicts with streaming
    if (status === 'generating') return;
    
    const val = value || '';
    setLocalContent(val); // Immediate update for Editor
    debouncedSetContent(val); // Delayed update for Store/Preview
  };

      // Auto-scroll within preview panel only - NOT the whole page
      // This effect is now disabled to let users scroll freely
      // useEffect(() => {
      //     if (status === 'generating' && bottomRef.current) {
      //         const parent = bottomRef.current.parentElement;
      //         if (parent) {
      //             const { scrollTop, scrollHeight, clientHeight } = parent;
      //             const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      //             if (isNearBottom) {
      //                 bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      //             }
      //         }
      //     }
      // }, [finalContent, status]);



  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full">
      <div className="flex-shrink-0 flex justify-between items-start mb-3 gap-4">
        {/* ... INPUTS ... */}
        <div className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g. Intro to ML)"
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-zinc-400"
                />
                <input 
                    value={subtopics}
                    onChange={(e) => setSubtopics(e.target.value)}
                    placeholder="Subtopics (comma separated)"
                    className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-sm focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:text-zinc-400"
                />
            </div>
            
            <div className="flex gap-3 items-center flex-wrap">
                 <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                    {(['lecture', 'pre-read', 'assignment'] as ContentMode[]).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-all
                                ${mode === m 
                                    ? 'bg-white text-blue-700 shadow-sm border border-zinc-100' 
                                    : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {mode === 'assignment' && (
                  <div className="flex gap-4 items-center w-full animate-in fade-in slide-in-from-top-1 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                      <div className="text-sm font-semibold text-blue-700">Question Counts:</div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-zinc-600">MCSC</label>
                            <input 
                              type="number" 
                              min="0"
                              max="20"
                              value={assignmentCounts?.mcsc ?? 5}
                              onChange={(e) => setAssignmentCounts({...assignmentCounts, mcsc: parseInt(e.target.value) || 0, mcmc: assignmentCounts?.mcmc ?? 3, subjective: assignmentCounts?.subjective ?? 2})}
                              className="w-16 px-3 py-2 text-sm font-bold text-center border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-zinc-900"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-zinc-600">MCMC</label>
                            <input 
                                type="number" 
                                min="0"
                                max="20"
                                value={assignmentCounts?.mcmc ?? 3}
                                onChange={(e) => setAssignmentCounts({...assignmentCounts, mcsc: assignmentCounts?.mcsc ?? 5, mcmc: parseInt(e.target.value) || 0, subjective: assignmentCounts?.subjective ?? 2})}
                                className="w-16 px-3 py-2 text-sm font-bold text-center border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-zinc-900"
                              />
                          </div>
                          <div className="flex items-center gap-2">
                              <label className="text-xs font-medium text-zinc-600">Subjective</label>
                              <input 
                                type="number" 
                                min="0"
                                max="20"
                                value={assignmentCounts?.subjective ?? 2}
                                onChange={(e) => setAssignmentCounts({...assignmentCounts, mcsc: assignmentCounts?.mcsc ?? 5, mcmc: assignmentCounts?.mcmc ?? 3, subjective: parseInt(e.target.value) || 0})}
                                className="w-16 px-3 py-2 text-sm font-bold text-center border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-zinc-900"
                              />
                          </div>
                      </div>
                  </div>
                )}

                 <button 
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                        ${showTranscript || transcript
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                 >
                    <FileText size={14} />
                    {transcript ? 'Transcript Added' : 'Add Transcript'}
                 </button>
                 
                 <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer text-gray-600 transition-colors">
                    Upload .txt
                    <input type="file" accept=".txt,.md" onChange={handleFileUpload} className="hidden" />
                 </label>
                 
                 <button 
                    onClick={handleDownloadMarkdown}
                    disabled={!finalContent || isExporting}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-100 transition-colors ml-auto"
                 >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    .md
                 </button>
                 <button 
                    onClick={handleDownloadPDF}
                    disabled={!finalContent || isExporting}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100 transition-colors"
                 >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                    PDF
                 </button>
            </div>
        </div>
        
        {/* ... GENERATE & ACTIONS ... */}
        <div className="flex gap-2 items-center">
           {status !== 'idle' && (
              <button
                  onClick={clearStorage}
                  title="Clear Storage & Reset"
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                  <Trash2 size={20} />
              </button>
           )}
           
           <button 
              onClick={() => setShowMetrics(true)}
              className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="Performance Metrics"
           >
              <Activity size={20} />
           </button>
           {showMetrics && <MetricsDashboard onClose={() => setShowMetrics(false)} />}

           {status === 'generating' ? (
                <button 
                onClick={stopGeneration}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Square size={16} fill="currentColor" />
                Stop
              </button>
           ) : (
                <button 
                  onClick={startGeneration}
                  disabled={!topic}
                  className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2
                      ${!topic
                          ? 'bg-gray-300 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 hover:scale-[1.02]'}`
                  }
                >
                  <RefreshCw size={16} />
                  Generate
                </button>
           )}
           
           {/* Cost Badge - Show after completion */}
           {status === 'complete' && estimatedCost !== undefined && estimatedCost > 0 && (
               <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                   <span className="font-medium">Cost:</span>
                   <span className="font-bold">${estimatedCost.toFixed(4)}</span>
               </div>
           )}
        </div>
      </div>

      {(showTranscript || transcript) && (
          <div className="flex-shrink-0 mb-3 animate-in fade-in slide-in-from-top-2">
              <textarea
                  value={transcript}
                  onChange={(e) => hookSetTranscript(e.target.value)}
                  placeholder="Paste lecture transcript here for analysis and context..."
                  className="w-full h-24 p-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-mono focus:ring-2 focus:ring-indigo-100 focus:bg-white outline-none resize-y transition-all"
              />
          </div>
      )}

      {/* GRANULAR STATUS BAR (Visible when generating) */}
      {status === 'generating' && (() => {
          const currentStep = logs.filter(l => l.type === 'step').pop();
          return currentStep ? (
            <div className="flex-shrink-0 mb-4 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3 animate-in fade-in">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="font-bold text-blue-800">{currentStep.agent || 'System'}:</span>
                <span className="text-blue-600 text-sm">{currentStep.message}</span>
            </div>
          ) : null;
      })()}

      {/* Progress Stepper & Logs */}
      {status !== 'idle' && (
          <div className="flex-shrink-0">
            <GenerationStepper 
              logs={logs || []} 
              status={status} 
              mode={mode}
              hasTranscript={!!transcript}
            />
          </div>
      )}

      {gapAnalysis && (
        <div className="flex-shrink-0">
            <GapAnalysisPanel analysis={gapAnalysis} />
        </div>
      )}

      {/* MISMATCH STOP - User Decision Required */}
      {status === 'mismatch' && (
          <div className="flex-shrink-0 mb-4 p-5 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">⚠️</span>
                  </div>
                  <div>
                      <h3 className="font-semibold text-amber-800 text-sm mb-1">Transcript Mismatch Detected</h3>
                      <p className="text-amber-700 text-sm">
                          The transcript appears unrelated to your topic/subtopics. None of the subtopics were found in the transcript.
                      </p>
                  </div>
              </div>
              <div className="flex gap-3 ml-13">
                  <button 
                      onClick={() => {
                          // Clear transcript and regenerate
                          hookSetTranscript('');
                          startGeneration();
                      }}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                      Generate Without Transcript
                  </button>
                  <button 
                      onClick={() => {
                          // Reset to idle so user can fix inputs, and clear error
                          useGenerationStore.getState().setStatus('idle');
                          useGenerationStore.getState().addLog('Ready to retry with updated inputs', 'info');
                      }}
                      className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                      Fix Topic/Transcript
                  </button>
              </div>
          </div>
      )}

      {error && status !== 'mismatch' && (
          <div className="flex-shrink-0 mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Error: {error}
          </div>
      )}

      {/* MAIN CONTENT AREA */}
      {mode === 'assignment' ? (
        // --- ASSIGNMENT WORKSPACE (Full Screen) ---
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col transition-colors">
            {formattedContent ? (
                <AssignmentWorkspace 
                    jsonContent={formattedContent} 
                    onUpdate={setFormattedContent} 
                />
            ) : status === 'generating' ? (
                // Loading State specific to Assignment
                <div className="h-full flex flex-col items-center justify-center space-y-4 p-8">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium animate-pulse">Creating your assignment...</p>
                    <p className="text-xs text-gray-400">Current Step: {currentAction || 'Initializing'}</p>
                </div>
            ) : (
                // Idle / Empty State
                <div className="h-full flex flex-col items-center justify-center space-y-4 text-center p-8">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-2">
                        <FileText className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="max-w-md space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">Ready to Create Assignment</h3>
                        <p className="text-sm text-gray-500">
                            Enter a topic and optional subtopics above, then click "Generate" to create a comprehensive assignment with multiple choice and subjective questions.
                        </p>
                    </div>
                </div>
            )}
        </div>
      ) : (
          /* For lecture/pre-read mode: Show editor and preview panels */
          <div className={`grid gap-6 h-[800px] max-h-[calc(100vh-16rem)] transition-all duration-300 ${isFullScreen ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div className={`bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden relative transition-all duration-500 ${
              isFullScreen ? 'hidden' : ''
            } ${
              currentAgent === 'Sanitizer' ? 'border-teal-300 ring-4 ring-teal-50/50 shadow-teal-100' :
              currentAgent === 'Reviewer' ? 'border-amber-300 ring-4 ring-amber-50/50 shadow-amber-100' :
              currentAgent === 'Refiner' ? 'border-purple-300 ring-4 ring-purple-50/50 shadow-purple-100' :
              'border-zinc-200'
            }`}>
              <div className="flex-shrink-0 px-4 py-2 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                    Editor (Markdown)
                </span>
                {/* Live Agent Status Indicators */}
                {status === 'generating' && currentAgent === 'Sanitizer' && (
                  <span className="text-xs font-bold text-teal-600 animate-pulse flex items-center gap-1">
                    🛡️ Verifying Facts...
                  </span>
                )}
                {status === 'generating' && currentAgent === 'Reviewer' && (
                  <span className="text-xs font-bold text-amber-600 animate-pulse flex items-center gap-1">
                    ⚖️ Assesing Quality...
                  </span>
                )}
                {status === 'generating' && currentAgent === 'Refiner' && (
                  <span className="text-xs font-bold text-purple-600 animate-pulse flex items-center gap-1">
                    ✨ Polishing...
                  </span>
                )}
                <button 
                    onClick={handleDownloadMarkdown}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Save .md
                </button>
              </div>
              <div className="flex-1 overflow-y-auto relative p-0 group">
                 <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    value={localContent}
                    onChange={handleEditorChange}
                    theme="light"
                    loading={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        padding: { top: 24, bottom: 24 },
                        lineNumbers: 'off',
                        renderLineHighlight: 'none',
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
                    }}
                 />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col overflow-hidden">
              <div className="flex-shrink-0 px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    Preview
                </span>
                <button
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="p-1 text-zinc-400 hover:text-indigo-600 rounded transition-colors"
                    title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                >
                    {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
               <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/30">
                 {finalContent ? (
                     <article className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-a:text-blue-600 prose-img:rounded-xl prose-pre:bg-[#fafafa] prose-pre:text-zinc-800">
                        <MarkdownPreview content={finalContent} />
                        <div ref={bottomRef} /> {/* Auto-scroll anchor */}
                     </article>
                  ) : (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                        <FileText size={32} className="mb-2 opacity-50" />
                        <p className="text-sm italic">Preview will appear here...</p>
                     </div>
                 )}
              </div>
            </div>
          </div>
      )}
    </div>
  );
}
