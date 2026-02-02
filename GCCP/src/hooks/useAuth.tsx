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

  // Safety timeout - never stay loading for more than 10 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('[Auth] Loading timeout reached, forcing complete');
        setIsLoading(false);
      }
    }, 10000);
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string, sessionAccessToken?: string): Promise<Profile | null> => {
    try {
      log.debug('Fetching profile for user', { data: { userId, email: userEmail } });
      console.log('[Auth] Fetching profile for:', userId, userEmail);
      
      // Use direct REST API with timeout to avoid hanging
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('[Auth] Missing Supabase URL or Key:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey });
        return null;
      }
      
      // Use provided token or try to get from localStorage
      let accessToken = sessionAccessToken;
      console.log('[Auth] Access token provided:', !!accessToken);
      
      if (!accessToken) {
        // Try localStorage fallback - Supabase stores with project ref
        const projectRef = supabaseUrl.split('//')[1].split('.')[0];
        const storageKey = `sb-${projectRef}-auth-token`;
        console.log('[Auth] Trying localStorage key:', storageKey);
        
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          try {
            const parsed = JSON.parse(storedSession);
            accessToken = parsed.access_token;
            console.log('[Auth] Got token from localStorage');
          } catch (e) {
            console.error('[Auth] Failed to parse stored session');
          }
        }
      }
      
      if (!accessToken) {
        console.error('[Auth] No access token available');
        return null;
      }
      
      console.log('[Auth] Making REST API call to:', `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseKey!,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          }
        );
        
        clearTimeout(timeoutId);
        
        console.log('[Auth] REST API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Auth] Profile fetch HTTP error:', response.status, errorText);
          
          // If profile doesn't exist, create it
          if (response.status === 404 || errorText.includes('0 rows')) {
            return await createProfile(userId, userEmail, accessToken, supabaseUrl!, supabaseKey!);
          }
          return null;
        }
        
        const data = await response.json();
        console.log('[Auth] Profile query result:', data);
        
        if (!data || data.length === 0) {
          console.log('[Auth] No profile found, creating...');
          return await createProfile(userId, userEmail, accessToken, supabaseUrl!, supabaseKey!);
        }
        
        const profile = data[0] as Profile;
        console.log('[Auth] Profile fetched successfully:', profile);
        return profile;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('[Auth] Profile fetch timed out after 8 seconds');
        } else {
          console.error('[Auth] Profile fetch error:', fetchError);
        }
        return null;
      }
    } catch (err) {
      log.error('Unexpected error in fetchProfile', { data: err });
      console.error('[Auth] Unexpected fetch error:', err);
      return null;
    }
  }, [supabase]);

  const createProfile = async (
    userId: string, 
    userEmail: string | undefined, 
    accessToken: string,
    supabaseUrl: string,
    supabaseKey: string
  ): Promise<Profile | null> => {
    if (!userEmail) return null;
    
    console.log('[Auth] Creating new profile...');
    
    const newProfile = {
      id: userId,
      email: userEmail,
      role: 'user',
      credits: 0,
    };
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles`,
      {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(newProfile),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Auth] Profile creation failed:', response.status, errorText);
      
      // If profile already exists (conflict), try to fetch it again
      if (response.status === 409) {
        const retryResponse = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
          {
            method: 'GET',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return data[0] as Profile;
        }
      }
      return null;
    }
    
    const data = await response.json();
    console.log('[Auth] Profile created:', data);
    return (Array.isArray(data) ? data[0] : data) as Profile;
  };

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
        console.log('[Auth] Starting initialization...');
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          log.error('Session error', { data: sessionError });
          console.error('[Auth] Session error:', sessionError);
        }
        
        log.debug('Session', { data: { exists: !!currentSession } });
        console.log('[Auth] Session exists:', !!currentSession, currentSession?.user?.email);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          log.debug('Fetching profile for', { data: currentSession.user.email });
          console.log('[Auth] Fetching profile for user:', currentSession.user.id, currentSession.user.email);
          
          // Try fetching profile with retry - pass access token directly
          let profileData = await fetchProfile(
            currentSession.user.id, 
            currentSession.user.email || undefined,
            currentSession.access_token
          );
          
          // If profile is null, try once more after a short delay (race condition with trigger)
          if (!profileData) {
            console.log('[Auth] Profile not found on first try, retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            profileData = await fetchProfile(
              currentSession.user.id, 
              currentSession.user.email || undefined,
              currentSession.access_token
            );
          }
          
          log.debug('Profile result', { data: profileData });
          console.log('[Auth] Final profile result:', profileData);
          setProfile(profileData);
        }
      } catch (error) {
        log.error('Error initializing', { data: error });
        console.error('[Auth] Error initializing:', error);
      } finally {
        log.debug('Done loading');
        console.log('[Auth] Initialization complete');
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        log.debug('State changed', { data: event });
        console.log('[Auth] onAuthStateChange:', event, 'hasSession:', !!newSession);
        
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Pass the access token directly from the session
          const profileData = await fetchProfile(
            newSession.user.id, 
            newSession.user.email || undefined,
            newSession.access_token
          );
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
    log.info('Signing out...');
    
    try {
      // Clear local state first to ensure UI updates immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Clear any local storage items
      if (typeof window !== 'undefined') {
        localStorage.removeItem('generation-storage');
        localStorage.removeItem('gccp-draft');
      }
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        log.error('Sign out error', { data: error });
        // Even if there's an error, we've cleared local state, so continue with redirect
      } else {
        log.info('Successfully signed out from Supabase');
      }
    } catch (err) {
      log.error('Unexpected sign out error', { data: err });
    } finally {
      // Always redirect to login regardless of errors
      window.location.href = '/login';
    }
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
