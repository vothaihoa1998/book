import { SkeletonBlock } from "@/components/ui/primitives";

export default function DiscoverLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-4 h-14 max-w-2xl sm:h-20" />
        <SkeletonBlock className="mt-5 h-5 max-w-xl bg-card" />
      </div>
      <div className="grid gap-3 rounded-[var(--radius-card)] border border-border bg-card p-3 sm:grid-cols-[minmax(220px,1.4fr)_auto] sm:p-4 md:p-5">
        <SkeletonBlock className="h-12" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-12 w-28" />
          <SkeletonBlock className="h-12 w-24" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <SkeletonBlock className="aspect-[2/3] rounded-[var(--radius-control)]" />
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-2/3 bg-card" />
          </div>
        ))}
      </div>
    </main>
  );
}
