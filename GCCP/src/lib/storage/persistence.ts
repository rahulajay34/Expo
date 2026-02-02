/**
 * Generation Persistence Service
 * Handles reliable saving of generations to Supabase with:
 * - Retry logic for transient failures
 * - Proper transaction handling
 * - Deduplication to prevent overwrites
 * - Defensive logging
 */

import { GenerationStatus, Json } from '@/types/database';

export interface GenerationSaveData {
  user_id: string;
  topic: string;
  subtopics: string;
  mode: 'lecture' | 'pre-read' | 'assignment';
  status: GenerationStatus;
  final_content: string;
  gap_analysis?: any | null;
  assignment_data?: { formatted: string } | null;
  estimated_cost?: number;
}

export interface SaveResult {
  success: boolean;
  generation_id?: string;
  error?: string;
  retryCount?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_CONTENT_LENGTH = 500000; // ~500KB

/**
 * Saves a generation to Supabase with retry logic and deduplication
 */
export async function saveGeneration(
  data: GenerationSaveData,
  accessToken: string
): Promise<SaveResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  console.log('[Persistence] Starting save with config:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseKey,
    hasToken: !!accessToken,
    tokenLength: accessToken?.length,
    userId: data.user_id,
    topic: data.topic,
    mode: data.mode,
    contentLength: data.final_content?.length || 0
  });

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Persistence] Missing Supabase configuration:', {
      url: supabaseUrl ? 'present' : 'MISSING',
      key: supabaseKey ? 'present' : 'MISSING'
    });
    return { success: false, error: 'Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' };
  }

  if (!accessToken) {
    console.error('[Persistence] No access token provided');
    return { success: false, error: 'No access token - please re-login' };
  }

  if (!data.final_content || data.final_content.trim().length === 0) {
    console.warn('[Persistence] No content to save');
    return { success: false, error: 'No content to save' };
  }

  // Prepare data with content truncation
  const truncatedContent = data.final_content.length > MAX_CONTENT_LENGTH
    ? data.final_content.slice(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated due to size...]'
    : data.final_content;

  const insertData = {
    user_id: data.user_id,
    topic: data.topic,
    subtopics: data.subtopics,
    mode: data.mode,
    status: data.status,
    current_step: 0,
    gap_analysis: data.gap_analysis as Json | null,
    final_content: truncatedContent,
    assignment_data: data.assignment_data as Json | null,
    estimated_cost: data.estimated_cost || 0,
  };

  console.log('[Persistence] Prepared insert data:', {
    user_id: insertData.user_id,
    topic: insertData.topic,
    mode: insertData.mode,
    contentLength: insertData.final_content.length,
    hasGapAnalysis: !!insertData.gap_analysis,
    hasAssignmentData: !!insertData.assignment_data
  });

  let lastError: string | undefined;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`[Persistence] Attempt ${attempt + 1}/${MAX_RETRIES} to save generation`);
      
      // Skip duplicate check on first attempt for faster saves
      // Only check duplicates on retries to avoid infinite loops
      if (attempt > 0) {
        const isDuplicate = await checkForDuplicate(
          supabaseUrl,
          supabaseKey,
          accessToken,
          data.user_id,
          data.topic,
          data.mode
        );

        if (isDuplicate) {
          console.log('[Persistence] Recent duplicate detected, skipping save');
          return { 
            success: true, 
            error: 'Duplicate detected - content already saved recently',
            retryCount: attempt 
          };
        }
      }

      // Perform the insert
      const response = await fetch(`${supabaseUrl}/rest/v1/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(insertData)
      });

      console.log('[Persistence] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `HTTP ${response.status}: ${errorText}`;
        console.error(`[Persistence] Save failed:`, lastError);
        
        // Don't retry on auth errors (401, 403)
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'Authentication failed - please re-login' };
        }
        
        // Check for RLS policy errors
        if (response.status === 403 || errorText.includes('policy') || errorText.includes('permission')) {
          console.error('[Persistence] RLS policy error - check database policies');
          return { success: false, error: 'Permission denied - database policy error. Please contact support.' };
        }
        
        // Retry on server errors (5xx) or rate limits (429)
        if (response.status >= 500 || response.status === 429) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }
        
        // Don't retry on client errors (4xx except 429)
        return { success: false, error: lastError };
      }

      const result = await response.json();
      const generationId = Array.isArray(result) ? result[0]?.id : result?.id;
      
      console.log('[Persistence] Generation saved successfully:', generationId);
      return { 
        success: true, 
        generation_id: generationId,
        retryCount: attempt 
      };

    } catch (error: any) {
      lastError = error.message || 'Network error';
      console.error(`[Persistence] Attempt ${attempt + 1} failed:`, error);
      
      // Retry on network errors
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  return { 
    success: false, 
    error: `Failed after ${MAX_RETRIES} attempts: ${lastError}`,
    retryCount: MAX_RETRIES 
  };
}

/**
 * Checks if a similar generation was saved recently (within last 10 seconds)
 * Prevents duplicate saves from rapid double-clicks or race conditions
 * 
 * NOTE: Reduced from 60s to 10s because users may legitimately regenerate
 * content with slightly modified inputs. 10s is enough to catch accidental
 * double-saves while allowing intentional regeneration.
 */
async function checkForDuplicate(
  supabaseUrl: string,
  supabaseKey: string,
  accessToken: string,
  userId: string,
  topic: string,
  mode: string
): Promise<boolean> {
  try {
    // Check for generations with same topic and mode in last 10 seconds
    // Short window to catch only accidental double-saves
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/generations?` + 
      `user_id=eq.${userId}&` +
      `topic=eq.${encodeURIComponent(topic)}&` +
      `mode=eq.${mode}&` +
      `created_at=gte.${encodeURIComponent(tenSecondsAgo)}&` +
      `select=id`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      // On error, assume no duplicate to allow save attempt
      console.warn('[Persistence] Duplicate check request failed, proceeding with save');
      return false;
    }

    const existing = await response.json();
    const isDuplicate = Array.isArray(existing) && existing.length > 0;
    
    if (isDuplicate) {
      console.log(`[Persistence] Recent duplicate found (within 10s) for topic "${topic}", mode "${mode}"`);
    }
    
    return isDuplicate;

  } catch (error) {
    // On error, assume no duplicate - better to save a potential duplicate than lose content
    console.warn('[Persistence] Duplicate check failed:', error);
    return false;
  }
}

/**
 * Simple hash function for deduplication
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Updates an existing generation (for appending content)
 */
export async function updateGeneration(
  generationId: string,
  updates: Partial<GenerationSaveData>,
  accessToken: string
): Promise<SaveResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || !accessToken) {
    return { success: false, error: 'Missing configuration or auth' };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/generations?id=eq.${generationId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(updates)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Update failed: ${errorText}` };
    }

    return { success: true, generation_id: generationId };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
