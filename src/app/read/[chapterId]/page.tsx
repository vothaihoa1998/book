import type { Metadata } from "next";
import { ReaderClient } from "@/components/reader-client";
import { getChapter, getChapters, getManga } from "@/lib/sources";
import { truncate } from "@/lib/utils";

export const revalidate = 2592000;

type Props = {
  params: Promise<{ chapterId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  const manga = await getManga(chapter.mangaId);
  const title = `${manga.title} - Chương ${chapter.number}`;

  return {
    title,
    description: truncate(`Đọc ${title} trên InkRail với reader tối giản, hỗ trợ offline và đồng bộ tiến độ.`, 155),
    alternates: { canonical: `/read/${encodeURIComponent(chapter.id)}` },
    openGraph: {
      title,
      description: truncate(manga.description, 160),
      images: manga.cover ? [{ url: manga.cover, alt: manga.title }] : undefined,
    },
  };
}

export default async function ReadPage({ params }: Props) {
  const { chapterId } = await params;
  const chapter = await getChapter(chapterId);
  const manga = await getManga(chapter.mangaId);
  const chapters = await getChapters(manga.id);

  return <ReaderClient manga={manga} chapter={chapter} chapters={chapters} />;
}
