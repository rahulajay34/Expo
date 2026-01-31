'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { Profile } from '@/types/database';
import { authLog as log } from '@/lib/utils/env-logger';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initAttempted, setInitAttempted] = useState(false);

  const supabase = getSupabaseClient();

  // Safety timeout - never stay loading for more than 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Auth] Loading timeout reached, forcing complete');
        setIsLoading(false);
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      log.error('Error fetching profile', { data: error });
      
      // If profile doesn't exist (PGRST116 = no rows), create it
      if (error.code === 'PGRST116' && userEmail) {
        log.info('Profile not found, creating one...');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newProfile, error: insertError } = await (supabase as any)
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            role: 'user',
            credits: 100,
          })
          .select()
          .single();
        
        if (insertError) {
          log.error('Error creating profile', { data: insertError });
          return null;
        }
        return newProfile;
      }
      return null;
    }
    return data;
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const profileData = await fetchProfile(user.id, user.email || undefined);
      setProfile(profileData);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    // Initial session check
    const initializeAuth = async () => {
      try {
        log.debug('Initializing auth...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          log.error('Session error', { data: sessionError });
        }
        
        log.debug('Session', { data: { exists: !!currentSession } });
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          log.debug('Fetching profile for', { data: currentSession.user.email });
          const profileData = await fetchProfile(currentSession.user.id, currentSession.user.email || undefined);
          log.debug('Profile result', { data: profileData });
          setProfile(profileData);
        }
      } catch (error) {
        log.error('Error initializing', { data: error });
      } finally {
        log.debug('Done loading');
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        log.debug('State changed', { data: event });
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const profileData = await fetchProfile(newSession.user.id, newSession.user.email || undefined);
          setProfile(profileData);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      log.error('Google sign-in error', { data: error });
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      log.error('Sign out error', { data: error });
      throw error;
    }

    // Clear local state
    setUser(null);
    setProfile(null);
    setSession(null);

    // Redirect to login
    window.location.href = '/login';
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAdmin: profile?.role === 'admin',
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has specific role
 */
export function useRole(requiredRole: 'admin' | 'user') {
  const { profile, isLoading } = useAuth();
  
  if (isLoading) return { hasRole: false, isLoading: true };
  if (!profile) return { hasRole: false, isLoading: false };
  
  const hasRole = requiredRole === 'user' || profile.role === 'admin';
  return { hasRole, isLoading: false };
}
