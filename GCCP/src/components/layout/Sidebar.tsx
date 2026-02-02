'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileEdit, Database, LogOut, Users, Shield, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';
import { useEffect, useState, useTransition } from 'react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', adminOnly: false },
  { label: 'Editor', icon: FileEdit, href: '/editor', adminOnly: false },
  { label: 'Archives', icon: Database, href: '/archives', adminOnly: false },
  { label: 'All Users', icon: Users, href: '/users', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, signOut, profile, isLoading: authLoading } = useAuth();
  const { isOpen, close } = useSidebar();
  const [isPending, startTransition] = useTransition();
  const [clickedHref, setClickedHref] = useState<string | null>(null);
  
  // Debug logging for admin check
  useEffect(() => {
    console.log('[Sidebar] Auth state:', { 
      isAdmin, 
      authLoading,
      profileRole: profile?.role,
      profileId: profile?.id,
      profileEmail: profile?.email,
      profileCredits: profile?.credits
    });
  }, [isAdmin, authLoading, profile]);
  
  // Filter nav items based on admin status
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  // Close sidebar on route change (mobile) and reset clicked href
  useEffect(() => {
    close();
    setClickedHref(null);
  }, [pathname, close]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [close]);

  // Handle nav click with loading state
  const handleNavClick = (href: string) => {
    if (href !== pathname) {
      setClickedHref(href);
    }
  };
  
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed lg:relative inset-y-0 left-0 z-50
          flex flex-col w-64 border-r border-zinc-200 
          h-full bg-white flex-shrink-0 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200">
          <span className="font-semibold text-sm">Navigation</span>
          <button 
            onClick={close}
            aria-label="Close navigation menu"
            className="p-2 hover:bg-zinc-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isLoading = clickedHref === item.href && !isActive;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavClick(item.href)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : isLoading
                    ? 'bg-zinc-100 text-zinc-700'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                  }`}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                ) : (
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : ''}`} />
                )}
                <span>{item.label}</span>
                {item.adminOnly && (
                  <Shield className="w-3.5 h-3.5 ml-auto text-purple-500" />
                )}
                {isActive && !item.adminOnly && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
                {isLoading && (
                  <span className="ml-auto text-xs text-blue-600">Loading...</span>
                )}
              </Link>
            );
          })}
        </nav>
      
        <div className="p-4 space-y-2 border-t border-zinc-200">
          {/* User Info */}
          {profile && (
            <div className="px-4 py-2 text-xs text-zinc-500">
              Signed in as <span className="font-medium text-zinc-700">{profile.email}</span>
            </div>
          )}
        
          {/* Logout */}
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

