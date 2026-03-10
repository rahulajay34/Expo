'use client';

import { useCallback, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'gccp-notifications-enabled';
const DEFAULT_TITLE = 'GCCP \u2014 Course Content Generator';

// ---------------------------------------------------------------------------
// Notification Preference (localStorage)
// ---------------------------------------------------------------------------

/** Read the user's notification preference from localStorage. */
export function getNotificationPreference(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

/** Persist the user's notification preference to localStorage. */
export function setNotificationPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // localStorage may be unavailable in some contexts
  }
}

/** Return the current Notification permission state, or 'unsupported'. */
export function getPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/** Request browser Notification permission. Returns the resulting permission. */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  return result;
}

/**
 * Send a desktop notification if permission is granted and the user has
 * opted in via their stored preference.
 */
export function sendNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (!getNotificationPreference()) return;

  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'gccp-generation', // collapse duplicate notifications
    });
  } catch {
    // Notification constructor can throw in some environments
  }
}

// ---------------------------------------------------------------------------
// useDocumentTitle — reactively updates document.title
// ---------------------------------------------------------------------------

/**
 * Updates `document.title` whenever `title` changes.
 * Restores the default title on unmount.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}

// ---------------------------------------------------------------------------
// useTemporaryTitle — set a title that reverts after a timeout
// ---------------------------------------------------------------------------

/**
 * Returns a function that sets a temporary document title, then reverts to
 * the default after `durationMs` (default 5000ms).
 */
export function useTemporaryTitle() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTemporaryTitle = useCallback((title: string, durationMs = 5000) => {
    if (typeof document === 'undefined') return;

    // Clear any existing revert timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    document.title = title;

    timerRef.current = setTimeout(() => {
      document.title = DEFAULT_TITLE;
      timerRef.current = null;
    }, durationMs);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return setTemporaryTitle;
}

export { DEFAULT_TITLE };
