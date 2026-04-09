'use client';

import { useEffect, useState } from 'react';

// S-020: Singleton promise — mermaid is loaded once for the lifetime of the module,
// regardless of how many MermaidChart instances are mounted.
let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
function getMermaid(): Promise<typeof import('mermaid')> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid');
  }
  return mermaidPromise;
}

/**
 * Muted crayon palette — always uses white/off-white background with
 * soft pastel node fills and high-contrast dark text so every diagram
 * is readable regardless of the page theme.
 */
export const MERMAID_THEME_VARS = {
  darkMode: false,
  background: 'transparent',
  // Primary nodes — muted lavender
  primaryColor: '#E8E0F0',
  primaryTextColor: '#2D2235',
  primaryBorderColor: '#C4B5D4',
  // Secondary nodes — muted sage
  secondaryColor: '#DDE8D8',
  secondaryTextColor: '#2A3328',
  secondaryBorderColor: '#B5C9AD',
  // Tertiary nodes — muted peach
  tertiaryColor: '#F0E4D8',
  tertiaryTextColor: '#3A2E24',
  tertiaryBorderColor: '#D4C0AB',
  // Edges & text
  lineColor: '#8E8E93',
  textColor: '#1D1D1F',
  fontSize: '14px',
  // Node defaults
  nodeBorder: '#C4B5D4',
  mainBkg: '#E8E0F0',
  nodeTextColor: '#1D1D1F',
  // Clusters
  clusterBkg: '#F5F5F7',
  clusterBorder: '#D1D1D6',
  // Misc
  titleColor: '#1D1D1F',
  edgeLabelBackground: 'transparent',
  noteBkgColor: '#FFF8E1',
  noteTextColor: '#33302B',
  noteBorderColor: '#E8D5A3',
};

function downloadSvgAsPng(svgHtml: string, filename: string) {
  // Parse SVG, force white background and extract dimensions
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  // Ensure white background rect exists
  const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#FFFFFF');
  svgEl.insertBefore(bgRect, svgEl.firstChild);

  // Read dimensions
  const vb = svgEl.getAttribute('viewBox');
  let width = parseFloat(svgEl.getAttribute('width') || '800');
  let height = parseFloat(svgEl.getAttribute('height') || '600');
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4) { width = parts[2]; height = parts[3]; }
  }

  const scale = 2; // retina
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  // Use a data URI instead of blob URL to avoid tainting the canvas
  const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = dataUri;
}

function downloadSvgFile(svgHtml: string, filename: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  // Force white background
  const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#FFFFFF');
  svgEl.insertBefore(bgRect, svgEl.firstChild);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // S-020: Use module-scope singleton to avoid redundant network loads when
  // multiple MermaidChart instances are mounted simultaneously.
  useEffect(() => {
    if (!chart) return;
    let isMounted = true;

    async function renderChart() {
      setLoading(true);
      let mermaidModule: typeof import('mermaid');
      try {
        mermaidModule = await getMermaid();
      } catch {
        if (isMounted) setLoading(false);
        return;
      }

      const id = `mermaid-chart-${Date.now()}-${crypto.randomUUID()}`;
      try {
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mermaidModule.default.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: MERMAID_THEME_VARS,
          ...(({ suppressErrors: true }) as Record<string, unknown>),
        });
        const { svg: svgCode } = await mermaidModule.default.render(id, chart);
        if (isMounted) {
          // Trim excessive padding mermaid bakes into the SVG:
          // 1. Strip inline max-width/height so CSS controls sizing
          // 2. Tighten viewBox padding (mermaid adds ~50px on each side)
          const trimmed = svgCode
            .replace(/style="[^"]*"/i, (match) =>
              match.replace(/max-width:\s*[\d.]+px;?\s*/g, '').replace(/height:\s*[\d.]+px;?\s*/g, '')
            )
            .replace(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/, (_m, x, y, w, h) => {
              const pad = 8;
              const nx = parseFloat(x) + pad;
              const ny = parseFloat(y) + pad;
              const nw = Math.max(0, parseFloat(w) - pad * 2);
              const nh = Math.max(0, parseFloat(h) - pad * 2);
              return `viewBox="${nx} ${ny} ${nw} ${nh}"`;
            });
          setSvg(trimmed);
        }
      } catch (err) {
        // Remove any leftover mermaid error elements injected into the DOM
        document.getElementById(id)?.remove();
        document.querySelectorAll('.error-icon').forEach(el => el.closest('div')?.remove());
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to render diagram';
          // Strip mermaid's verbose prefixes, keep the useful part
          const cleaned = msg.replace(/^(Parse error|Syntax error) on line \d+.*\n?/i, '').trim() || msg;
          setError(cleaned);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    renderChart();
    return () => { isMounted = false; };
  }, [chart]);

  if (error) {
    return (
      <div className="my-6 overflow-x-auto">
        <div className="text-xs text-danger border border-danger/20 bg-danger/5 px-3 py-2 rounded-t font-medium">
          Diagram error — {error}
        </div>
        <pre
          title={error}
          className="text-xs p-3 bg-sidebar rounded-b border border-t-0 border-border overflow-x-auto max-h-48"
        >
          <code className="text-text-secondary whitespace-pre-wrap">{chart}</code>
        </pre>
      </div>
    );
  }

  if (loading || !svg) {
    return <div className="my-6 flex justify-center overflow-x-auto">
      <div className="text-xs text-text-secondary p-4">Loading diagram...</div>
    </div>;
  }

  const filenameSlug = chart.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '') || 'diagram';

  return (
    <div className="mermaid-container my-4 relative group/mermaid">
      <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      {/* Download toolbar */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/mermaid:opacity-100 transition-opacity">
        <button
          onClick={() => downloadSvgAsPng(svg, filenameSlug)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
          title="Download as PNG"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PNG
        </button>
        <button
          onClick={() => downloadSvgFile(svg, filenameSlug)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
          title="Download as SVG"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          SVG
        </button>
      </div>
    </div>
  );
}
