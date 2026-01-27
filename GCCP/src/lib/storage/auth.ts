import { User } from '@/types/user';
import { log } from '@/lib/utils/env-logger';

interface Session {
  user: User;
  createdAt: number;
  expiresAt: number;
}

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * @deprecated This AuthManager is deprecated. Use Supabase auth via useAuth hook instead.
 * Kept for backward compatibility during migration.
 */
export class AuthManager {
  private static STORAGE_KEY = 'edu_auth_session';

  /**
   * @deprecated Use Supabase auth instead
   * User login - This method is disabled for security
   */
  static login(_username: string, _password: string): User | null {
    log.warn('AuthManager.login is deprecated. Use Supabase auth instead.');
    return null;
  }

  /**
   * Logout - clears session and redirects to login
   */
  static logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      // Clear other storage
      localStorage.removeItem('generation-storage');
      localStorage.removeItem('gccp-draft');
      localStorage.removeItem('theme');
      window.location.href = '/login';
    }
  }

  /**
   * Get current user if session is valid
   */
  static getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      const session: Session = JSON.parse(data);

      // Check if session has expired
      if (Date.now() > session.expiresAt) {
        console.log('[Auth] Session expired');
        this.logout();
        return null;
      }

      return session.user;
    } catch (e) {
      console.error('[Auth] Error reading session:', e);
      return null;
    }
  }

  /**
   * Check if session is valid
   */
  static isSessionValid(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Get session info
   */
  static getSessionInfo(): { expiresIn: number; createdAt: number } | null {
    if (typeof window === 'undefined') return null;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return null;

      const session: Session = JSON.parse(data);
      return {
        expiresIn: Math.max(0, session.expiresAt - Date.now()),
        createdAt: session.createdAt
      };
    } catch {
      return null;
    }
  }

  /**
   * Extend session by refreshing expiry
   */
  static refreshSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return;

      const session: Session = JSON.parse(data);
      session.expiresAt = Date.now() + SESSION_DURATION_MS;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('[Auth] Error refreshing session:', e);
    }
  }

  /**
   * Update user data in session
   */
  static updateUser(user: User): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return;

      const session: Session = JSON.parse(data);
      session.user = user;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.error('[Auth] Error updating user:', e);
    }
  }

  // Stub methods for compatibility (Users page is legacy)
  static getAllUsers(): User[] {
    const current = this.getCurrentUser();
    return current ? [current] : [];
  }

  static createUser(username: string, _role: string): { username: string; password: string } {
    console.warn('User creation is disabled. Only admin login is supported.');
    return { username, password: 'disabled' };
  }
}

