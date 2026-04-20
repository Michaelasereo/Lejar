export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded bg-white/5" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-36 border border-white/5 bg-[#111111]" />
      ))}
    </div>
  );
}
