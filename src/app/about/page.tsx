import type { Metadata } from "next";
import Link from "next/link";
import { AlertState } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Pháp lý và nguồn dữ liệu",
  description: "Thông tin nguồn MangaDex, image proxy và quy trình DMCA của InkRail.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 editorial-title text-5xl md:text-7xl">Nguồn dữ liệu và quyền nội dung</h1>
      <div className="mt-10 space-y-8 font-display text-xl leading-9 text-muted-foreground">
        <p>
          InkRail là sản phẩm độc lập, không liên kết với MangaDex. Metadata chương được lấy từ{" "}
          <a href="https://mangadex.org" target="_blank" rel="noreferrer" className="text-primary hover:underline">MangaDex</a>;
          nội dung truyện thuộc quyền của tác giả, nhà xuất bản và nhóm dịch tương ứng.
        </p>
        <p>
          Yêu cầu ảnh được chuyển tiếp qua backend của InkRail tới máy chủ nguồn. Ảnh chương không được lưu vào Supabase Storage hoặc cache offline trên thiết bị; cache upstream chỉ tồn tại ngắn hạn. Storage của ứng dụng dành cho avatar và tệp người dùng.
        </p>
        <p>
          Nếu bạn đại diện cho chủ sở hữu quyền hoặc là trưởng nhóm dịch đang hoạt động trên MangaDex, hãy gửi yêu cầu gỡ nội dung kèm URL truyện/chương, URL nhóm và thông tin liên hệ qua{" "}
          <Link href="/content-removal" className="text-primary hover:underline">biểu mẫu Content Removal</Link>.
        </p>
        <p>InkRail hiện không tích hợp quảng cáo hoặc bán quyền truy cập vào nội dung từ MangaDex.</p>
      </div>
      <AlertState className="mt-10">
        <h2 className="section-title">Nguồn ưu tiên</h2>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          <li><a href="https://mangadex.org" target="_blank" rel="noreferrer" className="hover:text-primary">MangaDex</a>: metadata, chapter feed, nhóm dịch và MangaDex@Home.</li>
        </ul>
      </AlertState>
    </main>
  );
}
