"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils/cn";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#for-who", label: "For who" },
] as const;

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-background/75 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo className="h-6" />
        </Link>

        <nav
          className="hidden items-center gap-10 md:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-widest text-white/50 transition-colors hover:text-white/80"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/login"
            prefetch={false}
            className="text-xs font-medium uppercase tracking-widest text-white/50 transition-colors hover:text-white/80"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            prefetch={false}
            className="min-h-11 min-w-[7rem] border border-transparent bg-accent px-5 py-2.5 text-center text-xs font-medium uppercase tracking-wider text-accent-foreground transition-opacity hover:opacity-90"
          >
            Start free
          </Link>
        </div>

        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      <div
        id="mobile-menu"
        className={cn(
          "fixed bottom-0 left-0 right-0 top-16 z-40 flex flex-col bg-background transition-[visibility,opacity] duration-200 md:hidden",
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
        aria-hidden={!open}
      >
        <nav
          className="flex flex-1 flex-col gap-1 px-6 py-8"
          aria-label="Mobile"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="border-b border-white/5 py-4 text-sm font-medium uppercase tracking-widest text-white/70"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/login"
            prefetch={false}
            className="py-4 text-sm font-medium uppercase tracking-widest text-white/50"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            prefetch={false}
            className="mt-4 min-h-11 border border-transparent bg-accent py-3 text-center text-sm font-medium uppercase tracking-wider text-accent-foreground"
            onClick={() => setOpen(false)}
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
