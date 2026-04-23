import { Skeleton } from "@/components/ui/Skeleton";

export default function AnalyticsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] p-4">
            <Skeleton className="mb-2 h-2.5 w-16" />
            <Skeleton className="mb-1 h-7 w-24" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-3 h-2.5 w-36" />
      <Skeleton className="mb-8 h-[280px] w-full" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <Skeleton className="mb-3 h-2.5 w-28" />
          <Skeleton className="h-[180px] w-full" />
        </div>
        <div>
          <Skeleton className="mb-3 h-2.5 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-3">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-2 flex-1" />
              <Skeleton className="h-2.5 w-14" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
