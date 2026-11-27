export default function ReaderLoading() {
  return <main aria-busy="true" aria-label="Đang mở chương" className="min-h-dvh bg-background px-4 pt-20 text-foreground">
    <div className="mx-auto max-w-xl">
      <p role="status" className="mb-5 text-center text-sm text-muted-foreground">Đang mở chương…</p>
      <div className="aspect-[2/3] w-full rounded-xl bg-secondary motion-safe:animate-pulse" />
    </div>
  </main>;
}
