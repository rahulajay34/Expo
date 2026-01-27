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
    <header className="h-16 border-b border-zinc-200 bg-white/80 backdrop-blur-md flex items-center px-6 justify-between sticky top-0 z-50 transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          aria-label="Toggle navigation menu"
          className="p-2 hover:bg-zinc-100 rounded-xl lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="gradient-text">Agentic Core</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Credits Display */}
        {profile && (
          <div className="h-9 px-4 rounded-full bg-zinc-100 flex items-center text-sm font-medium transition-colors">
            <span className="text-zinc-500 mr-2">Credits:</span>
            <span className="font-bold text-zinc-900">{profile.credits}</span>
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

