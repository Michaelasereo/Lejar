"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Landmark, LayoutDashboard, TrendingUp } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils/cn";

const AUTO_DURATION_MS = 5000;

interface ShowcaseData {
  income: string;
  saved: string;
  spent: string;
  sub: string;
  b1: string;
  b2: string;
  b3: string;
  portfolio: string;
  tbill1: string;
  jarsTotal: string;
  jar1meta: string;
  networth: string;
  thismonth: string;
  networthDisplay: string;
  streakMonths: string;
  savingsRate: string;
  tbillReturn: string;
  jarMonths: string;
  networthShort: string;
}

const incomeData: Record<number, ShowcaseData> = {
  300000: { income: "₦300,000", saved: "₦168k", spent: "₦72k", sub: "↑ 56% savings rate · ₦168k saved", b1: "₦150k", b2: "₦96k", b3: "₦54k", portfolio: "₦690,000", tbill1: "₦225,000", jarsTotal: "₦350k saved", jar1meta: "₦175k of ₦800k", networth: "₦877,500", thismonth: "+₦168,000", networthDisplay: "₦877,500", streakMonths: "3 months", savingsRate: "56%", tbillReturn: "₦47k", jarMonths: "12", networthShort: "₦878k" },
  500000: { income: "₦500,000", saved: "₦280k", spent: "₦120k", sub: "↑ 56% savings rate · ₦280k saved", b1: "₦250k", b2: "₦160k", b3: "₦90k", portfolio: "₦1,150,000", tbill1: "₦375,000", jarsTotal: "₦583k saved", jar1meta: "₦292k of ₦800k", networth: "₦1,462,500", thismonth: "+₦280,000", networthDisplay: "₦1,462,500", streakMonths: "3 months", savingsRate: "56%", tbillReturn: "₦79k", jarMonths: "9", networthShort: "₦1.46M" },
  800000: { income: "₦800,000", saved: "₦448k", spent: "₦187k", sub: "↑ 56% savings rate · ₦448k saved", b1: "₦400k", b2: "₦256k", b3: "₦144k", portfolio: "₦1,840,000", tbill1: "₦600,000", jarsTotal: "₦933k saved", jar1meta: "₦467k of ₦800k", networth: "₦2,340,000", thismonth: "+₦448,000", networthDisplay: "₦2,340,000", streakMonths: "4 months", savingsRate: "56%", tbillReturn: "₦126k", jarMonths: "7", networthShort: "₦2.3M" },
  1500000: { income: "₦1,500,000", saved: "₦840k", spent: "₦350k", sub: "↑ 56% savings rate · ₦840k saved", b1: "₦750k", b2: "₦480k", b3: "₦270k", portfolio: "₦3,450,000", tbill1: "₦1,125,000", jarsTotal: "₦1.75M saved", jar1meta: "₦875k of ₦800k", networth: "₦4,387,500", thismonth: "+₦840,000", networthDisplay: "₦4,387,500", streakMonths: "4 months", savingsRate: "56%", tbillReturn: "₦236k", jarMonths: "2", networthShort: "₦4.4M" },
};

const tiers = [
  { income: 300000, role: "Graduate", amount: "₦300k", saved: "→ ₦168k saved" },
  { income: 500000, role: "Mid-level", amount: "₦500k", saved: "→ ₦280k saved" },
  { income: 800000, role: "Senior", amount: "₦800k", saved: "→ ₦448k saved" },
  { income: 1500000, role: "Director", amount: "₦1.5M", saved: "→ ₦840k saved" },
] as const;

const tabs = [
  { index: "01 — Dashboard", title: "Your monthly budget at a glance", desc: "See your income split across buckets, what you've spent, what's remaining, and your savings rate.", stats: ["avg savings rate", "vs Nigerian avg"] },
  { index: "02 — Investments", title: "T-bills and investments, tracked", desc: "Log Treasury Bills with maturity dates and expected returns while tracking portfolio growth.", stats: ["T-bill rate p.a.", "avg return / T-bill"] },
  { index: "03 — Savings jars", title: "Save toward specific goals", desc: "Create jars for rent, devices, emergency funds, and shared goals with visual progress.", stats: ["months to rent", "monthly target"] },
  { index: "04 — Analytics", title: "See your wealth growing over time", desc: "Track monthly trends, net worth growth, savings streaks, and milestones.", stats: ["net worth (6mo)", "savings streak"] },
] as const;

const phoneNavItems = [
  { label: "Home", icon: LayoutDashboard },
  { label: "Invest", icon: TrendingUp },
  { label: "Jars", icon: Landmark },
  { label: "Analytics", icon: BarChart3 },
] as const;

export function AppShowcase() {
  const [activePanel, setActivePanel] = useState(0);
  const [currentIncome, setCurrentIncome] = useState<number>(800000);
  const [showTooltip, setShowTooltip] = useState(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineRef = useRef<SVGPathElement | null>(null);
  const areaRef = useRef<SVGPathElement | null>(null);

  const data = useMemo(() => incomeData[currentIncome], [currentIncome]);

  function resetAutoAdvance() {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(() => {
      setActivePanel((prev) => (prev + 1) % 4);
    }, AUTO_DURATION_MS);
  }

  useEffect(() => {
    resetAutoAdvance();
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [activePanel]);

  useEffect(() => {
    setShowTooltip(false);
    if (activePanel !== 3) return;
    const tipTimer = setTimeout(() => setShowTooltip(true), 1400);
    return () => {
      clearTimeout(tipTimer);
    };
  }, [activePanel]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8 }}
      className="relative px-4 py-20 md:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-widest text-white/50">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
            See it in action
          </p>
          <h2 className="max-w-4xl text-4xl font-normal leading-tight text-foreground md:text-6xl">
            Your entire financial life,
            <br />
            <em className="text-accent">finally organised.</em>
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/45 md:text-base">
            From your monthly budget to your T-bills maturing next week, Orjar shows your complete money picture in one clean workflow.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-20">
          <div className="space-y-3">
            {tabs.map((tab, idx) => {
              const isActive = idx === activePanel;
              return (
                <button key={tab.index} type="button" onClick={() => setActivePanel(idx)} className={cn("relative w-full border p-6 text-left transition-all", isActive ? "border-white/10 bg-white/[0.03]" : "border-transparent")}>
                  <motion.div key={`${idx}-${isActive}-${activePanel}`} className="absolute bottom-0 left-0 h-px bg-accent" animate={{ width: isActive ? "100%" : "0%" }} transition={isActive ? { duration: AUTO_DURATION_MS / 1000, ease: "linear" } : { duration: 0 }} />
                  <div className={cn("text-xs uppercase tracking-widest", isActive ? "text-accent" : "text-white/25")}>{tab.index}</div>
                  <h3 className={cn("mt-2 text-lg font-medium", isActive ? "text-foreground" : "text-white/45")}>{tab.title}</h3>
                  <AnimatePresence initial={false}>
                    {isActive ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <p className="mt-3 text-sm leading-relaxed text-white/45">{tab.desc}</p>
                        <div className="mt-3 flex gap-6 text-xs uppercase tracking-widest text-white/35">
                          <span className="text-accent">{idx === 0 ? data.savingsRate : idx === 1 ? "21%" : idx === 2 ? data.jarMonths : data.networthShort}</span>
                          <span>{idx === 0 ? "3×" : idx === 1 ? data.tbillReturn : idx === 2 ? "₦67k" : `🔥 ${data.streakMonths}`}</span>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </button>
              );
            })}

            <div className="pt-3">
              <p className="mb-3 text-xs uppercase tracking-widest text-white/25">Based on Nigerian income levels</p>
              <div className="grid grid-cols-2 gap-3">
                {tiers.map((tier) => (
                  <button key={tier.income} type="button" onClick={() => { setCurrentIncome(tier.income); setActivePanel(0); }} className={cn("border p-3 text-left", currentIncome === tier.income ? "border-accent/40 bg-accent/10" : "border-white/10")}>
                    <p className="text-[10px] uppercase tracking-widest text-white/35">{tier.role}</p>
                    <p className="text-sm font-medium text-foreground">{tier.amount}</p>
                    <p className="text-xs text-accent">{tier.saved}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="md:sticky md:top-[120px]">
            <div className="relative mx-auto w-[300px]">
              <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(124,99,253,0.25),transparent_70%)]" />
              <div className="relative rounded-[46px] border border-white/20 bg-[#141414] p-[3px] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_60px_120px_rgba(0,0,0,0.8)]">
                <div className="pointer-events-none absolute -left-[2px] top-24 h-14 w-[3px] rounded-r bg-white/20" />
                <div className="pointer-events-none absolute -left-[2px] top-44 h-10 w-[3px] rounded-r bg-white/20" />
                <div className="pointer-events-none absolute -right-[2px] top-36 h-16 w-[3px] rounded-l bg-white/20" />
                <div className="overflow-hidden rounded-[42px] border border-white/10 bg-[#0a0a0a]">
                  <div className="absolute left-1/2 top-3 z-10 h-[32px] w-[106px] -translate-x-1/2 rounded-[20px] border border-white/10 bg-black">
                    <div className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20" />
                    <div className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-white/20" />
                  </div>
                  <div className="relative h-[600px] bg-background pt-14">
                  <div className="mb-3 flex items-center justify-between px-4 text-[11px] text-white/60">
                    <span>9:41</span>
                    <BrandLogo className="h-4" />
                  </div>
                  <div className="h-[500px] overflow-hidden px-4">
                  <AnimatePresence mode="wait">
                    {activePanel === 0 && (
                      <motion.div key="p0" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                        <p className="text-[11px] text-white/40">Good morning,</p>
                        <p className="mb-4 text-sm text-foreground">Femi 👋</p>
                        <div className="mb-3 border border-accent/30 bg-accent/10 p-3">
                          <p className="text-[10px] uppercase tracking-widest text-white/40">Monthly income</p>
                          <motion.p key={currentIncome} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-2xl text-foreground">{data.income}</motion.p>
                          <p className="text-[10px] text-accent">{data.sub}</p>
                        </div>
                        <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="border border-white/10 bg-white/[0.04] p-2.5"><p className="text-white/40">Saved</p><p className="text-accent">{data.saved}</p></div>
                          <div className="border border-white/10 bg-white/[0.04] p-2.5"><p className="text-white/40">Spent</p><p className="text-amber-400">{data.spent}</p></div>
                        </div>
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">Buckets</p>
                        {[
                          { n: "Pay yourself", p: "50%", a: data.b1, w: "45%" },
                          { n: "Lifestyle", p: "32%", a: data.b2, w: "73%" },
                          { n: "Misc", p: "18%", a: data.b3, w: "55%" },
                        ].map((row) => (
                          <div key={row.n} className="mb-2 text-[10px]">
                            <div className="mb-1 flex justify-between text-white/50"><span>{row.n} {row.p}</span><span>{row.a}</span></div>
                            <div className="h-[3px] bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: row.w }} className="h-[3px] bg-accent" /></div>
                          </div>
                        ))}
                        <div className="mt-3 mb-2">
                          <p className="text-[10px] uppercase tracking-widest text-white/35">Target savings</p>
                          <div className="mt-2 border border-white/10 bg-white/[0.02] px-2.5 py-3">
                            <div className="mx-auto w-[128px]">
                              <div className="relative h-[128px] w-[128px]">
                                <svg viewBox="0 0 128 128" className="h-[128px] w-[128px] -rotate-90">
                                  <circle cx="64" cy="64" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8" />
                                </svg>
                                <span className="absolute left-1/2 top-[12px] h-2 w-2 -translate-x-1/2 rounded-full bg-emerald-500" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-base">🏠</span>
                                  <span className="mt-0.5 text-base text-foreground">0%</span>
                                </div>
                              </div>
                            </div>
                            <div className="mt-1 text-center">
                              <p className="text-base text-foreground">Rent</p>
                              <p className="mt-0.5 text-xs text-white/45">₦0 / ₦800k</p>
                              <p className="mt-0.5 text-xs text-white/55">Target ₦66,667/mo</p>
                              <p className="mx-auto mt-2 inline-flex border border-amber-500/50 px-3 py-1 text-xs font-medium tracking-wide text-amber-400">
                                BEHIND
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-xs text-white/45">Manage jars →</p>
                        </div>
                      </motion.div>
                    )}
                    {activePanel === 1 && (
                      <motion.div key="p1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="text-xs">
                        <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] text-white/60">
                          <span>Invest...</span>
                          <span>April 2026</span>
                          <span>AS</span>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-white/30">Investments</p>
                        <p className="text-2xl leading-none text-foreground">Portfolio</p>
                        <p className="mb-2 mt-1 text-[9px] leading-relaxed text-white/45">
                          Track T-bills, funds, and other holdings. Active positions roll into your dashboard totals.
                        </p>
                        <div className="space-y-1">
                          <div className="border border-white/10 bg-white/[0.02] p-2">
                            <p className="text-[9px] uppercase tracking-widest text-white/35">Active portfolio</p>
                            <p className="mt-0.5 text-2xl leading-none text-accent">₦10,000</p>
                          </div>
                          <div className="border border-accent/35 bg-accent/10 p-2">
                            <p className="text-[9px] uppercase tracking-widest text-accent/70">Confirmed returns</p>
                            <p className="mt-0.5 text-2xl leading-none text-accent">₦0</p>
                          </div>
                          <div className="border border-white/10 bg-white/[0.02] p-2">
                            <p className="text-[9px] uppercase tracking-widest text-white/35">Total</p>
                            <p className="mt-0.5 text-2xl leading-none text-foreground">₦10,000</p>
                          </div>
                        </div>
                        <p className="mt-1.5 inline-flex border border-white/20 px-2 py-1 text-[10px] text-white/75">
                          T-Bill / FGN: ₦10,000
                        </p>
                        <div className="mt-1.5 border border-dashed border-white/15 p-2">
                          <p className="text-[9px] uppercase tracking-widest text-white/35">Add investment</p>
                          <div className="mt-1 border border-white/10 px-2 py-1 text-[10px] text-white/60">Other</div>
                        </div>
                      </motion.div>
                    )}
                    {activePanel === 2 && (
                      <motion.div key="p2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="text-xs">
                        <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px] text-white/60">
                          <span>Saving...</span>
                          <span>April 2026</span>
                          <span>AS</span>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-white/30">Goals</p>
                        <p className="text-2xl leading-none text-foreground">Savings jars</p>
                        <p className="mb-2 mt-1 text-[10px] leading-relaxed text-white/45">
                          Multiple targets - rent, gadgets, emergency fund - each with its own pace.
                        </p>
                        <button
                          type="button"
                          className="mb-3 inline-flex items-center gap-2 border border-accent/55 px-3 py-1.5 text-sm text-accent"
                        >
                          <span className="text-base leading-none">+</span>
                          <span>New jar</span>
                        </button>

                        <div className="space-y-2">
                          <div className="border border-white/10 bg-white/[0.02] p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-base leading-none">🏠 <span className="ml-1 text-sm align-middle text-foreground">Rent</span></p>
                                <p className="mt-0.5 text-[10px] text-white/45">0 contributions · Pinned to Home</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm leading-none text-foreground">₦0 / ₦800,000</p>
                                <p className="mt-0.5 text-[10px] text-white/45">0% funded</p>
                              </div>
                            </div>
                            <div className="mt-2 h-[3px] bg-white/10" />
                          </div>
                          <div className="border border-white/10 bg-white/[0.02] p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-base leading-none">🚘 <span className="ml-1 text-sm align-middle text-foreground">Car</span></p>
                                <p className="mt-0.5 text-[10px] text-white/45">0 contributions</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm leading-none text-foreground">₦0 / ₦1,000,000</p>
                                <p className="mt-0.5 text-[10px] text-white/45">0% funded</p>
                              </div>
                            </div>
                            <div className="mt-2 h-[3px] bg-white/10" />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-[9px] uppercase tracking-widest text-white/35">Group jars</p>
                          <button type="button" className="text-xs text-accent">+ New group jar</button>
                        </div>
                        <div className="mt-2 border border-white/10 bg-white/[0.02] p-2.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-foreground">✈️ Travel to Ghana</p>
                            <span className="text-[10px] text-accent">GROUP</span>
                          </div>
                          <p className="mt-1 text-[10px] text-white/45">Admin · 2 members</p>
                        </div>
                      </motion.div>
                    )}
                    {activePanel === 3 && (
                      <motion.div key="p3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="text-xs">
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-white/30">Net worth over time</p>
                        <div className="mb-3 h-[120px] border border-white/10 bg-white/[0.02] p-1.5">
                          <svg viewBox="0 0 268 100" preserveAspectRatio="none" className="h-full w-full">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7C63FD" stopOpacity="0.42" />
                                <stop offset="100%" stopColor="#7C63FD" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <line x1="0" y1="80" x2="268" y2="80" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                            <line x1="0" y1="55" x2="268" y2="55" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                            <line x1="0" y1="30" x2="268" y2="30" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                            <path ref={areaRef} d="M0,95 L0,80 C30,78 50,72 80,65 C110,58 130,52 160,42 C190,32 220,22 268,8 L268,95 Z" fill="url(#chartGrad)" opacity="1" />
                            <path ref={lineRef} d="M0,80 C30,78 50,72 80,65 C110,58 130,52 160,42 C190,32 220,22 268,8" fill="none" stroke="#A694FF" strokeWidth="3" />
                            {showTooltip ? <circle cx="200" cy="28" r="4.5" fill="#A694FF" /> : null}
                          </svg>
                        </div>
                        <div className="mb-3 border border-white/10 bg-white/[0.02] p-2.5">
                          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/35">Monthly savings trend</p>
                          <div className="flex h-14 items-end gap-1.5">
                            {[35, 48, 42, 60, 56, 72].map((h, idx) => (
                              <div key={idx} className="flex-1 bg-white/10">
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${h}%` }}
                                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                                  className="w-full bg-accent"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-1 flex justify-between text-[9px] text-white/35">
                            <span>Jan</span>
                            <span>Mar</span>
                            <span>May</span>
                            <span>Jun</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="border border-accent/20 bg-accent/10 p-2.5 text-white/80">🔥 Savings streak <span className="float-right text-accent">{data.streakMonths}</span></div>
                          <div className="border border-white/10 bg-white/[0.04] p-2.5 text-white/70">Net worth <span className="float-right text-accent">{data.networth}</span></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex border-t border-white/10 bg-background/95 py-2.5 pb-4">
                    {phoneNavItems.map((item, idx) => (
                      <button key={item.label} type="button" onClick={() => setActivePanel(idx)} className="relative flex flex-1 flex-col items-center justify-center gap-0.5">
                        <span className={cn("mb-0.5 h-1 w-1 rounded-full", idx === activePanel ? "bg-accent" : "bg-transparent")} />
                        <item.icon className={cn("h-4 w-4", idx === activePanel ? "text-accent" : "text-white/40")} strokeWidth={1.75} />
                        <span className={cn("text-[9px]", idx === activePanel ? "text-accent" : "text-white/35")}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              </div>
              <div className="mt-4 flex justify-center gap-1.5">
                {[0, 1, 2, 3].map((dot) => (
                  <button key={dot} type="button" onClick={() => setActivePanel(dot)} className={cn("h-1.5 rounded-full bg-white/20 transition-all", dot === activePanel ? "w-5 bg-accent" : "w-1.5")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

