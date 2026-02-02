'use client';

import Link from 'next/link';
import { Menu, Sparkles, Wallet, TrendingDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export function Header() {
  const { profile, user } = useAuth();
  const { toggle } = useSidebar();
  const [totalSpent, setTotalSpent] = useState(0);

  // Fetch total spent from generations
  useEffect(() => {
    const fetchSpent = async () => {
      if (!user?.id) return;
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('generations')
        .select('estimated_cost')
        .eq('user_id', user.id);
      
      if (!error && data) {
        const total = data.reduce((sum, g) => sum + (g.estimated_cost || 0), 0);
        setTotalSpent(total);
        console.log('[Header] Total spent loaded:', total);
      }
    };

    fetchSpent();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSpent, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Debug: Log profile state
  useEffect(() => {
    console.log('[Header] Profile state:', { profile, userId: user?.id });
  }, [profile, user?.id]);

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Calculate remaining budget
  // Credits is stored as cents (e.g., 10000 = $100.00 budget)
  // Spent is in dollars (e.g., 0.0234)
  const budgetInDollars = (profile?.credits || 0) / 100;
  const remaining = budgetInDollars - totalSpent;
  const budgetPercent = budgetInDollars > 0 ? (remaining / budgetInDollars) * 100 : 0;
  const isLowBudget = budgetPercent < 20;
  const isBudgetExhausted = remaining <= 0;

  return (
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50 transition-colors duration-150">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          aria-label="Toggle navigation menu"
          className="p-2 hover:bg-zinc-100 rounded-xl lg:hidden transition-all duration-150 transform-gpu active:scale-90"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-bold text-xl transition-transform duration-150 hover:scale-[1.02] transform-gpu">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">Agentic Core</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Budget Display - show for all logged-in users */}
        {user && (
          <div className={`h-9 px-4 rounded-full flex items-center text-sm font-medium transition-colors ${
            isBudgetExhausted 
              ? 'bg-red-100 border border-red-200' 
              : isLowBudget 
                ? 'bg-amber-100 border border-amber-200' 
                : 'bg-green-100 border border-green-200'
          }`}>
            <Wallet className={`w-4 h-4 mr-2 ${
              isBudgetExhausted ? 'text-red-600' : isLowBudget ? 'text-amber-600' : 'text-green-600'
            }`} />
            <div className="flex items-center gap-2">
              <span className={`font-bold ${
                isBudgetExhausted ? 'text-red-700' : isLowBudget ? 'text-amber-700' : 'text-green-700'
              }`}>
                ${remaining.toFixed(2)}
              </span>
              <span className="text-zinc-400 text-xs">/ ${budgetInDollars.toFixed(2)}</span>
            </div>
            {isBudgetExhausted && (
              <TrendingDown className="w-4 h-4 ml-2 text-red-600" />
            )}
          </div>
        )}

        {/* Role Badge */}
        {profile?.role === 'admin' && (
          <div className="h-9 px-3 rounded-full bg-purple-100 flex items-center text-sm font-medium text-purple-700">
            Admin
          </div>
        )}
        
        {/* User Info */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-600 hidden sm:block">
            {displayName}
          </span>
          {/* User Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}

