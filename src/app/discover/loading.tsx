import { SkeletonBlock } from "@/components/ui/primitives";

export default function DiscoverLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="mt-4 h-16 max-w-2xl" />
        <SkeletonBlock className="mt-5 h-6 max-w-xl bg-card" />
      </div>
      <div className="grid gap-3 border-y border-border bg-card/70 p-4 md:grid-cols-[minmax(220px,1.4fr)_140px_150px_140px_120px_auto] md:p-5">
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-12" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <SkeletonBlock className="aspect-[2/3] rounded-[2px]" />
            <SkeletonBlock className="mt-4 h-5 bg-card" />
            <SkeletonBlock className="mt-2 h-3 w-2/3 bg-card" />
          </div>
        ))}
      </div>
    </main>
  );
}
