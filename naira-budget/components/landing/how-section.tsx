const STEPS = [
  {
    n: "01",
    title: "Enter your income(s)",
    description: "Add every stream so your plan reflects real life.",
  },
  {
    n: "02",
    title: "Split across your buckets",
    description: "Give every naira a job before the month runs away.",
  },
  {
    n: "03",
    title: "Log expenses as you spend",
    description: "Stay honest with quick logs — no bank connection required.",
  },
  {
    n: "04",
    title: "Track T-bills and investments",
    description: "Know what matures when, and what your portfolio is doing.",
  },
] as const;

export function HowSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/30">
          How it works
        </p>
        <h2 className="mb-16 text-3xl font-medium tracking-tight text-foreground md:text-5xl">
          Set up in 5 minutes
        </h2>
        <div className="relative grid gap-12 md:grid-cols-4 md:gap-4">
          <div
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden border-t border-dashed border-white/10 md:block"
            aria-hidden
          />
          {STEPS.map((step) => (
            <div key={step.n} className="relative min-h-[8rem] md:min-h-0">
              <span
                className="pointer-events-none absolute -left-1 -top-2 select-none text-[6rem] font-medium leading-none text-white/[0.05] md:-left-2 md:text-[7.5rem]"
                aria-hidden
              >
                {step.n}
              </span>
              <h3 className="relative z-[1] mb-2 pt-2 text-lg font-medium text-foreground">
                {step.title}
              </h3>
              <p className="relative z-[1] text-sm leading-relaxed text-white/40">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
