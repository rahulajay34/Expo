'use client';

import { motion } from 'framer-motion';
import { BookOpen, Lightbulb, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ScrollRevealStagger,
  ScrollRevealItem,
} from '@/components/animations/scroll-reveal';

const contentModes = [
  {
    icon: BookOpen,
    title: 'Lecture Notes',
    tag: 'Deep Dive',
    description:
      'Comprehensive, curriculum-ready notes with analogies, industry spotlights, try-it-yourself examples, and key takeaways. Structured for maximum student understanding.',
    features: [
      'Analogies & real-world examples',
      'Industry spotlights',
      'Key takeaways per section',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Pre-Reads',
    tag: 'Primer',
    description:
      'Curiosity-sparking introductions with practice exercises and common misconceptions that prime students before the lecture. Build anticipation and readiness.',
    features: [
      'Common misconceptions addressed',
      'Practice exercises included',
      'Builds lecture anticipation',
    ],
  },
  {
    icon: ClipboardCheck,
    title: 'Assignments',
    tag: 'Assessment',
    description:
      "Bloom's taxonomy-aligned questions: MCSC, MCMC, and subjective types with full answer keys and detailed explanations. Ready for immediate classroom use.",
    features: [
      "Bloom's taxonomy alignment",
      'MCSC, MCMC & subjective types',
      'Full answer keys included',
    ],
  },
];

export function ContentModesSection() {
  return (
    <section className="relative bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <ScrollRevealStagger className="mb-16 text-center">
          <ScrollRevealItem>
            <Badge
              variant="outline"
              className="mb-4 gap-1.5 border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              Content Types
            </Badge>
          </ScrollRevealItem>
          <ScrollRevealItem>
            <h2 className="font-display mx-auto max-w-lg text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Three types of content, one pipeline.
            </h2>
          </ScrollRevealItem>
          <ScrollRevealItem>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              Choose the content type that fits your teaching moment. Each is
              tailored for its pedagogical purpose.
            </p>
          </ScrollRevealItem>
        </ScrollRevealStagger>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {contentModes.map((mode, i) => (
            <motion.div
              key={mode.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="group rounded-lg border border-border bg-card p-6 transition-colors duration-150 hover:border-foreground"
            >
              {/* Icon */}
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
                <mode.icon className="h-4 w-4 text-foreground" />
              </div>

              {/* Tag */}
              <div className="mb-2">
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent text-primary">
                  {mode.tag}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display text-lg font-bold text-foreground">{mode.title}</h3>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{mode.description}</p>

              {/* Features */}
              <ul className="mt-4 space-y-1.5">
                {mode.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
