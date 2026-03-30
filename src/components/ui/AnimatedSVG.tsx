'use client';
import { useEffect, useRef } from 'react';

interface AnimatedSVGProps {
  children: React.ReactNode;
  className?: string;
  onHover?: boolean; // whether to re-animate on hover
}

export function AnimatedSVG({ children, className, onHover = false }: AnimatedSVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const animate = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = svg.querySelectorAll('path, circle, polyline, line, rect, ellipse');
    paths.forEach((path) => {
      const el = path as SVGGeometryElement;
      try {
        const length = el.getTotalLength ? el.getTotalLength() : 100;
        el.style.strokeDasharray = String(length);
        el.style.strokeDashoffset = String(length);
        el.style.transition = 'stroke-dashoffset 0.35s ease-out';
        // Trigger animation
        requestAnimationFrame(() => {
          el.style.strokeDashoffset = '0';
        });
      } catch (e) {
        // getTotalLength not supported, skip
      }
    });
  };

  useEffect(() => {
    animate();
  }, []);

  useEffect(() => {
    if (!onHover) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener('mouseenter', animate);
    return () => svg.removeEventListener('mouseenter', animate);
  }, [onHover]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
