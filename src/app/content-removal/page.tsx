import type { Metadata } from "next";
import { ContentRemovalForm } from "@/components/content-removal-form";

export const metadata: Metadata = {
  title: "Yêu cầu gỡ nội dung",
  description: "Gửi yêu cầu gỡ nội dung MangaDex hoặc nội dung thuộc nhóm dịch.",
  robots: { index: false },
};

export default function ContentRemovalPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Content Removal</p>
      <h1 className="mt-3 editorial-title text-4xl sm:text-6xl">Yêu cầu gỡ nội dung</h1>
      <div className="my-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-6 text-muted-foreground">
        Yêu cầu được đưa vào hàng đợi riêng và xem xét thủ công. Với nhóm dịch, InkRail sẽ xác minh yêu cầu đến từ trưởng nhóm đang hoạt động trên MangaDex. Việc gửi biểu mẫu chưa tự động xác nhận quyền sở hữu hoặc gỡ nội dung.
      </div>
      <ContentRemovalForm />
    </main>
  );
}
