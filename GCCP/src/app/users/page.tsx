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
  RefreshCw,
  DollarSign,
  Save,
  Loader2,
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin, isLoading: authLoading, session } = useAuth();
  const supabase = getSupabaseClient();
  
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [generations, setGenerations] = useState<GenerationWithProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'profiles' | 'generations'>('profiles');
  
  // Budget editing state
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState<number>(0);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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

      console.log('[Admin] Profiles query result:', { data: profilesData, error: profilesError });
      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Fetch all generations with user info (admin only via RLS)
      // Specify the foreign key relationship explicitly since there are multiple
      const { data: generationsData, error: genError } = await supabase
        .from('generations')
        .select('*, profiles!generations_user_id_fkey(email, role)')
        .order('created_at', { ascending: false })
        .limit(100);

      console.log('[Admin] Generations query result:', { data: generationsData, error: genError });
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

  // Handle budget update
  const handleUpdateBudget = async (userId: string) => {
    if (!session?.access_token) return;
    
    setSavingBudget(true);
    setBudgetMessage(null);
    
    try {
      // Convert dollars to cents (store as integer)
      const creditsInCents = Math.round(budgetValue * 100);
      
      const { error } = await supabase
        .from('profiles')
        .update({ credits: creditsInCents })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setProfiles(prev => prev.map(p => 
        p.id === userId ? { ...p, credits: creditsInCents } : p
      ));
      
      setBudgetMessage({ type: 'success', text: 'Budget updated successfully!' });
      setEditingBudget(null);
      
      setTimeout(() => setBudgetMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update budget:', err);
      const errorMsg = err?.message || err?.details || JSON.stringify(err) || 'Failed to update budget';
      setBudgetMessage({ type: 'error', text: errorMsg });
    } finally {
      setSavingBudget(false);
    }
  };

  // Start editing budget for a user
  const startEditingBudget = (profile: Profile) => {
    setEditingBudget(profile.id);
    // Convert cents to dollars for display
    setBudgetValue(profile.credits / 100);
    setBudgetMessage(null);
  };

  // Get total spent by user from profile's spent_credits (in cents, convert to dollars)
  // Falls back to calculating from generations if spent_credits is not available
  const getUserTotalSpent = (profile: Profile) => {
    // If spent_credits exists, use it; otherwise fall back to generation calculation
    if (typeof profile.spent_credits === 'number') {
      return profile.spent_credits / 100;
    }
    // Fallback: calculate from generations (legacy behavior)
    return generations
      .filter(g => g.user_id === profile.id)
      .reduce((sum, g) => sum + (g.estimated_cost || 0), 0);
  };

  // Filter generations by selected user and search term
  const filteredGenerations = generations.filter(gen => {
    const matchesUser = !selectedUser || gen.user_id === selectedUser;
    const matchesSearch = !searchTerm || 
      gen.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gen.profiles?.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesUser && matchesSearch;
  });

  const selectedProfile = profiles.find(p => p.id === selectedUser);

  // Calculate stats - use spent_credits if available, otherwise fall back to generations
  const totalUsers = profiles.length;
  const totalGenerations = generations.length;
  const totalBudgetAllocated = profiles.reduce((sum, p) => sum + p.credits, 0);
  const totalSpent = profiles.some(p => typeof p.spent_credits === 'number')
    ? profiles.reduce((sum, p) => sum + (p.spent_credits ?? 0), 0) / 100
    : generations.reduce((sum, g) => sum + (g.estimated_cost || 0), 0);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage users, budgets, and view all generations
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalGenerations}</p>
              <p className="text-xs text-gray-500">Total Generations</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalBudgetAllocated.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Budget</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${totalSpent.toFixed(4)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Update Message */}
      {budgetMessage && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          budgetMessage.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {budgetMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {budgetMessage.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('profiles')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'profiles'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            Budget Management
          </div>
        </button>
        <button
          onClick={() => setActiveTab('generations')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'generations'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            All Generations
          </div>
        </button>
      </div>

      {activeTab === 'profiles' ? (
        /* Budget Management Section */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              User Budget Management
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Set budget limits for each user. Users cannot generate content when budget is exhausted.
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remaining</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Generations</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Joined</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  profiles.map((profile) => {
                    const spent = getUserTotalSpent(profile);
                    // Convert credits from cents to dollars
                    const creditsInDollars = profile.credits / 100;
                    const remaining = creditsInDollars - spent;
                    const genCount = generations.filter(g => g.user_id === profile.id).length;
                    const isEditing = editingBudget === profile.id;
                    
                    return (
                      <tr key={profile.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {profile.email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{profile.email}</p>
                              <p className="text-xs text-gray-500">{profile.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            profile.role === 'admin' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {profile.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                value={budgetValue}
                                onChange={(e) => setBudgetValue(parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                step="0.01"
                                min="0"
                              />
                            </div>
                          ) : (
                            <span className="font-medium text-gray-900">${(profile.credits / 100).toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-orange-600 font-medium">${spent.toFixed(4)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${remaining.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gray-600">{genCount}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateBudget(profile.id)}
                                disabled={savingBudget}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                              >
                                {savingBudget ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Save className="w-3 h-3" />
                                )}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingBudget(null)}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditingBudget(profile)}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                            >
                              <DollarSign className="w-3 h-3" />
                              Edit Budget
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Generations Tab */
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
                          <span>${(profile.credits / 100).toFixed(2)}</span>
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
                          <span className="flex items-center gap-1 text-orange-600 font-medium">
                            <DollarSign className="w-3 h-3" />
                            ${(gen.estimated_cost || 0).toFixed(4)}
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
      )}
    </div>
  );
}
