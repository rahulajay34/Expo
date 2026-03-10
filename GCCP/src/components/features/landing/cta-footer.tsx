'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/components/ui/animated-button';
import {
  ScrollRevealStagger,
  ScrollRevealItem,
} from '@/components/animations/scroll-reveal';

export function CTAFooterSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl">
          {/* Inverted dark background */}
          <div className="absolute inset-0 bg-foreground" />

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-8 py-16 text-center sm:px-16 sm:py-24">
            <ScrollRevealStagger>
              <ScrollRevealItem>
                <div className="mx-auto mb-6 flex items-center justify-center gap-2">
                  <Sparkles className="size-5 text-background/50" />
                  <span className="text-sm font-medium tracking-wide text-background/50 uppercase">
                    Start Today
                  </span>
                  <Sparkles className="size-5 text-background/50" />
                </div>
              </ScrollRevealItem>

              <ScrollRevealItem>
                <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-background sm:text-4xl lg:text-5xl">
                  Ready to Transform Your Course Content?
                </h2>
              </ScrollRevealItem>

              <ScrollRevealItem>
                <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-background/70 sm:text-lg">
                  Join educators who are saving hours every week. Generate
                  lecture notes, pre-reads, and assignments in seconds, not
                  hours.
                </p>
              </ScrollRevealItem>

              <ScrollRevealItem>
                <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <AnimatedButton>
                    <Button
                      asChild
                      size="lg"
                      className="h-12 min-w-[220px] gap-2 rounded-xl bg-background px-8 text-base font-semibold text-foreground shadow-lg shadow-black/10 transition-all hover:bg-background/90 hover:shadow-xl"
                    >
                      <Link href="/editor">
                        Start Generating
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </AnimatedButton>
                </div>
              </ScrollRevealItem>

              <ScrollRevealItem>
                <p className="mt-6 text-sm text-background/60">
                  No login required. Everything runs locally in your browser.
                </p>
              </ScrollRevealItem>
            </ScrollRevealStagger>
          </div>
        </div>
      </div>

      {/* Bottom padding with app info */}
      <div className="mt-16 text-center">
        <p className="text-sm text-muted-foreground">
          GCCP -- Generated Course Content Platform
        </p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Built with Next.js, Tailwind CSS, and the Gemini AI Platform
        </p>
      </div>
    </section>
  );
}
