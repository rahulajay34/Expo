/**
 * Waits for all Mermaid diagrams within a container to finish rendering.
 *
 * MermaidChart components render asynchronously: they lazy-load the mermaid
 * module then call mermaid.render().  While loading, a placeholder with text
 * "Loading diagram..." is shown.  Once rendered, the placeholder is replaced
 * by a `.mermaid-container` div holding the SVG.
 *
 * This function polls the container until no loading placeholders remain, or
 * until the timeout expires.
 */
export function waitForMermaidDiagrams(
  container: HTMLElement,
  timeoutMs = 10_000,
): Promise<void> {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    function check() {
      // Look for any remaining "Loading diagram..." placeholders.
      // These are wrapper divs that do NOT have the .mermaid-container class.
      const loadingPlaceholders = container.querySelectorAll('.my-6.flex.justify-center');
      const stillLoading = Array.from(loadingPlaceholders).some(
        (el) =>
          !el.classList.contains('mermaid-container') &&
          el.textContent?.includes('Loading diagram'),
      );

      if (!stillLoading || Date.now() > deadline) {
        resolve();
        return;
      }

      requestAnimationFrame(check);
    }

    check();
  });
}
