import Link from "next/link";

const BG_TEXT = "BUDGET YOUR NAIRA · BUILD REAL WEALTH · ";

export function CtaSection() {
  const block = BG_TEXT.repeat(6);
  return (
    <section className="relative overflow-hidden px-4 py-28 md:px-8">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-100">
        <div className="flex w-max animate-marquee-slow">
          <p
            className="shrink-0 whitespace-nowrap text-[clamp(3rem,12vw,8rem)] font-medium uppercase leading-none text-white/[0.05]"
            aria-hidden
          >
            {block}
          </p>
          <p
            className="shrink-0 whitespace-nowrap text-[clamp(3rem,12vw,8rem)] font-medium uppercase leading-none text-white/[0.05]"
            aria-hidden
          >
            {block}
          </p>
        </div>
      </div>
      <div className="relative z-[1] mx-auto max-w-2xl text-center">
        <h2 className="mb-8 text-3xl font-medium tracking-tight text-foreground md:text-5xl">
          Ready to take control?
        </h2>
        <p className="mb-4 text-xs uppercase tracking-[0.16em] text-white/40">
          A product of Quiet Technologies.
        </p>
        <blockquote className="mx-auto mb-4 max-w-2xl text-sm italic leading-relaxed text-white/60 md:text-base">
          Success comes from intentionality, and those who succeed with money are intentional with it.
        </blockquote>
        <p className="mb-8 text-xs text-white/45 md:text-sm">
          Asere Opeyemi-Michael, Co-Founder & CEO, Orjar finance.
        </p>
        <Link
          href="/signup"
          prefetch={false}
          className="inline-flex min-h-11 min-w-[10rem] items-center justify-center border border-transparent bg-accent px-10 py-3 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Start free
        </Link>
        <p className="mt-8 text-sm text-white/40">Built for Nigerian professionals</p>
      </div>
    </section>
  );
}
