'use client';

import Link from 'next/link';
import { Menu, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';

export function Header() {
  const { profile, user } = useAuth();
  const { toggle } = useSidebar();

  // Get display name from user metadata or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-12 border-b border-zinc-200/60 bg-white flex items-center px-4 justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggle}
          aria-label="Toggle navigation menu"
          className="p-1.5 hover:bg-zinc-100 rounded-md lg:hidden transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-medium text-base">
          <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-zinc-900">Agentic Core</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Credits Display */}
        {profile && (
          <div className="h-7 px-3 rounded-md bg-zinc-50 border border-zinc-200/60 flex items-center text-[13px] font-medium transition-colors">
            <span className="text-zinc-500 mr-1.5">Credits:</span>
            <span className="font-semibold text-zinc-900">{profile.credits}</span>
          </div>
        )}

        {/* Role Badge */}
        {profile?.role === 'admin' && (
          <div className="h-7 px-2.5 rounded-md bg-purple-50 border border-purple-200/60 flex items-center text-[13px] font-medium text-purple-700">
            Admin
          </div>
        )}
        
        {/* User Info */}
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-zinc-600 hidden sm:block font-medium">
            {displayName}
          </span>
          {/* User Avatar */}
          <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center text-white text-[11px] font-semibold">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}

