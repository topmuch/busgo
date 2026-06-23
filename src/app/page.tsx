"use client";

import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { PainPoints } from "@/components/landing/pain-points";
import { Solution } from "@/components/landing/solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Comparison } from "@/components/landing/comparison";
import { RoiCalculator } from "@/components/landing/roi-calculator";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CTAFinal } from "@/components/landing/cta-final";
import { Footer } from "@/components/landing/footer";
import { WhatsAppButton } from "@/components/landing/whatsapp-button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />

      <main>
        <Hero />
        <StatsBar />
        <PainPoints />
        <Solution />
        <HowItWorks />
        <Features />
        <Comparison />
        <RoiCalculator />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTAFinal />
      </main>

      <Footer />

      {/* Floating elements */}
      <WhatsAppButton />
    </div>
  );
}