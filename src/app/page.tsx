import { HeroSection } from '@/components/features/landing/hero';
import { ContentModesSection } from '@/components/features/landing/content-modes';
import { HowItWorksSection } from '@/components/features/landing/how-it-works';
import { CTAFooterSection } from '@/components/features/landing/cta-footer';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* Hero - bold headline, CTA buttons, stat badges, animated gradient background */}
      <HeroSection />

      {/* Three Content Modes - Lecture Notes, Pre-Reads, Assignments */}
      <ContentModesSection />

      {/* How It Works - Feature cards, Agent Timeline, Testimonials */}
      <HowItWorksSection />

      {/* CTA Footer - Final call to action */}
      <CTAFooterSection />
    </main>
  );
}
