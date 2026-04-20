const MARQUEE_TEXT =
  "T-BILLS TRACKER · GROCERY LIST · RENT JAR · INVESTMENT LOG · BUCKET BUDGETING · NAIRA-FIRST · ";

export function MarqueeStrip() {
  const block = MARQUEE_TEXT.repeat(4);
  return (
    <div className="relative overflow-hidden border-y border-white/5 py-3">
      <div className="flex w-max animate-marquee">
        <p className="shrink-0 whitespace-nowrap px-4 text-[10px] font-medium uppercase tracking-[0.35em] text-white/20 md:text-xs">
          {block}
        </p>
        <p
          className="shrink-0 whitespace-nowrap px-4 text-[10px] font-medium uppercase tracking-[0.35em] text-white/20 md:text-xs"
          aria-hidden
        >
          {block}
        </p>
      </div>
    </div>
  );
}
