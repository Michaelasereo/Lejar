import { Skeleton } from "@/components/ui/Skeleton";

export default function ExpensesLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6">
        <Skeleton className="mb-2 h-10 w-48" />
        <Skeleton className="mb-2 h-1.5 w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="mb-6">
          <Skeleton className="mb-3 h-2.5 w-20" />
          {Array.from({ length: g === 0 ? 2 : 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-white/[0.04] py-3.5">
              <Skeleton className="h-7 w-7 flex-shrink-0 rounded-md" />
              <div className="flex-1">
                <Skeleton className="mb-1.5 h-3 w-28" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <Skeleton className="h-3 w-14" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
