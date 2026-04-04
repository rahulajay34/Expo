/**
 * View Transitions API utility for card-to-page morphing.
 *
 * Wraps Next.js App Router navigation in `document.startViewTransition()`
 * so that elements with matching `view-transition-name` values morph
 * smoothly between the old and new DOM snapshots.
 *
 * Falls back to plain navigation on browsers without support.
 */

/** Whether the current browser supports the View Transitions API */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Navigate with a view transition if supported.
 *
 * @param navigate - The callback that triggers the actual DOM change
 *   (e.g. `() => router.push('/content/abc')`). With Next.js App Router
 *   this returns a Promise but the DOM update is batched by React —
 *   `startViewTransition` captures the snapshot before `navigate` runs
 *   and waits for the new DOM to paint.
 */
export function navigateWithTransition(navigate: () => void): void {
  if (supportsViewTransitions()) {
    (document as Document & { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
      navigate();
    });
  } else {
    navigate();
  }
}

/**
 * Generate a unique `view-transition-name` scoped to a content item.
 *
 * CSS `view-transition-name` must be unique across the page. Since the
 * library page renders multiple cards simultaneously, each card element
 * gets a name that includes the content item's ID.
 *
 * @param element - Semantic element name (e.g. 'card', 'title', 'badge')
 * @param id - Content item ID
 */
export function vtName(element: string, id: string): string {
  return `content-${element}-${id}`;
}
