import type { Metadata } from "next";
import { headers } from "next/headers";
import { ReaderClient } from "@/components/reader-client";
import { getChapter, getChapters, getManga } from "@/lib/sources";
import { siteConfig } from "@/lib/seo";
import { imageProxyUrl } from "@/lib/types";
import { absoluteUrl, truncate } from "@/lib/utils";

export const revalidate = 2592000;

type Props = {
  params: Promise<{ chapterId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  const manga = await getManga(chapter.mangaId);
  const title = `${manga.title} - Chương ${chapter.number}`;
  const description = truncate(`Đọc ${title} trên InkRail với reader tối giản, giao diện tối dễ chịu, page progress và đồng bộ tiến độ.`, 155);
  const cover = manga.cover ? absoluteUrl(imageProxyUrl(manga.cover, manga.source)) : siteConfig.ogImage;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/read/${encodeURIComponent(chapter.id)}`) },
    openGraph: {
      title,
      description,
      type: "article",
      images: [{ url: cover, alt: `Đọc ${manga.title} chương ${chapter.number}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [cover],
    },
  };
}

export default async function ReadPage({ params }: Props) {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  const manga = await getManga(chapter.mangaId);
  const chapters = await getChapters(manga.id);
  // Inherit the app theme so the reader doesn't clash with the shell on first paint.
  const headerList = await headers();
  const cookieTheme = headerList.get("x-inkrail-theme");
  const initialTheme: "light" | "dark" = cookieTheme === "dark" ? "dark" : "light";

  return <ReaderClient manga={manga} chapter={chapter} chapters={chapters} initialAppTheme={initialTheme} />;
}
