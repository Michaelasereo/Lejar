const PERSONAS = [
  {
    title: "The Professional",
    description: "Dual income, wants to track T-bills and stay on top of rent.",
    highlight: false,
  },
  {
    title: "The New Earner",
    description: "First big salary — you want structure without feeling boxed in.",
    highlight: true,
  },
  {
    title: "The Saver",
    description: "Already using PiggyVest — add a planning layer on top.",
    highlight: false,
  },
] as const;

export function ForWhoSection() {
  return (
    <section id="for-who" className="scroll-mt-24 px-4 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/30">
          For who
        </p>
        <h2 className="mb-14 text-3xl font-medium tracking-tight text-foreground md:text-5xl">
          Made for people like you
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {PERSONAS.map((p) => (
            <article
              key={p.title}
              className={
                p.highlight
                  ? "border border-accent/30 bg-accent/[0.03] p-8"
                  : "border border-white/[0.08] bg-white/[0.03] p-8"
              }
            >
              <h3 className="mb-3 text-lg font-medium text-foreground">
                {p.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">{p.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
