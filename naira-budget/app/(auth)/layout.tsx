import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="grid min-h-screen md:grid-cols-2">
        <aside className="relative hidden flex-col justify-between border-r border-white/5 p-10 md:flex">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_30%_25%,rgba(22,163,74,0.12),transparent_55%)]"
            aria-hidden
          />
          <div className="relative z-[1]">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-xl font-medium text-accent">₦B</span>
              <span className="text-sm font-medium tracking-tight text-foreground">
                Naira Budget
              </span>
            </Link>
          </div>
          <div className="relative z-[1] space-y-4">
            <p className="max-w-sm text-lg font-medium leading-snug text-foreground/90">
              &ldquo;Every naira deserves a plan.&rdquo;
            </p>
            <p className="text-sm text-white/40">
              Built for Nigerian professionals — no bank sync, no real money on the
              line.
            </p>
          </div>
        </aside>

        <div className="flex flex-col justify-center px-4 py-12 md:px-12 md:py-16">
          <div className="mb-10 md:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="text-lg font-medium text-accent">₦B</span>
              <span className="text-sm font-medium text-foreground">
                Naira Budget
              </span>
            </Link>
          </div>
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
