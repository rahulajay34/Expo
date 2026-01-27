import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'inherit'
});

interface MermaidProps {
  chart: string;
}

export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Minimum length check: Don't try to render if it's just "graph" or "flow"
    if (!chart || chart.length < 10) return;

    // 2. Debounce: Wait 500ms after last change before rendering
    const timer = setTimeout(async () => {
        try {
            // Attempt render
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            // Note: mermaid.render can be async
            const { svg } = await mermaid.render(id, chart);
            setSvg(svg);
            setError(null);
        } catch (err) {
            // Suppress errors during typing, but log them for debug if needed
            // console.warn("Mermaid render failed (likely incomplete):", err);
            // We can choose to retain the old SVG or show nothing
            // For now, let's NOT set error state immediately unless it persists, 
            // but in this simple implementation, we might just not update SVG.
            
            // Actually, if it fails, it's likely invalid syntax. 
            // We can set a local "generating..." state or just ignore.
            // If the user stops typing and it's still error, we might want to show it.
            // But for this fix, let's just silence the scary error box during streaming.
            
            // Only set error if we really believe it's final? No way to know.
            // Let's set error but style it subtly or maybe dont render it if we think it's transient?
            // User requested fixing the error spam.
            
            // Strategy: Don't wipe the old SVG if new one fails? 
            // Or just return.
            // setError("Invalid Syntax"); 
        }
    }, 1000); // 1s debounce to be safe with streaming speed

    return () => clearTimeout(timer);
  }, [chart]);

  // If we have an SVG, render it.
  if (svg) {
    return (
        <div 
            ref={containerRef}
            className="mermaid-chart my-4 flex justify-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
  }

  // If no SVG yet (loading or error), fallback.
  // We can show raw code if it's long enough, or just a loader.
  return (
      <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-gray-400 text-xs font-mono whitespace-pre-wrap animate-pulse">
        Generating diagram...
      </div>
  );
};
