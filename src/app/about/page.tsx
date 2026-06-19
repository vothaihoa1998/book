import type { Metadata } from "next";
import { AlertState } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Pháp lý và nguồn dữ liệu",
  description: "Thông tin nguồn MangaDex, OTruyen, image proxy và quy trình DMCA của InkRail.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-muted">About</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Nguồn dữ liệu và quyền nội dung</h1>
      <div className="mt-10 space-y-8 font-display text-xl leading-9 text-muted">
        <p>
          InkRail là client tổng hợp metadata và đường dẫn đọc từ các nguồn công khai như MangaDex và OTruyen. Nội dung được chuẩn hoá để người đọc có trải nghiệm nhất quán hơn trên web.
        </p>
        <p>
          Ảnh trang truyện được proxy có cache nhằm giảm hotlink và cải thiện tốc độ đọc cá nhân. Ứng dụng không lưu ảnh manga/chapter của bên thứ ba vào Supabase Storage; Storage chỉ dành cho avatar và tệp người dùng.
        </p>
        <p>
          Nếu bạn là chủ sở hữu quyền và muốn gỡ nội dung khỏi chỉ mục/proxy, gửi yêu cầu DMCA với URL truyện/chương, bằng chứng sở hữu và thông tin liên hệ tới email vận hành dự án.
        </p>
      </div>
      <AlertState className="mt-10">
        <h2 className="font-display text-3xl font-semibold">Nguồn ưu tiên</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
          <li>MangaDex API: metadata, chapter feed, cover art và at-home image server.</li>
          <li>OTruyen API: danh sách tiếng Việt, tìm kiếm và chapter image CDN.</li>
          <li>Firecrawl fallback: chỉ nên bật khi cần tìm truyện không có ở hai nguồn chính, kèm cache aggressive.</li>
        </ul>
      </AlertState>
    </main>
  );
}
