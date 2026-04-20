import type { Metadata } from "next";
import { CtaSection } from "@/components/landing/cta-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { FooterSection } from "@/components/landing/footer-section";
import { ForWhoSection } from "@/components/landing/for-who-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowSection } from "@/components/landing/how-section";
import { LandingNavbar } from "@/components/landing/navbar";
import { MarqueeStrip } from "@/components/landing/marquee-strip";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export const metadata: Metadata = {
  title: "Naira Budget — Budget your naira. Build real wealth.",
  description:
    "The only budget planner built for Nigeria — T-bills, PiggyVest, annual rent, and everything in between. No bank sync. No real money.",
};

export default function HomePage() {
  return (
    <>
      <LandingNavbar />
      <main>
        <ScrollReveal>
          <HeroSection />
        </ScrollReveal>
        <MarqueeStrip />
        <ScrollReveal>
          <FeaturesSection />
        </ScrollReveal>
        <ScrollReveal>
          <HowSection />
        </ScrollReveal>
        <ScrollReveal>
          <ForWhoSection />
        </ScrollReveal>
        <ScrollReveal>
          <CtaSection />
        </ScrollReveal>
        <FooterSection />
      </main>
    </>
  );
}
