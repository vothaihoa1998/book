import Link from "next/link";

export default function MangaNotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-20">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h1 className="font-display text-4xl">Truyện chưa khả dụng</h1>
        <p className="mt-3 text-sm text-muted-foreground">Không tìm thấy truyện này hoặc nguồn đang tạm gián đoạn.</p>
        <Link href="/discover" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">← Khám phá truyện</Link>
      </div>
    </main>
  );
}
