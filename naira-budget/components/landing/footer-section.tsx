import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function FooterSection() {
  return (
    <footer className="border-t border-white/5 px-4 py-12 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 text-xs text-white/30 md:flex-row">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="h-6" />
        </Link>
        <nav className="flex flex-wrap justify-center gap-8">
          <Link
            href="/privacy"
            className="uppercase tracking-widest transition-colors hover:text-white/50"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="uppercase tracking-widest transition-colors hover:text-white/50"
          >
            Terms
          </Link>
        </nav>
        <div className="flex flex-col items-center gap-1 text-center md:items-end">
          <span>© {new Date().getFullYear()} Naira Budget</span>
          <span className="text-white/20 italic">Designed in Lagos</span>
        </div>
      </div>
    </footer>
  );
}
