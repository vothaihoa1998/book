import type { Metadata } from "next";
import Link from "next/link";
import { getContentPreferences } from "@/lib/content-preferences";
import { mangaFormatLabels, type MangaFormat } from "@/lib/types";
import { saveContentPreferences } from "./actions";

export const metadata: Metadata = { title: "Tùy chọn nội dung" };

const demographics = ["shounen", "shoujo", "seinen", "josei"] as const;

export default async function ContentPreferencesPage({ searchParams }: PageProps<"/preferences">) {
  const [prefs, { status }] = await Promise.all([getContentPreferences(), searchParams]);
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 md:pt-12">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Trang chủ</Link>
      <h1 className="mt-4 font-display text-4xl text-foreground">Tùy chọn nội dung</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ẩn nội dung khỏi trang chủ theo thông tin từng nguồn cung cấp.</p>
      {status === "saved" && <p role="status" className="mt-4 text-sm text-accent-2">Đã lưu tùy chọn.</p>}
      {status === "local" && <p role="status" className="mt-4 text-sm text-primary">Đã lưu trên thiết bị, chưa đồng bộ được tài khoản.</p>}
      {status === "invalid" && <p role="alert" className="mt-4 text-sm text-danger">Nhập tối đa 16 thẻ, mỗi thẻ tối đa 64 ký tự.</p>}
      <form action={saveContentPreferences} className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-7">
        <fieldset>
          <legend className="mb-3 font-semibold">Loại truyện muốn ẩn</legend>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(mangaFormatLabels) as MangaFormat[]).map((format) => (
              <label className="flex items-center gap-2 text-sm" key={format}>
                <input type="checkbox" name="format" value={format} defaultChecked={prefs.hiddenFormats.includes(format)} className="accent-primary" />
                {mangaFormatLabels[format]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="border-t border-border pt-4">
          <legend className="float-left mb-3 w-full font-semibold">Nhóm độc giả muốn ẩn</legend>
          <div className="flex w-full flex-wrap gap-4">
            {demographics.map((value) => (
              <label className="flex items-center gap-2 text-sm capitalize" key={value}>
                <input type="checkbox" name="demographic" value={value} defaultChecked={prefs.hiddenDemographics.includes(value)} className="accent-primary" />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block border-t border-border pt-4">
          <span className="block font-semibold">Thể loại hoặc chủ đề muốn ẩn</span>
          <span className="mt-1 block text-sm text-muted-foreground">Dùng tên thẻ trên trang truyện, ngăn cách bằng dấu phẩy.</span>
          <input name="tags" defaultValue={prefs.hiddenTags.join(", ")} className="mt-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 border-t border-border pt-4 text-sm">
          <input type="checkbox" name="hideSuggestive" defaultChecked={prefs.hideSuggestive} className="accent-primary" />
          Ẩn truyện được nguồn gắn nhãn nhạy cảm
        </label>
        <button className="ink-cta rounded-lg px-4 py-2.5 text-sm font-semibold">Lưu tùy chọn</button>
      </form>
    </main>
  );
}
