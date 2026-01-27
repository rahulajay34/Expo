'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileEdit, Database, LogOut, Users, Shield, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';
import { useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', adminOnly: false },
  { label: 'Editor', icon: FileEdit, href: '/editor', adminOnly: false },
  { label: 'Archives', icon: Database, href: '/archives', adminOnly: false },
  { label: 'All Users', icon: Users, href: '/users', adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, signOut, profile } = useAuth();
  const { isOpen, close } = useSidebar();
  
  // Filter nav items based on admin status
  const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [close]);
  
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
          flex flex-col w-[240px] border-r border-zinc-200/60
          h-full bg-[#fbfbfb] flex-shrink-0 transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-200/60">
          <span className="font-medium text-[13px]">Navigation</span>
          <button 
            onClick={close}
            aria-label="Close navigation menu"
            className="p-2 hover:bg-zinc-100/50 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150
                  ${isActive 
                    ? 'text-zinc-900 bg-zinc-100' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                  }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${isActive ? 'text-zinc-900' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
                {item.adminOnly && (
                  <Shield className="w-3 h-3 ml-auto text-purple-500" />
                )}
              </Link>
            );
          })}
        </nav>
      
        <div className="p-3 space-y-1 border-t border-zinc-200/60">
          {/* User Info */}
          {profile && (
            <div className="px-3 py-2 text-[11px] text-zinc-500">
              Signed in as <span className="font-medium text-zinc-700">{profile.email}</span>
            </div>
          )}
        
          {/* Logout */}
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-md text-zinc-500 hover:bg-red-50/50 hover:text-red-600 transition-colors text-[13px] font-medium"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

