export default function GroceryLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-56 rounded bg-white/5" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 border border-white/5 bg-[#111111]" />
        ))}
      </div>
      <div className="h-36 border border-white/5 bg-[#111111]" />
      <div className="h-64 border border-white/5 bg-[#111111]" />
    </div>
  );
}
