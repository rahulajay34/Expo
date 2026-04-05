'use client';

import { useEffect, useRef, useCallback } from 'react';

interface AmbientLinesProps {
  className?: string;
}

interface Line {
  x: number;
  y: number;
  angle: number;
  length: number;
  vx: number;
  vy: number;
  angularVelocity: number;
  strokeWidth: number;
}

const LINE_COUNT = 8;
const MIN_LENGTH = 100;
const MAX_LENGTH = 300;
const MIN_VELOCITY = 0.1;
const MAX_VELOCITY = 0.3;
const MIN_ANGULAR_VELOCITY = 0.001;
const MAX_ANGULAR_VELOCITY = 0.005;
const MIN_STROKE = 1;
const MAX_STROKE = 1.5;
const OPACITY = 0.08;
const DAMPING = 0.999;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createLine(width: number, height: number): Line {
  const speed = rand(MIN_VELOCITY, MAX_VELOCITY);
  const moveAngle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    angle: Math.random() * Math.PI,
    length: rand(MIN_LENGTH, MAX_LENGTH),
    vx: Math.cos(moveAngle) * speed,
    vy: Math.sin(moveAngle) * speed,
    angularVelocity: rand(MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY) * (Math.random() > 0.5 ? 1 : -1),
    strokeWidth: rand(MIN_STROKE, MAX_STROKE),
  };
}

function wrapCoord(value: number, max: number, margin: number): number {
  if (value < -margin) return max + margin;
  if (value > max + margin) return -margin;
  return value;
}

export function AmbientLines({ className }: AmbientLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const linesRef = useRef<Line[]>([]);
  const reducedMotionRef = useRef(false);

  const getLineColor = useCallback((canvas: HTMLCanvasElement): string => {
    const style = getComputedStyle(canvas);
    const color = style.getPropertyValue('--text-secondary').trim();
    return color || '#666666';
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionRef.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => {
      reducedMotionRef.current = e.matches;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) {
      ro.observe(canvas.parentElement);
    }
    resize();

    // Initialize lines
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    linesRef.current = Array.from({ length: LINE_COUNT }, () => createLine(w, h));

    // Draw one static frame for reduced-motion
    const drawStatic = () => {
      const dpr2 = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr2;
      const ch = canvas.height / dpr2;
      ctx.clearRect(0, 0, cw, ch);
      const color = getLineColor(canvas);
      ctx.globalAlpha = OPACITY;
      ctx.lineCap = 'round';

      for (const line of linesRef.current) {
        const halfLen = line.length / 2;
        const dx = Math.cos(line.angle) * halfLen;
        const dy = Math.sin(line.angle) * halfLen;
        ctx.beginPath();
        ctx.moveTo(line.x - dx, line.y - dy);
        ctx.lineTo(line.x + dx, line.y + dy);
        ctx.strokeStyle = color;
        ctx.lineWidth = line.strokeWidth;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    if (reducedMotionRef.current) {
      drawStatic();
      return () => {
        ro.disconnect();
      };
    }

    // Animate
    const animate = () => {
      if (reducedMotionRef.current) {
        drawStatic();
        return;
      }

      const dpr2 = window.devicePixelRatio || 1;
      const cw = canvas.width / dpr2;
      const ch = canvas.height / dpr2;
      ctx.clearRect(0, 0, cw, ch);
      const color = getLineColor(canvas);
      ctx.globalAlpha = OPACITY;
      ctx.lineCap = 'round';

      const margin = MAX_LENGTH;

      for (const line of linesRef.current) {
        // Update physics
        line.x += line.vx;
        line.y += line.vy;
        line.angle += line.angularVelocity;

        // Damping with minimum velocity floor
        line.vx *= DAMPING;
        line.vy *= DAMPING;
        line.angularVelocity *= DAMPING;

        // Prevent lines from fully stopping — nudge if below floor
        const speed = Math.sqrt(line.vx * line.vx + line.vy * line.vy);
        if (speed < MIN_VELOCITY * 0.5) {
          const nudgeAngle = Math.random() * Math.PI * 2;
          line.vx = Math.cos(nudgeAngle) * MIN_VELOCITY;
          line.vy = Math.sin(nudgeAngle) * MIN_VELOCITY;
        }
        if (Math.abs(line.angularVelocity) < MIN_ANGULAR_VELOCITY * 0.5) {
          line.angularVelocity = rand(MIN_ANGULAR_VELOCITY, MAX_ANGULAR_VELOCITY) * (Math.random() > 0.5 ? 1 : -1);
        }

        // Wrap around
        line.x = wrapCoord(line.x, cw, margin);
        line.y = wrapCoord(line.y, ch, margin);

        // Draw
        const halfLen = line.length / 2;
        const dx = Math.cos(line.angle) * halfLen;
        const dy = Math.sin(line.angle) * halfLen;
        ctx.beginPath();
        ctx.moveTo(line.x - dx, line.y - dy);
        ctx.lineTo(line.x + dx, line.y + dy);
        ctx.strokeStyle = color;
        ctx.lineWidth = line.strokeWidth;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [getLineColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}
