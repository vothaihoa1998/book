export default function DiscoverLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mb-8 max-w-3xl">
        <div className="h-3 w-20 rounded-[8px] bg-surface-strong" />
        <div className="mt-4 h-16 max-w-2xl rounded-[8px] bg-surface-strong" />
        <div className="mt-5 h-6 max-w-xl rounded-[8px] bg-surface" />
      </div>
      <div className="grid gap-3 border-y border-border bg-surface/70 p-4 md:grid-cols-[minmax(220px,1.4fr)_140px_150px_140px_120px_auto] md:p-5">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-12 rounded-[8px] bg-surface-strong" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index}>
            <div className="aspect-[2/3] rounded-[2px] bg-surface-strong" />
            <div className="mt-4 h-5 rounded-[8px] bg-surface" />
            <div className="mt-2 h-3 w-2/3 rounded-[8px] bg-surface" />
          </div>
        ))}
      </div>
    </main>
  );
}
