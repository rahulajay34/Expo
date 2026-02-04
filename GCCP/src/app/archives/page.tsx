'use client';

import { useEffect, useState, useCallback } from 'react';
import { Generation } from '@/types/database';
import { useGenerationStore } from '@/lib/store/generation';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Trash2, Calendar, Cloud, CloudOff, RefreshCw, Loader2, DollarSign, CheckCircle2, Clock, AlertCircle, Zap, Eye, PenTool, Sparkles, FileCheck, ClipboardList, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Stage configuration for progress display
const GENERATION_STAGES = [
  { key: 'queued', label: 'Queued', icon: Clock, color: 'gray' },
  { key: 'processing', label: 'Starting', icon: Zap, color: 'blue' },
  { key: 'drafting', label: 'Drafting', icon: PenTool, color: 'indigo' },
  { key: 'critiquing', label: 'Reviewing', icon: Eye, color: 'amber' },
  { key: 'refining', label: 'Refining', icon: Sparkles, color: 'purple' },
  { key: 'formatting', label: 'Formatting', icon: FileCheck, color: 'teal' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'green' },
  { key: 'failed', label: 'Failed', icon: AlertCircle, color: 'red' },
];

// Get current stage index (for progress bar)
const getStageIndex = (status: string): number => {
  const index = GENERATION_STAGES.findIndex(s => s.key === status);
  return index >= 0 ? index : 0;
};

// Progress indicator component
function StageProgress({ status, currentStep }: { status: string; currentStep?: number }) {
  const stageIndex = getStageIndex(status);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isInProgress = !isCompleted && !isFailed;
  
  // Get readable stages (exclude queued for visual clarity)
  const visibleStages = GENERATION_STAGES.filter(s => s.key !== 'queued' && s.key !== 'failed');
  const currentVisibleIndex = visibleStages.findIndex(s => s.key === status);
  
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {visibleStages.map((stage, idx) => {
          const StageIcon = stage.icon;
          const isPast = idx < currentVisibleIndex || isCompleted;
          const isCurrent = stage.key === status;
          const isFutureOrFailed = idx > currentVisibleIndex && !isCompleted;
          
          return (
            <div key={stage.key} className="flex items-center">
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
                  ${isPast ? 'bg-green-100 text-green-700' :
                    isCurrent && isInProgress ? 'bg-blue-100 text-blue-700 animate-pulse' :
                    isCurrent && isCompleted ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-400'
                  }`}
                title={stage.label}
              >
                <StageIcon size={12} className={isCurrent && isInProgress ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{stage.label}</span>
              </div>
              {idx < visibleStages.length - 1 && (
                <div className={`w-4 h-0.5 mx-0.5 ${isPast ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Current action text for in-progress items */}
      {isInProgress && status !== 'queued' && (
        <p className="text-xs text-blue-600 mt-2 animate-pulse">
          Currently {status}... This may take a few minutes.
        </p>
      )}
      
      {/* Failed status message */}
      {isFailed && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <AlertCircle size={12} />
          Generation failed. You can try again from the editor.
        </p>
      )}
    </div>
  );
}

export default function ArchivesPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);  const [showGapAnalysis, setShowGapAnalysis] = useState<string | null>(null);  const router = useRouter();
  const { user, session } = useAuth();
  const { setTopic, setSubtopics, setMode, setTranscript, setContent, setGapAnalysis } = useGenerationStore();

  // Auto-refresh when there are in-progress jobs
  const hasInProgressJobs = generations.some(g => !['completed', 'failed'].includes(g.status));
  
  // Count failed jobs that can be retried
  const failedJobs = generations.filter(g => g.status === 'failed');

  // Retry failed generations
  const handleRetryStuck = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/process-stuck', { method: 'POST' });
      const data = await response.json();
      console.log('[Archives] Retry failed result:', data);
      // Refresh the list
      setTimeout(loadGenerations, 1000);
    } catch (error) {
      console.error('[Archives] Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const loadGenerations = useCallback(async () => {
    if (!session?.access_token || !user?.id) {
      console.warn('[Archives] No access token or user ID available');
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('[Archives] Loading generations for user:', user?.id);
      
      // Use direct REST API with user_id filter to ensure users only see their own generations
      // Admins will see all due to RLS policies, but for safety we filter by user_id for regular users
      const url = `${supabaseUrl}/rest/v1/generations?select=*&user_id=eq.${user.id}&order=created_at.desc`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Archives] Failed to load generations:", response.status, errorText);
        
        // Check if it's a database/table error
        if (response.status === 404 || errorText.includes('relation') || errorText.includes('does not exist')) {
          console.error("[Archives] Database tables may not exist. Please run the migration script.");
        }
        setGenerations([]);
        return;
      }
      
      const data = await response.json();
      console.log('[Archives] Loaded generations:', data?.length || 0);
      setGenerations(data || []);
    } catch (error) {
      console.error("[Archives] Failed to load generations:", error);
      setGenerations([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    if (user && session) {
      loadGenerations();
    } else if (!session) {
      // Only stop loading if we're sure there's no session (not still loading)
      const timeout = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [user, session, loadGenerations]);

  // Auto-refresh every 15 seconds if there are in-progress jobs
  // Individual cards update optimistically without full page reload
  useEffect(() => {
    if (!hasInProgressJobs || !session?.access_token || !user?.id) return;
    
    const interval = setInterval(async () => {
      // Only update in-progress generations without causing flicker
      const inProgressIds = generations
        .filter(g => !['completed', 'failed'].includes(g.status))
        .map(g => g.id);
      
      if (inProgressIds.length === 0) return;
      
      try {
        const url = `${supabaseUrl}/rest/v1/generations?select=*&user_id=eq.${user.id}&id=in.(${inProgressIds.join(',')})&order=created_at.desc`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const updatedGenerations = await response.json();
          
          // Merge updated data with existing generations
          setGenerations(prev => {
            const updated = [...prev];
            updatedGenerations.forEach((newGen: Generation) => {
              const index = updated.findIndex(g => g.id === newGen.id);
              if (index !== -1) {
                updated[index] = newGen;
              }
            });
            return updated;
          });
          
          // Emit event if any generation just completed
          updatedGenerations.forEach((gen: Generation) => {
            if (gen.status === 'completed') {
              window.dispatchEvent(new Event('generation-completed'));
            }
          });
        }
      } catch (error) {
        console.error('[Archives] Failed to update in-progress generations:', error);
      }
    }, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, [hasInProgressJobs, session?.access_token, user?.id, generations, loadGenerations]);

  // Auto-trigger processing for queued jobs that are older than 3 seconds
  useEffect(() => {
    if (!generations.length || !session?.access_token) return;
    
    const queuedJobs = generations.filter(g => {
      if (g.status !== 'queued') return false;
      const createdAt = new Date(g.created_at).getTime();
      return Date.now() - createdAt > 3000; // Older than 3 seconds
    });

    if (queuedJobs.length > 0) {
      console.log('[Archives] Auto-triggering', queuedJobs.length, 'queued jobs');
      queuedJobs.forEach(job => {
        fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generation_id: job.id }),
        }).catch(err => {
          console.error('[Archives] Auto-trigger failed for', job.id, err);
        });
      });
    }
  }, [generations, session?.access_token]);

  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this item?")) return;
      if (!session?.access_token) return;
      
      setIsDeleting(id);
      try {
          const response = await fetch(
            `${supabaseUrl}/rest/v1/generations?id=eq.${id}`,
            {
              method: 'DELETE',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${session.access_token}`,
              },
            }
          );
          
          if (!response.ok) throw new Error('Delete failed');
          // Remove from local state immediately for better UX
          setGenerations(prev => prev.filter(g => g.id !== id));
      } catch (e) {
          console.error("Failed to delete", e);
          alert("Failed to delete item.");
      } finally {
          setIsDeleting(null);
      }
  };

  const handleRestore = (item: Generation) => {
      setTopic(item.topic);
      setSubtopics(item.subtopics);
      setMode(item.mode);
      setTranscript(''); 
      setContent(item.final_content || '');
      setGapAnalysis(item.gap_analysis || null);
      
      // Properly extract formattedContent from assignment_data if available
      if (item.assignment_data) {
        if (typeof item.assignment_data === 'string') {
          // If it's already a string (new format), use it directly
          try {
            const parsed = JSON.parse(item.assignment_data);
            if (Array.isArray(parsed)) {
              useGenerationStore.getState().setFormattedContent(item.assignment_data);
            }
          } catch {
            // Invalid JSON, skip
          }
        } else if (typeof item.assignment_data === 'object') {
          const assignmentData = item.assignment_data as { questions?: any[], formatted?: string };
          
          // Check if we have questions array (old format from /api/process)
          if (assignmentData.questions && Array.isArray(assignmentData.questions)) {
            useGenerationStore.getState().setFormattedContent(JSON.stringify(assignmentData.questions));
          } 
          // Fallback to old formatted string format
          else if (assignmentData.formatted) {
            useGenerationStore.getState().setFormattedContent(assignmentData.formatted);
          }
        }
      }
      
      router.push('/editor');
  };

  // Get selected generation's gap analysis
  const selectedGeneration = showGapAnalysis ? generations.find(g => g.id === showGapAnalysis) : null;
  const gapAnalysisData = selectedGeneration?.gap_analysis as any;

  if (!user) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">Creation History</h1>
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <CloudOff className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Please log in to see your cloud-saved generations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Creation History</h1>
        <div className="flex items-center gap-4">
          {failedJobs.length > 0 && (
            <button 
              onClick={handleRetryStuck}
              disabled={isRetrying}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Zap className={`w-4 h-4 ${isRetrying ? 'animate-pulse' : ''}`} />
              {isRetrying ? 'Retrying...' : `Retry ${failedJobs.length} Failed`}
            </button>
          )}
          <button 
            onClick={loadGenerations}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Cloud className="w-4 h-4" />
            <span>Synced to cloud</span>
          </div>
        </div>
      </div>
      
      {/* Gap Analysis Dialog */}
      {showGapAnalysis && gapAnalysisData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowGapAnalysis(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gap Analysis</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedGeneration?.topic}</p>
              </div>
              <button 
                onClick={() => setShowGapAnalysis(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {/* Covered Topics */}
              {gapAnalysisData.covered && gapAnalysisData.covered.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-900">Fully Covered ({gapAnalysisData.covered.length})</h3>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 mb-3">These topics were thoroughly explained in the transcript and are included in the generated content:</p>
                    <ul className="space-y-2">
                      {gapAnalysisData.covered.map((topic: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-green-900">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Partially Covered Topics */}
              {gapAnalysisData.partiallyCovered && gapAnalysisData.partiallyCovered.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-amber-900">Partially Covered ({gapAnalysisData.partiallyCovered.length})</h3>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800 mb-3">These topics were briefly mentioned but not fully explained. Content includes only what was in the transcript:</p>
                    <ul className="space-y-2">
                      {gapAnalysisData.partiallyCovered.map((topic: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-amber-900">
                          <span className="text-amber-600 mt-0.5">⚠</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Not Covered Topics */}
              {gapAnalysisData.notCovered && gapAnalysisData.notCovered.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <X className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-900">Not Covered ({gapAnalysisData.notCovered.length})</h3>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 mb-3">These topics were not found in the transcript and are <strong>excluded from the generated content</strong>:</p>
                    <ul className="space-y-2">
                      {gapAnalysisData.notCovered.map((topic: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-red-900">
                          <span className="text-red-600 mt-0.5">✗</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Transcript Topics */}
              {gapAnalysisData.transcriptTopics && gapAnalysisData.transcriptTopics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-blue-900">Actual Transcript Topics</h3>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-3">Main topics identified in the transcript:</p>
                    <ul className="space-y-2">
                      {gapAnalysisData.transcriptTopics.map((topic: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-blue-900">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid gap-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading...</p>
          </div>
        ) : generations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No history found. Generate something first!</p>
            </div>
        ) : (
          generations.map((gen) => {
            const isInProgress = !['completed', 'failed'].includes(gen.status);
            
            return (
              <div 
                key={gen.id} 
                className={`bg-white border p-6 rounded-xl shadow-sm hover:shadow-md transition-all group
                  ${isInProgress ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}
                `}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                            ${gen.mode === 'lecture' ? 'bg-blue-100 text-blue-700' :
                              gen.mode === 'pre-read' ? 'bg-green-100 text-green-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                            {gen.mode}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(gen.created_at).toLocaleString()}
                        </span>
                        {gen.estimated_cost !== null && gen.estimated_cost !== undefined && gen.estimated_cost > 0 && (
                          <span className="text-sm text-orange-600 flex items-center gap-1 font-medium">
                              <DollarSign size={12} />
                              {gen.estimated_cost.toFixed(4)}
                          </span>
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{gen.topic}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-xl">{gen.subtopics}</p>
                    
                    {/* Stage Progress Indicator */}
                    <StageProgress status={gen.status} currentStep={gen.current_step} />
                  </div>
                  
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                     {gen.gap_analysis && (
                       <button 
                          onClick={() => setShowGapAnalysis(gen.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Gap Analysis"
                       >
                         <ClipboardList size={18} />
                       </button>
                     )}
                     <button 
                        onClick={() => handleDelete(gen.id)}
                        disabled={isDeleting === gen.id}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete"
                     >
                         {isDeleting === gen.id ? (
                           <Loader2 size={18} className="animate-spin" />
                         ) : (
                           <Trash2 size={18} />
                         )}
                     </button>
                     {gen.status === 'completed' && (
                       <button 
                          onClick={() => handleRestore(gen)}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                       >
                           Open in Editor <ArrowRight size={16} />
                       </button>
                     )}
                     {isInProgress && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                         <Loader2 size={16} className="animate-spin" />
                         Processing...
                       </div>
                     )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
