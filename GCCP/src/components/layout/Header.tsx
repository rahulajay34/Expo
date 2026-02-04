'use client';

import Link from 'next/link';
import { Menu, Sparkles, Wallet, TrendingDown, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';
import { useState, useEffect } from 'react';

export function Header() {
  const { profile, user, refreshProfile } = useAuth();
  const { toggle } = useSidebar();
  const [isRefreshingBudget, setIsRefreshingBudget] = useState(false);
  
  // Listen for generation completion events and refresh budget
  useEffect(() => {
    const handleGenerationComplete = async () => {
      setIsRefreshingBudget(true);
      // Wait 5 seconds before refreshing to allow backend to update
      await new Promise(resolve => setTimeout(resolve, 5000));
      await refreshProfile();
      setIsRefreshingBudget(false);
    };
    
    window.addEventListener('generation-completed', handleGenerationComplete);
    return () => window.removeEventListener('generation-completed', handleGenerationComplete);
  }, [refreshProfile]);

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  // Calculate remaining budget from profile's credits and spent_credits
  // Both are stored as cents (e.g., 10000 = $100.00)
  // Use ?? instead of || to properly handle 0 values
  const budgetInDollars = (profile?.credits ?? 0) / 100;
  // Handle case where spent_credits column might not exist yet (backward compatibility)
  const spentInDollars = (profile?.spent_credits ?? 0) / 100;
  const remaining = budgetInDollars - spentInDollars;
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
            {isRefreshingBudget ? (
              <RefreshCw className="w-4 h-4 mr-2 text-blue-600 animate-spin" />
            ) : (
              <Wallet className={`w-4 h-4 mr-2 ${
                isBudgetExhausted ? 'text-red-600' : isLowBudget ? 'text-amber-600' : 'text-green-600'
              }`} />
            )}
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

