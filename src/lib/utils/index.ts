import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as USD currency
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return "$0.00";
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count with K/M suffix
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toString();
}

/**
 * Format elapsed time from milliseconds
 */
export function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convert questions array to CSV string
 */
export function questionsToCSV(
  questions: Array<{
    type: string;
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctAnswer: string;
    explanation: string;
  }>
): string {
  const headers = ["Type", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Explanation"];
  const rows = questions.map((q) => [
    q.type,
    q.question,
    q.optionA,
    q.optionB,
    q.optionC,
    q.optionD,
    q.correctAnswer,
    q.explanation,
  ]);

  const escape = (s: string) => {
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  return [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Hash a string (simple, for cache keys)
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Clean and format a raw transcript string.
 *
 * - Strips SRT/VTT timestamps (e.g. "00:01:23,456 --> 00:01:25,789")
 * - Strips SRT sequence numbers (standalone digits on a line)
 * - Strips VTT header ("WEBVTT" line)
 * - Removes speaker labels (e.g. "SPEAKER 1:", "[Speaker]:")
 * - Removes markers like [inaudible], [music], [applause], etc.
 * - Collapses multiple blank lines into single paragraph breaks
 * - Trims leading/trailing whitespace
 */
export function formatTranscript(raw: string): string {
  let text = raw;

  // Remove WEBVTT header line
  text = text.replace(/^WEBVTT[^\n]*\n?/m, '');

  // Remove SRT/VTT timestamps: "00:01:23,456 --> 00:01:25,789" or with dots
  text = text.replace(/\d{1,2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[.,]\d{3}[^\n]*/g, '');

  // Remove simpler timestamps like "00:01:23 --> 00:01:25"
  text = text.replace(/\d{1,2}:\d{2}:\d{2}\s*-->\s*\d{1,2}:\d{2}:\d{2}[^\n]*/g, '');

  // Remove VTT cue identifiers (lines that are just numbers, possibly with dashes/dots)
  text = text.replace(/^\d+\s*$/gm, '');

  // Remove speaker labels: "SPEAKER 1:", "[Speaker]:", "Speaker 1:", etc.
  text = text.replace(/^\[?(?:speaker|narrator|interviewer|host)\s*\d*\]?\s*:/gim, '');

  // Remove bracketed markers: [inaudible], [music], [applause], [laughter], etc.
  text = text.replace(/\[(?:inaudible|music|applause|laughter|silence|crosstalk|background noise|pause|sigh|cough)[^\]]*\]/gi, '');

  // Remove angle-bracket tags from VTT: <c>, </c>, <v Speaker>, etc.
  text = text.replace(/<[^>]+>/g, '');

  // Collapse multiple blank lines into a single blank line (paragraph break)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Collapse lines that are only whitespace
  text = text.replace(/^\s+$/gm, '');

  // Final collapse of multiple blank lines again after cleanup
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Export the current page as a PDF via the browser print dialog.
 *
 * Temporarily adds a `printing` class to `<body>` so the print stylesheet
 * can hide non-content UI (sidebar, navbar, toolbar, etc.) and show only
 * the markdown preview area. The class is removed after a short delay to
 * ensure the print dialog has fully opened before cleanup.
 */
export function exportToPDF(): void {
  document.body.classList.add("printing");
  window.print();
  // The `afterprint` event fires once the dialog closes (print or cancel).
  // We also set a fallback timeout for browsers that don't fire the event.
  const cleanup = () => {
    document.body.classList.remove("printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup, { once: true });
  // Fallback: remove the class after 3 seconds in case `afterprint` never fires
  setTimeout(cleanup, 3000);
}
