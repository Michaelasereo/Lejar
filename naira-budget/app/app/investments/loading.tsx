import { Skeleton } from "@/components/ui/Skeleton";

export default function InvestmentsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] p-4">
            <Skeleton className="mb-2 h-2.5 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-3 h-2.5 w-24" />
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="mb-3 bg-white/[0.03] p-4">
          <div className="mb-3 flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mb-2 h-1 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        </div>
      ))}
      <Skeleton className="mb-3 mt-6 h-2.5 w-32" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] py-3.5">
          <Skeleton className="h-8 w-8 flex-shrink-0 rounded-md" />
          <div className="flex-1">
            <Skeleton className="mb-1.5 h-3 w-24" />
            <Skeleton className="h-2.5 w-32" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
