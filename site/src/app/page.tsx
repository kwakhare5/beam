import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { CapsuleMechanics } from '@/components/CapsuleMechanics';
import { FeaturesGrid } from '@/components/FeaturesGrid';
import { PerformanceStrip } from '@/components/PerformanceStrip';
import { Footer } from '@/components/Footer';
import { OriginalBeam } from '@/components/OriginalBeam';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-bg text-ink overflow-x-hidden selection:bg-[#ffaa00]/30 selection:text-black">
      <Navbar />
      <main>
        <Hero />
        <CapsuleMechanics />
        <FeaturesGrid />
        <PerformanceStrip />
      </main>
      <Footer />

      {/* Real Original Desktop Beam Component (Floating at bottom-center of screen) */}
      <OriginalBeam />
    </div>
  );
}
