export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="h-8 w-48 rounded bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 border border-white/5 bg-[#111111]" />
        ))}
      </div>
      <div className="h-64 border border-white/5 bg-[#111111]" />
    </div>
  );
}
