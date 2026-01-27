'use client';

import { useEffect, useState } from 'react';
import { Generation } from '@/types/database';
import { useGenerationStore } from '@/lib/store/generation';
import { useRouter } from 'next/navigation';
import { FileText, ArrowRight, Trash2, Calendar, Cloud, CloudOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function ArchivesPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { user, session } = useAuth();
  const { setTopic, setSubtopics, setMode, setTranscript, setContent, setGapAnalysis } = useGenerationStore();

  useEffect(() => {
    if (user && session) {
      loadGenerations();
    } else if (!session) {
      // Only stop loading if we're sure there's no session (not still loading)
      const timeout = setTimeout(() => setIsLoading(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [user, session]);

  const loadGenerations = async () => {
    if (!session?.access_token) {
      console.warn('[Archives] No access token available');
      setIsLoading(false);
      // Show a more helpful message to user
      alert('Your session has expired. Please log in again.');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('[Archives] Loading generations for user:', user?.id);
      
      // Use direct REST API to avoid Supabase client hanging
      const response = await fetch(
        `${supabaseUrl}/rest/v1/generations?select=*&order=created_at.desc`,
        {
          method: 'GET',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Archives] Failed to load generations:", response.status, errorText);
        alert(`Failed to load: ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      console.log('[Archives] Loaded generations:', data?.length || 0);
      setGenerations(data || []);
    } catch (error) {
      console.error("[Archives] Failed to load generations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Are you sure you want to delete this item?")) return;
      if (!session?.access_token) return;
      
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
          loadGenerations();
      } catch (e) {
          console.error("Failed to delete", e);
          alert("Failed to delete item.");
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
      if (item.assignment_data && typeof item.assignment_data === 'object') {
        const assignmentData = item.assignment_data as { formatted?: string };
        if (assignmentData.formatted) {
          useGenerationStore.getState().setFormattedContent(assignmentData.formatted);
        }
      }
      
      router.push('/editor');
  };

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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-zinc-900">Creation History</h1>
        <div className="flex items-center gap-2 text-[13px] text-zinc-500">
          <Cloud className="w-3.5 h-3.5" />
          <span>Synced to cloud</span>
        </div>
      </div>
      
      <div className="border border-zinc-200 rounded-md overflow-hidden bg-white">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-900 border-t-transparent mx-auto"></div>
            <p className="text-zinc-500 mt-3 text-[13px]">Loading...</p>
          </div>
        ) : generations.length === 0 ? (
            <div className="text-center py-16 bg-zinc-50">
                <p className="text-zinc-500 text-[13px]">No history found. Generate something first!</p>
            </div>
        ) : (
          generations.map((gen, index) => (
            <div key={gen.id} className={`border-b border-zinc-100 last:border-b-0 p-4 hover:bg-zinc-50/50 transition-colors flex justify-between items-center group ${
              index === 0 ? '' : ''
            }`}>
               <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium uppercase tracking-wide
                          ${gen.mode === 'lecture' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            gen.mode === 'pre-read' ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                          {gen.mode}
                      </span>
                      <span className={`px-2 py-0.5 rounded-sm text-[11px] font-medium
                          ${gen.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                            gen.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                            'bg-zinc-50 text-zinc-700 border border-zinc-200'
                          }`}>
                          {gen.status}
                      </span>
                      <span className="text-[12px] text-zinc-500 flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(gen.created_at).toLocaleString()}
                      </span>
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 mb-1">{gen.topic}</h3>
                  <p className="text-[13px] text-zinc-500 truncate max-w-xl">{gen.subtopics}</p>
               </div>
               
               <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                   <button 
                      onClick={() => handleDelete(gen.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete"
                   >
                       <Trash2 size={16} />
                   </button>
                   <button 
                      onClick={() => handleRestore(gen)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors text-[13px] font-medium"
                   >
                       Open in Editor <ArrowRight size={14} />
                   </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
