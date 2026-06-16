import { getHome } from "@/lib/sources";
import { absoluteUrl } from "@/lib/utils";

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

export async function GET() {
  const home = await getHome();
  const items = home.recent
    .map((manga) => {
      const link = absoluteUrl(`/manga/${encodeURIComponent(manga.id)}`);
      return `<item><title>${escapeXml(manga.title)} - chương ${escapeXml(manga.lastChapter ?? "mới")}</title><link>${link}</link><guid>${link}</guid><pubDate>${new Date(manga.updatedAt).toUTCString()}</pubDate><description>${escapeXml(manga.description)}</description></item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>InkRail - Chương mới</title><link>${absoluteUrl("/")}</link><description>RSS chương mới từ các nguồn truyện đã chuẩn hoá.</description>${items}</channel></rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=1800, stale-while-revalidate=86400",
    },
  });
}
