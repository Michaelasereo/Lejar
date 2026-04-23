import { Skeleton } from "@/components/ui/Skeleton";

export default function JarsLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="mb-2 h-2.5 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-4 h-2.5 w-20" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white/[0.03] p-5">
            <div className="mb-4 flex items-start justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="mb-4 flex justify-center">
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <Skeleton className="mx-auto mb-2 h-3 w-32" />
            <Skeleton className="mx-auto mb-4 h-2.5 w-24" />
            <Skeleton className="mb-3 h-1 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
