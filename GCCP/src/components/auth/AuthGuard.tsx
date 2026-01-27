'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    // Skip check for login and auth callback pages
    if (pathname === '/login' || pathname.startsWith('/auth/')) return;

    // Still loading - don't redirect yet
    if (isLoading) return;

    // No user - redirect to login
    if (!user) {
      router.push('/login');
      return;
    }

    // Requires admin but user is not admin
    if (requireAdmin && !isAdmin) {
      router.push('/');
      return;
    }
  }, [user, isLoading, isAdmin, pathname, router, requireAdmin]);

  // Allow login and auth callback pages without any check
  if (pathname === '/login' || pathname.startsWith('/auth/')) {
    return <>{children}</>;
  }

  // Show loading state only while loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - will redirect
  if (!user) {
    return null;
  }

  // Requires admin but user is not admin - will redirect
  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Wrapper for admin-only routes
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  return <AuthGuard requireAdmin>{children}</AuthGuard>;
}
