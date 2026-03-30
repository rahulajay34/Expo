'use client';
import { useEffect, useRef } from 'react';

interface AmbientParticlesProps {
  active: boolean; // true during generation, false on completion
  className?: string;
}

const PARTICLE_COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#818CF8'];

export function AmbientParticles({ active, className }: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    color: string;
    opacity: number;
    alive: boolean;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas to parent
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    if (active) {
      // Scatter on scatter: boost velocities
      if (particlesRef.current.length > 0 && particlesRef.current[0].alive) {
        particlesRef.current.forEach(p => {
          p.vx *= 3; p.vy *= 3;
        });
        // Mark for fade-out after scatter
        setTimeout(() => {
          particlesRef.current.forEach(p => { p.alive = false; });
        }, 500);
      }
      // Initialize particles
      particlesRef.current = Array.from({ length: 25 }, () => ({
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(0.3 + Math.random() * 0.5),
        size: 2 + Math.random() * 1.5,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        opacity: 0.4 + Math.random() * 0.4,
        alive: true,
      }));
    } else {
      // Scatter burst
      particlesRef.current.forEach(p => {
        if (p.alive) {
          p.vx = (Math.random() - 0.5) * 4;
          p.vy = -(1 + Math.random() * 3);
          p.alive = false;
        }
      });
      // Fade out remaining
      const fadeTimer = setTimeout(() => {
        particlesRef.current = [];
      }, 600);
      return () => clearTimeout(fadeTimer);
    }

    let frame = 0;
    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      particlesRef.current.forEach(p => {
        if (!p.alive) return;
        p.x += p.vx;
        p.y += p.vy;
        // Fade at top
        if (p.y < canvas.height * 0.3) {
          p.opacity = Math.max(0, p.opacity - 0.01);
        }
        // Reset if off screen
        if (p.y < -10 || p.x < -10 || p.x > canvas.width + 10) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
          p.vy = -(0.3 + Math.random() * 0.5);
          p.vx = (Math.random() - 0.5) * 0.5;
          p.opacity = 0.4 + Math.random() * 0.4;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
    />
  );
}
