import { Skeleton } from "@/components/ui/Skeleton";

export default function GroceryLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Skeleton className="mb-3 h-2.5 w-16" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="mb-3 bg-white/[0.03] p-4">
          <div className="mb-3 flex justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="mb-2 h-1 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
