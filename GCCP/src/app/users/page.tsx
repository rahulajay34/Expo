'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Profile, Generation, GenerationWithProfile } from '@/types/database';
import { 
  Shield, 
  User as UserIcon, 
  FileText, 
  Clock, 
  Eye,
  ChevronRight,
  Search,
  RefreshCw
} from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const supabase = getSupabaseClient();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generations, setGenerations] = useState<GenerationWithProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all profiles (admin only via RLS)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch all generations with user info (admin only via RLS)
      const { data: generationsData, error: genError } = await supabase
        .from('generations')
        .select('*, profiles(email, role)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (genError) throw genError;
      setGenerations(generationsData as GenerationWithProfile[] || []);
    } catch (err) {
      console.error('[Admin] Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  // Filter generations by selected user and search term
  const filteredGenerations = generations.filter(gen => {
    const matchesUser = !selectedUser || gen.user_id === selectedUser;
    const matchesSearch = !searchTerm || 
      gen.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gen.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUser && matchesSearch;
  });

  const selectedProfile = profiles.find(p => p.id === selectedUser);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all users and their generations
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Users ({profiles.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {/* All Users Option */}
              <button
                onClick={() => setSelectedUser(null)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  !selectedUser ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">All Users</span>
                  <span className="text-xs text-gray-500">{generations.length} gens</span>
                </div>
              </button>

              {profiles.map((profile) => {
                const userGenCount = generations.filter(g => g.user_id === profile.id).length;
                return (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedUser(profile.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedUser === profile.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {profile.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {profile.email.split('@')[0]}
                          </span>
                          {profile.role === 'admin' && (
                            <Shield className="w-3 h-3 text-purple-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{userGenCount} generations</span>
                          <span>•</span>
                          <span>{profile.credits} credits</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Generations List */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {selectedProfile ? `${selectedProfile.email}'s Generations` : 'All Generations'}
                  <span className="text-sm font-normal text-gray-500">
                    ({filteredGenerations.length})
                  </span>
                </h2>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : filteredGenerations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No generations found
                </div>
              ) : (
                filteredGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {gen.topic}
                          </span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            gen.status === 'completed' 
                              ? 'bg-green-100 text-green-700'
                              : gen.status === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : gen.status === 'processing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {gen.status}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                            {gen.mode}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {gen.profiles?.email || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/editor?view=${gen.id}`)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
