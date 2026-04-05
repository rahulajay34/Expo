'use client';

import { useEffect, useState } from 'react';

interface AmbientLinesProps {
  className?: string;
}

/* ── Static data ───────────────────────────────────────────────────── */

const NODES = [
  { x: 200, y: 180, r: 5 },
  { x: 600, y: 140, r: 4.5 },
  { x: 1000, y: 200, r: 5 },
  { x: 400, y: 500, r: 4.5 },
  { x: 800, y: 520, r: 5 },
];

const CONNECTIONS = [
  [0, 1], [1, 2], [0, 3], [1, 4], [3, 4],
];

const CURVES: { a: number; b: number; bend: number }[] = [
  { a: 0, b: 2, bend: -50 },
  { a: 3, b: 2, bend: 40 },
];

const DOCUMENTS = [
  { x: 150, y: 350, w: 64, h: 80, rot: -8, dur: 14, dist: 8 },
  { x: 1050, y: 380, w: 58, h: 72, rot: 5, dur: 16, dist: 7 },
  { x: 600, y: 750, w: 60, h: 76, rot: -5, dur: 18, dist: 9 },
];

const PARTICLES = [
  { cx: 120, cy: 120, r: 1.8, dur: 30, dx: 50, dy: -20 },
  { cx: 1080, cy: 300, r: 1.5, dur: 35, dx: -40, dy: 30 },
  { cx: 500, cy: 800, r: 1.8, dur: 32, dx: 35, dy: -50 },
];

const HEXAGONS = [
  { cx: 350, cy: 350, size: 30, dur: 90 },
  { cx: 900, cy: 600, size: 26, dur: 80 },
];

const CROSSHAIRS = [
  { x: 600, y: 420, size: 10 },
  { x: 250, y: 650, size: 8 },
];

function hexPoints(cx: number, cy: number, size: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');
}

function curvePath(ax: number, ay: number, bx: number, by: number, bend: number): string {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len;
  const ny = dx / len;
  return `M${ax},${ay} Q${mx + nx * bend},${my + ny * bend} ${bx},${by}`;
}

/* ── Component ─────────────────────────────────────────────────────── */

export function AmbientLines({ className }: AmbientLinesProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const check = () => setIsDark(root.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const p = isDark
    ? {
        node: 'rgba(107,163,232,0.4)',
        nodeGlow: 'rgba(107,163,232,0.15)',
        line: 'rgba(107,163,232,0.1)',
        curve: 'rgba(107,163,232,0.07)',
        docStroke: 'rgba(255,255,255,0.05)',
        docFill: 'rgba(255,255,255,0.012)',
        textLine: 'rgba(255,255,255,0.035)',
        hex: '#fff',
        particle: 'rgba(107,163,232,0.3)',
        cross: 'rgba(255,255,255,0.04)',
        ring: 'rgba(107,163,232,0.06)',
        orbitStroke: 'rgba(107,163,232,0.04)',
        orbitDot: 'rgba(107,163,232,0.5)',
        hexOp: 0.05,
      }
    : {
        node: 'rgba(35,131,226,0.35)',
        nodeGlow: 'rgba(35,131,226,0.12)',
        line: 'rgba(35,131,226,0.12)',
        curve: 'rgba(35,131,226,0.08)',
        docStroke: 'rgba(55,53,47,0.09)',
        docFill: 'rgba(55,53,47,0.025)',
        textLine: 'rgba(55,53,47,0.06)',
        hex: '#37352F',
        particle: 'rgba(35,131,226,0.25)',
        cross: 'rgba(55,53,47,0.06)',
        ring: 'rgba(35,131,226,0.08)',
        orbitStroke: 'rgba(35,131,226,0.07)',
        orbitDot: 'rgba(35,131,226,0.5)',
        hexOp: 0.07,
      };

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <svg
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* ─── Network connections (straight) ─── */}
        {CONNECTIONS.map(([a, b], i) => (
          <line
            key={`c${i}`}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke={p.line} strokeWidth="1.2" strokeDasharray="4,6"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="10" dur={`${8 + (i % 3) * 2}s`} repeatCount="indefinite" />
          </line>
        ))}

        {/* ─── Network connections (curved) ─── */}
        {CURVES.map((cv, i) => (
          <path
            key={`cv${i}`}
            d={curvePath(NODES[cv.a].x, NODES[cv.a].y, NODES[cv.b].x, NODES[cv.b].y, cv.bend)}
            fill="none" stroke={p.curve} strokeWidth="1" strokeDasharray="6,8"
          >
            <animate attributeName="stroke-dashoffset" from="0" to="14" dur={`${10 + i * 2}s`} repeatCount="indefinite" />
          </path>
        ))}

        {/* ─── Network nodes ─── */}
        {NODES.map((n, i) => (
          <g key={`n${i}`}>
            {isDark && (
              <circle cx={n.x} cy={n.y} r={n.r * 3} fill={p.nodeGlow}>
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur={`${8 + (i % 3) * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={n.x} cy={n.y} r={n.r} fill={p.node}>
              <animate attributeName="r" values={`${n.r};${n.r + 1.5};${n.r}`} dur={`${8 + (i % 3) * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;1;0.5" dur={`${8 + (i % 3) * 2}s`} begin={`${i * 0.8}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}

        {/* ─── Orbital ring ─── */}
        <ellipse cx="600" cy="420" rx="300" ry="150" fill="none"
          stroke={p.orbitStroke} strokeWidth="1" strokeDasharray="6,8"
          transform="rotate(-5,600,420)"
        />
        <circle r="4" fill={p.orbitDot} opacity="0.8">
          <animateMotion dur="50s" repeatCount="indefinite"
            path="M300,420 a300,150 0 1,0 600,0 a300,150 0 1,0 -600,0" />
        </circle>

        {/* ─── Floating documents ─── */}
        {DOCUMENTS.map((d, i) => (
          <g key={`d${i}`}>
            <animateTransform
              attributeName="transform" type="translate"
              values={`0,0;0,${-d.dist};0,0`}
              dur={`${d.dur}s`} repeatCount="indefinite"
            />
            <g transform={`translate(${d.x},${d.y}) rotate(${d.rot})`}>
              <rect x={-d.w / 2} y={-d.h / 2} width={d.w} height={d.h} rx="6"
                fill={p.docFill} stroke={p.docStroke} strokeWidth="1" />
              <path
                d={`M${d.w / 2 - 12},${-d.h / 2} L${d.w / 2},${-d.h / 2 + 12}`}
                fill="none" stroke={p.docStroke} strokeWidth="0.8"
              />
              {[0.28, 0.42, 0.56, 0.70].map((pct, li) => (
                <line key={li}
                  x1={-d.w / 2 + 7} y1={-d.h / 2 + d.h * pct}
                  x2={-d.w / 2 + 7 + (d.w - 14) * (li === 3 ? 0.45 : li === 1 ? 0.75 : 0.88)}
                  y2={-d.h / 2 + d.h * pct}
                  stroke={p.textLine} strokeWidth="1.5" strokeLinecap="round"
                />
              ))}
            </g>
          </g>
        ))}

        {/* ─── Cross-hair marks ─── */}
        {CROSSHAIRS.map((ch, i) => (
          <g key={`ch${i}`} stroke={p.cross} strokeWidth="0.6" opacity="0.8">
            <line x1={ch.x - ch.size} y1={ch.y} x2={ch.x + ch.size} y2={ch.y} />
            <line x1={ch.x} y1={ch.y - ch.size} x2={ch.x} y2={ch.y + ch.size} />
            <circle cx={ch.x} cy={ch.y} r={ch.size * 0.6} fill="none" />
          </g>
        ))}

        {/* ─── Hexagonal accents ─── */}
        {HEXAGONS.map((h, i) => (
          <g key={`h${i}`}>
            <polygon
              points={hexPoints(h.cx, h.cy, h.size)}
              fill="none" stroke={p.hex} strokeWidth="0.6" opacity={p.hexOp}
            >
              <animateTransform attributeName="transform" type="rotate"
                values={`0,${h.cx},${h.cy};360,${h.cx},${h.cy}`}
                dur={`${h.dur}s`} repeatCount="indefinite" />
            </polygon>
            <polygon
              points={hexPoints(h.cx, h.cy, h.size * 0.55)}
              fill="none" stroke={p.hex} strokeWidth="0.4" opacity={p.hexOp * 0.6}
            >
              <animateTransform attributeName="transform" type="rotate"
                values={`360,${h.cx},${h.cy};0,${h.cx},${h.cy}`}
                dur={`${h.dur * 1.3}s`} repeatCount="indefinite" />
            </polygon>
          </g>
        ))}

        {/* ─── Particles ─── */}
        {PARTICLES.map((pt, i) => (
          <circle key={`p${i}`} cx={pt.cx} cy={pt.cy} r={pt.r} fill={p.particle}>
            <animateTransform attributeName="transform" type="translate"
              values={`0,0;${pt.dx},${pt.dy};0,0`} dur={`${pt.dur}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.12;0.5;0.12" dur={`${pt.dur}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* ─── Decorative rings ─── */}
        <circle cx="150" cy="780" r="65" fill="none" stroke={p.ring} strokeWidth="0.8">
          <animate attributeName="r" values="65;72;65" dur="18s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6" dur="18s" repeatCount="indefinite" />
        </circle>
        <circle cx="1060" cy="200" r="50" fill="none" stroke={p.ring} strokeWidth="0.8">
          <animate attributeName="r" values="50;56;50" dur="20s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="20s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}
