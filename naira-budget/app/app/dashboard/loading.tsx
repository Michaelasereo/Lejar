import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] p-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-2 h-2.5 w-16" />
          </div>
        ))}
      </div>
      <div className="mb-2">
        <Skeleton className="mb-3 h-3 w-16" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-2 flex items-center gap-3 bg-white/[0.03] p-4">
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-3 max-w-[120px] flex-1" />
          <Skeleton className="flex-[2] h-1.5" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-white/[0.03] p-5">
          <Skeleton className="mb-4 h-3 w-16" />
          <div className="mb-4 flex items-center justify-center">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <Skeleton className="mx-auto mb-2 h-3 w-32" />
          <Skeleton className="mx-auto h-2.5 w-24" />
        </div>
        <div className="bg-white/[0.03] p-5">
          <Skeleton className="mb-4 h-3 w-20" />
          <Skeleton className="mb-4 h-8 w-36" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="mb-3 flex items-center gap-2">
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-2.5 flex-1" />
              <Skeleton className="h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <Skeleton className="mb-3 h-3 w-28" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] py-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <div className="flex-1">
              <Skeleton className="mb-1.5 h-3 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
