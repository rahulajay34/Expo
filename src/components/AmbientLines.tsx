'use client';

import { useEffect, useState, useMemo, memo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ContentType } from '@/lib/types';

interface AmbientLinesProps {
  className?: string;
  /** Currently selected content type. When null, a neutral set is shown. */
  contentType?: ContentType | null;
}

/** Easing curve for individual icon transitions */
const EASE_SMOOTH: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

/**
 * A single sprinkle icon that animates in / out individually.
 * Memoized so position layout is never recomputed unless props change.
 */
const SprinkleIcon = memo(function SprinkleIcon({
  sprinkle,
  stroke,
  layoutKey,
  prefersReducedMotion,
}: {
  sprinkle: Sprinkle;
  stroke: string;
  layoutKey: string;
  prefersReducedMotion: boolean | null;
}) {
  const s = sprinkle;
  return (
    <motion.div
      key={layoutKey}
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: EASE_SMOOTH }}
      style={{
        position: 'absolute',
        top: s.top,
        left: s.left,
        right: s.right,
        bottom: s.bottom,
        width: s.size,
        height: s.size,
        transform: s.rotate ? `rotate(${s.rotate}deg)` : undefined,
      }}
    >
      <s.Icon stroke={stroke} />
    </motion.div>
  );
});

/**
 * Content-aware background sprinkles.
 *
 * Renders 3-4 tiny SVG icons at fixed positions around the viewport margins
 * (corners + side gutters), faint enough to read as watermarks. The icon set
 * changes with `contentType`.
 *
 * Individual icons animate in/out independently (no full-layer remount),
 * avoiding the jarring pop caused by AnimatePresence mode="wait" on the
 * entire container.
 */
export function AmbientLines({ className, contentType }: AmbientLinesProps) {
  const [isDark, setIsDark] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    const check = () => setIsDark(root.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const stroke = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(35,131,226,0.85)';
  const layerOpacity = isDark ? 0.14 : 0.12;

  const key = contentType ?? 'neutral';

  // Memoize sprinkle config per type so only the icon SVGs re-render on type change.
  const sprinkles = useMemo(() => SPRINKLES[key], [key]);

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
        opacity: layerOpacity,
      }}
    >
      <AnimatePresence>
        {sprinkles.map((s, i) => (
          <SprinkleIcon
            key={`${key}-${s.Icon.name}-${i}`}
            sprinkle={s}
            stroke={stroke}
            layoutKey={`${key}-${s.Icon.name}-${i}`}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Sprinkle definitions ─────────────────────────────────────── */

interface IconProps {
  stroke: string;
}

interface Sprinkle {
  Icon: (p: IconProps) => JSX.Element;
  size: number;
  top?: string | number;
  left?: string | number;
  right?: string | number;
  bottom?: string | number;
  rotate?: number;
}

const SPRINKLES: Record<ContentType | 'neutral', Sprinkle[]> = {
  lecture: [
    { Icon: PageIcon, size: 64, top: '8%', right: '6%', rotate: 6 },
    { Icon: PencilIcon, size: 56, bottom: '12%', left: '5%', rotate: -12 },
    { Icon: BookmarkIcon, size: 48, top: '52%', right: '4%', rotate: -4 },
    { Icon: HighlighterIcon, size: 50, bottom: '20%', right: '8%', rotate: 8 },
  ],
  'pre-lecture': [
    { Icon: OpenBookIcon, size: 64, top: '9%', right: '5%', rotate: -5 },
    { Icon: GlassesIcon, size: 56, bottom: '14%', left: '6%' },
    { Icon: LightbulbIcon, size: 50, top: '48%', left: '4%', rotate: 8 },
    { Icon: QuestionIcon, size: 46, bottom: '22%', right: '7%' },
  ],
  assignment: [
    { Icon: CheckboxIcon, size: 56, top: '10%', right: '6%', rotate: -6 },
    { Icon: ClipboardIcon, size: 64, bottom: '14%', left: '5%', rotate: 4 },
    { Icon: NumberOneIcon, size: 48, top: '50%', left: '4%' },
    { Icon: PencilIcon, size: 50, bottom: '22%', right: '6%', rotate: -18 },
  ],
  'ta-guide': [
    { Icon: ClockIcon, size: 60, top: '8%', right: '6%' },
    { Icon: SpeechBubbleIcon, size: 56, bottom: '14%', left: '5%', rotate: -4 },
    { Icon: WhiteboardIcon, size: 60, top: '50%', right: '4%', rotate: 4 },
    { Icon: GroupIcon, size: 54, bottom: '22%', right: '8%' },
  ],
  neutral: [
    { Icon: SparkIcon, size: 44, top: '12%', right: '8%' },
    { Icon: CircleIcon, size: 52, bottom: '18%', left: '6%' },
    { Icon: TriangleIcon, size: 46, top: '55%', right: '5%' },
  ],
};

/* ── Icon primitives (small, monoline, ~24px viewBox) ────────── */

const VB = '0 0 24 24';
const SW = 1.6;

function PageIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M6 3h9l3 3v15H6V3z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M15 3v3h3" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="9" y1="11" x2="15" y2="11" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="9" y1="14" x2="15" y2="14" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="9" y1="17" x2="13" y2="17" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function PencilIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M3 21l3-1 11-11-2-2L4 18l-1 3z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M14 7l3 3" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <path d="M16 5l2 2" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function BookmarkIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M7 3h10v18l-5-4-5 4V3z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
    </svg>
  );
}

function HighlighterIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M9 14l4-9 5 3-4 9-5-3z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M9 14l-3 6 5-1" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="13" y1="5" x2="18" y2="8" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function OpenBookIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1V5z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="12" y1="6" x2="12" y2="19" stroke={stroke} strokeWidth={SW} />
    </svg>
  );
}

function GlassesIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="6.5" cy="14" r="3.5" stroke={stroke} strokeWidth={SW} />
      <circle cx="17.5" cy="14" r="3.5" stroke={stroke} strokeWidth={SW} />
      <path d="M10 14h4" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <path d="M3 14L5 7" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <path d="M21 14L19 7" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function LightbulbIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M9 17a4 4 0 016 0v2H9v-2z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <path d="M12 3a6 6 0 00-3 11l1 3h4l1-3a6 6 0 00-3-11z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <line x1="10" y1="21" x2="14" y2="21" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function QuestionIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={SW} />
      <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.8" fill={stroke} />
    </svg>
  );
}

function CheckboxIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke={stroke} strokeWidth={SW} />
      <path d="M7 12.5l3.5 3.5L17 9" stroke={stroke} strokeWidth={SW + 0.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <rect x="5" y="5" width="14" height="16" rx="2" stroke={stroke} strokeWidth={SW} />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke={stroke} strokeWidth={SW} />
      <line x1="8" y1="11" x2="16" y2="11" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="8" y1="14" x2="14" y2="14" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="8" y1="17" x2="13" y2="17" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function NumberOneIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={SW} />
      <path d="M10 9l2-1v8" stroke={stroke} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={SW} />
      <path d="M12 7v5l3 2" stroke={stroke} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpeechBubbleIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M4 5h16v11h-9l-4 4v-4H4V5z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
      <circle cx="9" cy="10.5" r="0.8" fill={stroke} />
      <circle cx="12" cy="10.5" r="0.8" fill={stroke} />
      <circle cx="15" cy="10.5" r="0.8" fill={stroke} />
    </svg>
  );
}

function WhiteboardIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <rect x="3" y="4" width="18" height="12" rx="1.5" stroke={stroke} strokeWidth={SW} />
      <line x1="6" y1="8" x2="14" y2="8" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="6" y1="11" x2="18" y2="11" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="12" y1="16" x2="12" y2="20" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <line x1="9" y1="20" x2="15" y2="20" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function GroupIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="9" cy="9" r="3" stroke={stroke} strokeWidth={SW} />
      <circle cx="17" cy="10" r="2.5" stroke={stroke} strokeWidth={SW} />
      <path d="M3 19a6 6 0 0112 0" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <path d="M14 17.5a4.5 4.5 0 017 0" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6" stroke={stroke} strokeWidth={SW} strokeLinecap="round" />
      <path d="M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" stroke={stroke} strokeWidth={SW * 0.85} strokeLinecap="round" />
    </svg>
  );
}

function CircleIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={SW} />
      <circle cx="12" cy="12" r="4" stroke={stroke} strokeWidth={SW} />
    </svg>
  );
}

function TriangleIcon({ stroke }: IconProps) {
  return (
    <svg viewBox={VB} fill="none" width="100%" height="100%">
      <path d="M12 4l9 16H3L12 4z" stroke={stroke} strokeWidth={SW} strokeLinejoin="round" />
    </svg>
  );
}
