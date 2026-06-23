import { BookmarkPlus, Flame, Sparkles, type LucideIcon } from "lucide-react";

export type HomeSection = {
  id: "continue" | "trending" | "recent" | "new" | "completed" | "recommended";
  label: string;
  title: string;
  href?: string;
  icon?: LucideIcon;
  variant: "rail" | "ranked" | "editorial";
  count: number;
};

/**
 * Phase H2: Home section registry — single source of truth for which sections
 * appear on home and what variant each one uses. Anti-AI: mix of 3 variants
 * (rail / ranked list / editorial) so the page has rhythm.
 */
export const homeSections: HomeSection[] = [
  { id: "continue", label: "Tiếp tục", title: "Bộ truyện đang dở", href: "/library", icon: BookmarkPlus, variant: "rail", count: 8 },
  { id: "trending", label: "Hot tuần", title: "Đang được chú ý", href: "/discover?sort=hot", icon: Flame, variant: "ranked", count: 8 },
  { id: "recent", label: "Mới cập nhật", title: "Chương vừa lên kệ", href: "/discover?sort=latest", icon: Sparkles, variant: "editorial", count: 5 },
  { id: "new", label: "Mới ra mắt", title: "Truyện mới để thử", href: "/discover?sort=latest&status=ongoing", icon: Sparkles, variant: "rail", count: 10 },
  { id: "completed", label: "Đã hoàn thành", title: "Đọc liền mạch không chờ", href: "/discover?status=completed", icon: BookmarkPlus, variant: "rail", count: 10 },
];