import { Home, Layers, LineChart, ShoppingCart, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    title: "Three-bucket system",
    description:
      "Split every naira across clear buckets so spending and saving stay intentional.",
    icon: Layers,
  },
  {
    title: "T-bills & investment tracker",
    description:
      "Log treasury bills and platform investments with maturity and return context.",
    icon: TrendingUp,
  },
  {
    title: "Grocery list with deferred pricing",
    description:
      "Build lists, add prices when you shop, and total up before you pay.",
    icon: ShoppingCart,
  },
  {
    title: "Rent jar",
    description:
      "Turn annual rent into a monthly savings target you can actually hit.",
    icon: Home,
  },
  {
    title: "Wealth projection",
    description:
      "See where your savings rate could take you over the next few years.",
    icon: LineChart,
  },
] as const;

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-24 md:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/30">
          Features
        </p>
        <h2 className="mb-14 text-3xl font-medium tracking-tight text-foreground md:text-5xl">
          Everything your budget needs
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="border border-white/[0.08] bg-white/[0.03] p-8"
            >
              <f.icon
                className="mb-6 h-6 w-6 text-accent"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mb-3 text-lg font-medium text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
