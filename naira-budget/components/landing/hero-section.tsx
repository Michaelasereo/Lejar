import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pb-24 pt-28 md:px-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_35%,rgba(124,99,253,0.10),transparent_55%)]"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-4xl text-center">
        <p className="mb-8 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/60 md:text-xs">
          Built for Nigerian professionals
        </p>
        <h1 className="mb-6 text-4xl font-medium leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl xl:text-8xl">
          Budget your naira.
          <br />
          Build real wealth.
        </h1>
        <p className="mx-auto mb-12 max-w-xl text-base leading-relaxed text-white/50 md:text-lg">
          The only budget planner built for Nigeria — T-bills, PiggyVest, annual
          rent, and everything in between. No bank sync. No real money.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
          <Link
            href="/signup"
            prefetch={false}
            className="min-h-11 w-full min-w-[11rem] border border-transparent bg-accent px-8 py-3 text-center text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            Start free
          </Link>
          <a
            href="#how-it-works"
            className="min-h-11 w-full min-w-[11rem] border border-white/20 bg-transparent px-8 py-3 text-center text-sm font-medium text-foreground transition-colors hover:border-white/35 sm:w-auto"
          >
            See how it works
          </a>
        </div>
        <p className="mt-10 text-[10px] font-medium uppercase tracking-widest text-white/30 md:text-xs">
          No credit card · No bank connection · 100% free
        </p>
      </div>
    </section>
  );
}
