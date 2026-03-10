// =============================================================================
// GCCP — Gemini Client Setup
// Singleton wrapper around the Google Generative AI SDK
// =============================================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

/**
 * Returns a singleton GoogleGenerativeAI instance.
 * Reads the API key from the GEMINI_API_KEY environment variable.
 * Throws if the key is not configured.
 */
export function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Returns a GenerativeModel instance for the given model name.
 * Defaults to gemini-2.5-flash for fast, cost-efficient generation.
 */
export function getModel(modelName: string = 'gemini-2.5-flash') {
  return getGenAI().getGenerativeModel({ model: modelName });
}
