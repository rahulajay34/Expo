'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Generation, GenerationWithProfile, Profile } from '@/types/database';
import { useGenerationStore } from '@/lib/store/generation';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Trash2, Calendar, Cloud, CloudOff, RefreshCw, Loader2, DollarSign, CheckCircle2, Clock, AlertCircle, Zap, Eye, PenTool, Sparkles, FileCheck, ClipboardList, X, Download, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { SafeMarkdown } from '@/components/ui/SafeMarkdown';
import { TeachingQualityModal } from '@/components/ui/TeachingQualityModal';
import 'katex/dist/katex.min.css';

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
  const [generations, setGenerations] = useState<GenerationWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showGapAnalysis, setShowGapAnalysis] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Pagination & Filtering State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<Profile[]>([]);

  // Teaching Quality Modal State
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [analysisTopic, setAnalysisTopic] = useState<string>('');
  
  // New States
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormatting, setIsFormatting] = useState<string | null>(null);
  
  const router = useRouter();
  const { user, session, isAdmin } = useAuth();
  const { setTopic, setSubtopics, setMode, setTranscript, setContent, setGapAnalysis } = useGenerationStore();

  // Load available users for admin filter
  useEffect(() => {
    if (isAdmin && session?.access_token) {
      fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        }
      })
      .then(res => res.json())
      .then(data => setUsers(data || []))
      .catch(err => console.error("Failed to load users:", err));
    }
  }, [isAdmin, session]);

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
      console.log('[Archives] Loading generations for user:', user?.id, 'Page:', currentPage);
      
      // Calculate range for pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      // Use direct REST API
      // Admins see all (or filtered), Users see only their own
      let url = `${supabaseUrl}/rest/v1/generations?select=*,profiles(email,role)&order=created_at.desc&limit=${pageSize}&offset=${from}`;
      
      if (!isAdmin) {
        url += `&user_id=eq.${user.id}`;
      } else if (selectedUserFilter !== 'all') {
        url += `&user_id=eq.${selectedUserFilter}`;
      }
      
      // Get count as well
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Archives] Failed to load generations:", response.status, errorText);
        setGenerations([]);
        return;
      }
      
      const data = await response.json();
      const count = response.headers.get('content-range')?.split('/')[1];
      
      if (count) {
        setTotalCount(parseInt(count));
      }

      console.log('[Archives] Loaded generations:', data?.length || 0, 'Total:', count);
      setGenerations(data || []);
    } catch (error) {
      console.error("[Archives] Failed to load generations:", error);
      setGenerations([]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token, user?.id, currentPage, pageSize, isAdmin, selectedUserFilter]);

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
        const url = `${supabaseUrl}/rest/v1/generations?select=*,profiles(email,role)&user_id=eq.${user.id}&id=in.(${inProgressIds.join(',')})&order=created_at.desc`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const updatedGenerations = (await response.json()) as GenerationWithProfile[];
          
          // Merge updated data with existing generations
          setGenerations(prev => {
            const updated = [...prev];
            updatedGenerations.forEach((newGen) => {
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
  }, [hasInProgressJobs, session?.access_token, user?.id, generations, loadGenerations, currentPage, selectedUserFilter]);

  // Track which jobs we've already tried to trigger (prevents duplicate API calls)
  const triggeredJobsRef = useRef<Set<string>>(new Set());

  // Auto-trigger processing for queued jobs that are older than 3 seconds
  // This only triggers ONCE per job to prevent duplicate processing
  useEffect(() => {
    if (!generations.length || !session?.access_token) return;
    
    const queuedJobs = generations.filter(g => {
      if (g.status !== 'queued') return false;
      // Skip if we've already triggered this job
      if (triggeredJobsRef.current.has(g.id)) return false;
      const createdAt = new Date(g.created_at).getTime();
      return Date.now() - createdAt > 3000; // Older than 3 seconds
    });

    if (queuedJobs.length > 0) {
      console.log('[Archives] Auto-triggering', queuedJobs.length, 'queued jobs (first time only)');
      queuedJobs.forEach(job => {
        // Mark as triggered BEFORE firing the request
        triggeredJobsRef.current.add(job.id);
        fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generation_id: job.id }),
        }).catch(err => {
          console.error('[Archives] Auto-trigger failed for', job.id, err);
          // On failure, remove from triggered set so it can be retried manually
          triggeredJobsRef.current.delete(job.id);
        });
      });
    }
    
    // Check for stuck jobs (in-progress but no heartbeat update for 5 minutes)
    // Also only trigger ONCE per job
    const stuckJobs = generations.filter(g => {
      if (['completed', 'failed', 'queued'].includes(g.status)) return false;
      // Skip if we've already triggered this job
      if (triggeredJobsRef.current.has(g.id + '_stuck')) return false;
      const updatedAt = new Date(g.updated_at || g.created_at).getTime();
      const timeSinceUpdate = Date.now() - updatedAt;
      return timeSinceUpdate > 5 * 60 * 1000; // 5 minutes
    });
    
    if (stuckJobs.length > 0) {
      console.log('[Archives] Detected', stuckJobs.length, 'stuck jobs - auto-retrying (first time only)');
      stuckJobs.forEach(job => {
        // Mark as triggered for stuck retry
        triggeredJobsRef.current.add(job.id + '_stuck');
        fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generation_id: job.id }),
        }).catch(err => {
          console.error('[Archives] Stuck job retry failed for', job.id, err);
          triggeredJobsRef.current.delete(job.id + '_stuck');
        });
      });
    }
    
    // Clean up triggered jobs set when jobs complete or fail
    generations.forEach(g => {
      if (['completed', 'failed'].includes(g.status)) {
        triggeredJobsRef.current.delete(g.id);
        triggeredJobsRef.current.delete(g.id + '_stuck');
      }
    });
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
          setTotalCount(prev => Math.max(0, prev - 1));
      } catch (e) {
          console.error("Failed to delete", e);
          alert("Failed to delete item.");
      } finally {
          setIsDeleting(null);
      }
  };

  const handleViewLogs = async (generationId: string) => {
    if (!session?.access_token) return;
    
    try {
      const url = `${supabaseUrl}/rest/v1/generation_logs?generation_id=eq.${generationId}&order=created_at.asc&select=*`;
      const response = await fetch(url, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      
      if (response.ok) {
        const fetchedLogs = await response.json();
        setLogs(fetchedLogs);
        setShowLogs(generationId);
      }
    } catch (error) {
      console.error('[Archives] Failed to fetch logs:', error);
      alert('Failed to load logs');
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
          // Check if it's directly an array (new format)
          if (Array.isArray(item.assignment_data)) {
            useGenerationStore.getState().setFormattedContent(JSON.stringify(item.assignment_data));
          }
          // Check if we have questions array (old format from /api/process)
          else {
            const assignmentData = item.assignment_data as { questions?: any[], formatted?: string };
            if (assignmentData.questions && Array.isArray(assignmentData.questions)) {
                useGenerationStore.getState().setFormattedContent(JSON.stringify(assignmentData.questions));
            } 
            // Fallback to old formatted string format
            else if (assignmentData.formatted) {
                useGenerationStore.getState().setFormattedContent(assignmentData.formatted);
            }
          }
        }
      }
      
      router.push('/editor');
  };

  const handleRunAnalysis = async (genId: string) => {
    if (!confirm("Run Meta-Quality Analysis for this generation?")) return;
    
    try {
        const res = await fetch('/api/admin/analyze-generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ generation_id: genId })
        });
        
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Analysis failed");
        
        alert("Analysis triggered successfully!");
        loadGenerations(); // Refresh to show status
    } catch (e: any) {
        console.error("Analysis error:", e);
        alert(`Failed: ${e.message}`);
    }
  };

  const handleManualFormat = async (genId: string) => {
    setIsFormatting(genId);
    try {
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generation_id: genId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Formatting failed");
      
      alert("Formatting completed successfully!");
      loadGenerations();
    } catch (e: any) {
      console.error("Formatting error:", e);
      alert(`Formatting failed: ${e.message}`);
    } finally {
      setIsFormatting(null);
    }
  };

  // Get selected generation's gap analysis
  const selectedGeneration = showGapAnalysis ? generations.find(g => g.id === showGapAnalysis) : null;
  const gapAnalysisData = selectedGeneration?.gap_analysis as any;
  
  // Get selected generation for preview
  const previewGeneration = showPreview ? generations.find(g => g.id === showPreview) : null;

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
    <>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Creation History</h1>
            <p className="text-sm text-gray-500 mt-1">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} items
            </p>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Admin User Filter */}
            {isAdmin && (
               <select 
                  value={selectedUserFilter}
                  onChange={(e) => {
                    setSelectedUserFilter(e.target.value);
                    setCurrentPage(1); // Reset to page 1 on filter change
                  }}
                  className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
               >
                  <option value="all">All Users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
               </select>
            )}

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
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
                 <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Previous
                 </button>
                 <span className="text-sm text-gray-600 font-medium">
                    Page {currentPage}
                 </span>
                 <button
                    onClick={() => setCurrentPage(prev => (prev * pageSize < totalCount ? prev + 1 : prev))}
                    disabled={currentPage * pageSize >= totalCount || isLoading}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    Next
                 </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

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
            generations
              .filter(gen => 
                searchTerm === '' || 
                gen.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                gen.subtopics.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((gen) => {
              const isInProgress = !['completed', 'failed'].includes(gen.status);
              
              // check if it needs formatting (assignment mode, completed, but no assignment_data)
              const needsFormatting = gen.mode === 'assignment' && gen.status === 'completed' && (
                !gen.assignment_data || 
                (Array.isArray(gen.assignment_data) && gen.assignment_data.length === 0) ||
                (typeof gen.assignment_data === 'object' && gen.assignment_data !== null && 'questions' in gen.assignment_data && Array.isArray((gen.assignment_data as any).questions) && (gen.assignment_data as any).questions.length === 0)
              );

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
                          {isAdmin && gen.profiles?.email && (
                             <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200" title={gen.user_id}>
                                👤 {gen.profiles.email}
                             </span>
                          )}
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
                            <div className="relative group/cost">
                              <span className="text-sm text-orange-600 flex items-center gap-1 font-medium cursor-help">
                                  <DollarSign size={12} />
                                  {gen.estimated_cost.toFixed(4)}
                              </span>
                              
                              {/* Cost Breakdown Tooltip */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/cost:opacity-100 group-hover/cost:visible transition-all w-48 z-10 shadow-xl">
                                <p className="font-semibold border-b border-gray-700 pb-1 mb-1">Cost Breakdown</p>
                                {(gen.cost_details as any) ? (
                                  <>
                                    <div className="flex justify-between py-0.5">
                                      <span>Input:</span>
                                      <span>${((gen.cost_details as any).inputCost || 0).toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span>Output:</span>
                                      <span>${((gen.cost_details as any).outputCost || 0).toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between py-0.5">
                                      <span>Images ({(gen.cost_details as any).imageCount || 0}):</span>
                                      <span>${((gen.cost_details as any).imageCost || 0).toFixed(4)}</span>
                                    </div>
                                    <div className="border-t border-gray-700 mt-1 pt-1 flex justify-between font-medium text-orange-300">
                                      <span>Total:</span>
                                      <span>${((gen.cost_details as any).totalCost || gen.estimated_cost).toFixed(4)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <p className="italic text-gray-400">Detailed breakdown not available for this generation.</p>
                                )}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          )}
                          
                          {/* Admin: Meta-Analysis Status */}
                          {isAdmin && (
                            <div className="ml-2">
                                {gen.meta_analysis_completed ? (
                                    <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-md border border-green-200" title="Meta-Quality Analysis Completed">
                                        <Sparkles size={10} />
                                        Analyzed
                                    </span>
                                ) : gen.status === 'completed' ? (
                                    <button 
                                        onClick={() => handleRunAnalysis(gen.id)}
                                        className="flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200 hover:bg-purple-100 transition-colors"
                                        title="Run Meta-Quality Analysis"
                                    >
                                        <Zap size={10} />
                                        Run Analysis
                                    </button>
                                ) : null}
                            </div>
                          )}
                          
                          {/* Instructor Quality Score Badge */}
                          {(gen.instructor_quality as any)?.overallScore && (
                            <div className="ml-2">
                              <button 
                                onClick={() => {
                                  setSelectedAnalysis(gen.instructor_quality);
                                  setAnalysisTopic(gen.topic);
                                }}
                                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-all hover:scale-105 active:scale-95
                                  ${(gen.instructor_quality as any).overallScore >= 8 
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' 
                                    : (gen.instructor_quality as any).overallScore >= 6 
                                    ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                    : 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                  }`}
                                title="Click for detailed analysis"
                              >
                                🎓 {(gen.instructor_quality as any).overallScore}/10
                              </button>
                            </div>
                          )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{gen.topic}</h3>
                      <p className="text-sm text-gray-500 truncate max-w-xl">{gen.subtopics}</p>
                      
                      {/* Error Message */}
                      {gen.status === 'failed' && gen.error_message && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-900 mb-1">Generation Failed</p>
                              <p className="text-xs text-red-800 whitespace-pre-wrap">{gen.error_message}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Stage Progress Indicator */}
                      <StageProgress status={gen.status} currentStep={gen.current_step} />
                    </div>
                    
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                       {/* Preview button - shows partial or complete content */}
                       <button 
                          onClick={() => setShowPreview(gen.id)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title={gen.status === 'completed' ? 'Preview Content' : 'Preview Work-in-Progress'}
                       >
                         <Eye size={18} />
                       </button>
                       
                       {/* View Logs button */}
                       <button 
                          onClick={() => handleViewLogs(gen.id)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View Logs"
                       >
                         <FileText size={18} />
                       </button>
                       
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
                       
                       {/* Manual Format Button */}
                       {needsFormatting && (
                         <button
                           onClick={() => handleManualFormat(gen.id)}
                           disabled={isFormatting === gen.id}
                           className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm font-medium transition-colors"
                           title="Format Assignment (Fix Missing JSON)"
                         >
                           {isFormatting === gen.id ? (
                             <Loader2 size={16} className="animate-spin" />
                           ) : (
                             <FileCheck size={16} />
                           )}
                           Format Data
                         </button>
                       )}

                       {gen.status === 'completed' && !needsFormatting && (
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
      
      {/* Logs Viewer Dialog */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLogs(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Generation Logs</h2>
                <p className="text-sm text-gray-500 mt-1">Detailed processing history</p>
              </div>
              <button 
                onClick={() => setShowLogs(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No logs found</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border-l-4 ${
                        log.log_type === 'error' ? 'bg-red-50 border-red-500' :
                        log.log_type === 'warning' ? 'bg-amber-50 border-amber-500' :
                        log.log_type === 'success' ? 'bg-green-50 border-green-500' :
                        log.log_type === 'step' ? 'bg-blue-50 border-blue-500' :
                        'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold uppercase ${
                              log.log_type === 'error' ? 'text-red-700' :
                              log.log_type === 'warning' ? 'text-amber-700' :
                              log.log_type === 'success' ? 'text-green-700' :
                              log.log_type === 'step' ? 'text-blue-700' :
                              'text-gray-700'
                            }`}>{log.agent_name}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className={`text-sm whitespace-pre-wrap ${
                            log.log_type === 'error' ? 'text-red-800' :
                            log.log_type === 'warning' ? 'text-amber-800' :
                            log.log_type === 'success' ? 'text-green-800' :
                            log.log_type === 'step' ? 'text-blue-800' :
                            'text-gray-700'
                          }`}>{log.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Preview Dialog */}
      {showPreview && previewGeneration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-gray-900 truncate">Content Preview</h2>
                <p className="text-sm text-gray-500 mt-1 truncate">{previewGeneration.topic}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold uppercase
                    ${previewGeneration.status === 'completed' ? 'bg-green-100 text-green-700' :
                      previewGeneration.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                    {previewGeneration.status}
                  </span>
                  {previewGeneration.status !== 'completed' && previewGeneration.status !== 'failed' && (
                    <span className="text-xs text-amber-600 flex items-center gap-1">
                      <Clock size={12} />
                      Work in progress - partial content shown
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setShowPreview(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {previewGeneration.final_content ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-purple-600 prose-pre:bg-gray-900 prose-pre:text-gray-100">
                  <SafeMarkdown math highlight mermaid>
                    {previewGeneration.final_content}
                  </SafeMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg font-medium mb-2">No content available yet</p>
                  <p className="text-gray-400 text-sm">
                    {previewGeneration.status === 'queued' || previewGeneration.status === 'processing' 
                      ? 'Generation is starting...' 
                      : 'Content is being generated...'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between gap-2 flex-shrink-0">
              <div className="flex gap-2">
                {previewGeneration.final_content && (
                  <button
                    onClick={() => {
                      const blob = new Blob([previewGeneration.final_content || ''], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${previewGeneration.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${previewGeneration.mode}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-2 font-medium"
                  >
                    <Download size={16} />
                    Download Markdown
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Close
                </button>
                {previewGeneration.status === 'completed' && (
                  <button
                    onClick={() => {
                      handleRestore(previewGeneration);
                      setShowPreview(null);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    Open in Editor <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
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
      <TeachingQualityModal 
        isOpen={!!selectedAnalysis} 
        onClose={() => setSelectedAnalysis(null)} 
        analysis={selectedAnalysis} 
        topic={analysisTopic}
      />
    </>
  );
}
