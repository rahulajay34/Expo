'use client';

import { motion } from 'framer-motion';
import {
  Layers,
  Zap,
  Shield,
  Search,
  FileSearch,
  PenTool,
  Eraser,
  Star,
  Wrench,
  FileCheck,
  Quote,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  ScrollReveal,
  ScrollRevealStagger,
  ScrollRevealItem,
} from '@/components/animations/scroll-reveal';

/* ----------------------------------------------------------------
   How It Works - Feature Cards
   ---------------------------------------------------------------- */
const features = [
  {
    icon: Layers,
    title: '7-Agent Pipeline',
    description:
      'Seven specialized AI agents work in sequence -- detecting context, analyzing transcripts, creating content, sanitizing facts, reviewing quality, refining prose, and formatting output. Each agent is purpose-built for its role.',
  },
  {
    icon: Zap,
    title: 'Real-Time Streaming',
    description:
      'Content appears word-by-word as it generates. Watch your lecture notes, pre-reads, or assignments come to life in the live editor and preview panes simultaneously. No waiting for batch results.',
  },
  {
    icon: Shield,
    title: 'Quality Assured',
    description:
      'Every piece of content passes through Sanitizer, Reviewer, and Refiner agents. Factual accuracy, pedagogical soundness, and clarity are verified before the output reaches you.',
  },
];

/* ----------------------------------------------------------------
   Agent Timeline
   ---------------------------------------------------------------- */
const agents = [
  {
    name: 'CourseDetector',
    action: 'Identifies domain & context',
    time: '~5s',
    icon: Search,
  },
  {
    name: 'Analyzer',
    action: 'Gap analysis on transcript',
    time: '~10s',
    icon: FileSearch,
  },
  {
    name: 'Creator',
    action: 'Generates full content',
    time: '~40s',
    icon: PenTool,
  },
  {
    name: 'Sanitizer',
    action: 'Fact-checks & corrects',
    time: '~10s',
    icon: Eraser,
  },
  {
    name: 'Reviewer',
    action: 'Quality rubric evaluation',
    time: '~8s',
    icon: Star,
  },
  {
    name: 'Refiner',
    action: 'Surgical improvements',
    time: '~10s',
    icon: Wrench,
  },
  {
    name: 'Formatter',
    action: 'Structures final output',
    time: '~7s',
    icon: FileCheck,
  },
];

/* ----------------------------------------------------------------
   Testimonials
   ---------------------------------------------------------------- */
const testimonials = [
  {
    quote:
      'I used to spend 3-4 hours preparing lecture notes for each session. GCCP gives me a solid first draft in under 2 minutes. It is transformative.',
    name: 'Dr. Sarah Mitchell',
    role: 'Associate Professor, Computer Science',
  },
  {
    quote:
      'The assignment generator is brilliant. Bloom\'s taxonomy alignment out of the box, with answer keys and explanations? My TAs love it.',
    name: 'Prof. Rajesh Gupta',
    role: 'Head of Department, Business Analytics',
  },
  {
    quote:
      'Pre-reads that actually get students excited before class. The quality of the misconceptions section alone makes this worth using.',
    name: 'Maria Chen',
    role: 'Instructional Designer, EdTech Lab',
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <ScrollRevealStagger className="mb-16 text-center">
          <ScrollRevealItem>
            <Badge
              variant="outline"
              className="mb-4 gap-1.5 border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              How It Works
            </Badge>
          </ScrollRevealItem>
          <ScrollRevealItem>
            <h2 className="font-display mx-auto max-w-lg text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Built for <span className="text-gradient">Speed</span> and{' '}
              <span className="text-gradient">Quality</span>
            </h2>
          </ScrollRevealItem>
          <ScrollRevealItem>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              A multi-agent architecture designed to produce
              curriculum-ready content with zero compromise.
            </p>
          </ScrollRevealItem>
        </ScrollRevealStagger>

        {/* Feature cards */}
        <ScrollRevealStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <ScrollRevealItem key={feature.title}>
                <motion.div
                  className="group flex h-full flex-col rounded-2xl border border-border/50 bg-card p-8 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md"
                  whileHover={{ y: -4, transition: { duration: 0.25 } }}
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-border">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <h3 className="font-display mb-3 text-xl font-bold tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              </ScrollRevealItem>
            );
          })}
        </ScrollRevealStagger>

        {/* ============================================================
           Agent Timeline - "How Fast?"
           ============================================================ */}
        <div className="mt-32">
          <ScrollRevealStagger className="mb-14 text-center">
            <ScrollRevealItem>
              <Badge
                variant="outline"
                className="mb-4 gap-1.5 border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                The Pipeline
              </Badge>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <h2 className="font-display mx-auto max-w-md text-3xl font-bold tracking-tight sm:text-4xl">
                ~90 Seconds, <span className="text-gradient">7 Agents</span>
              </h2>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
                Here is what happens under the hood every time you click
                Generate.
              </p>
            </ScrollRevealItem>
          </ScrollRevealStagger>

          {/* Timeline */}
          <div className="relative mx-auto max-w-2xl">
            {agents.map((agent, index) => {
              const Icon = agent.icon;
              const isLast = index === agents.length - 1;
              return (
                <ScrollReveal key={agent.name} delay={index * 0.08}>
                  <motion.div
                    className="group relative mb-6 flex items-start gap-5"
                    whileHover={{ x: 4, transition: { duration: 0.2 } }}
                  >
                    {/* Step number indicator */}
                    <div className="relative flex-shrink-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
                        <span className="font-display text-xs font-bold text-foreground">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      {/* Connector line to next step */}
                      {!isLast && (
                        <div className="absolute left-[17px] top-9 h-6 w-px bg-border" />
                      )}
                    </div>

                    {/* Card */}
                    <div className="flex flex-1 items-center gap-4 rounded-xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 group-hover:border-border group-hover:shadow-md">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <Icon className="size-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold">
                            {agent.name}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="rounded-full px-2 py-0 text-[10px] font-medium"
                          >
                            {agent.time}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {agent.action}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        {/* ============================================================
           Social Proof / Testimonials
           ============================================================ */}
        <div className="mt-32">
          <ScrollRevealStagger className="mb-14 text-center">
            <ScrollRevealItem>
              <Badge
                variant="outline"
                className="mb-4 gap-1.5 border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                Testimonials
              </Badge>
            </ScrollRevealItem>
            <ScrollRevealItem>
              <h2 className="font-display mx-auto max-w-md text-3xl font-bold tracking-tight sm:text-4xl">
                Trusted by <span className="text-gradient">Educators</span>
              </h2>
            </ScrollRevealItem>
          </ScrollRevealStagger>

          <ScrollRevealStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <ScrollRevealItem key={testimonial.name}>
                <motion.div
                  className="group relative flex h-full flex-col rounded-2xl border border-border/50 bg-card p-7 shadow-sm transition-all duration-300 hover:border-border hover:shadow-md"
                  whileHover={{ y: -3, transition: { duration: 0.25 } }}
                >
                  <Quote className="mb-4 size-8 text-primary/20" />
                  <p className="flex-1 text-sm leading-relaxed text-muted-foreground italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-6 border-t border-border/50 pt-4">
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </motion.div>
              </ScrollRevealItem>
            ))}
          </ScrollRevealStagger>
        </div>
      </div>
    </section>
  );
}
