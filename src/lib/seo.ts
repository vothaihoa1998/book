import { absoluteUrl } from "./utils";

export const siteConfig = {
  name: "InkRail",
  title: "InkRail - Đọc truyện tranh mượt, tối giản và đồng bộ",
  shortTitle: "InkRail",
  description:
    "Đọc truyện tranh online với giao diện tối dễ chịu, tìm kiếm nhanh, bộ lọc rõ ràng, reader mượt trên mobile và đồng bộ thư viện bằng Supabase.",
  ogDescription:
    "Web đọc truyện tranh mobile-first: khám phá truyện, lưu tiến độ, bookmark, bình luận và đọc lâu không mỏi mắt.",
  keywords: [
    "InkRail",
    "đọc truyện tranh",
    "manga online",
    "manhwa",
    "webtoon",
    "truyện tranh online",
    "reader manga",
    "bookmark truyện",
    "Supabase manga reader",
  ],
  locale: "vi_VN",
  themeColor: "#050814",
  accentColor: "#f2b84b",
  url: absoluteUrl("/"),
  ogImage: absoluteUrl("/opengraph-image"),
  twitterImage: absoluteUrl("/twitter-image"),
};

export function pageTitle(title: string) {
  return `${title} | ${siteConfig.name}`;
}
