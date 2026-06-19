import { SkeletonBlock } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      {/* Hero skeleton */}
      <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-4 sm:grid-cols-[160px_minmax(0,1fr)] md:grid-cols-[minmax(240px,340px)_1fr] md:gap-10">
        <SkeletonBlock className="aspect-[2/3] w-full max-w-[160px] md:max-w-none" />
        <div className="space-y-3 pt-1">
          <SkeletonBlock className="h-3 w-32" />
          <SkeletonBlock className="h-10 w-3/4" />
          <SkeletonBlock className="h-4 w-full" />
          <SkeletonBlock className="h-4 w-5/6" />
          <SkeletonBlock className="h-4 w-4/6" />
          <div className="mt-5 flex gap-2">
            <SkeletonBlock className="h-10 w-32 rounded-full" />
            <SkeletonBlock className="h-10 w-32 rounded-full" />
          </div>
        </div>
      </div>

      {/* Rail skeletons */}
      {[0, 1, 2].map((rail) => (
        <div key={rail} className="mt-12">
          <SkeletonBlock className="mb-4 h-3 w-24" />
          <SkeletonBlock className="mb-6 h-8 w-1/2" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="aspect-[2/3] w-full rounded-[var(--radius-control)]" />
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}