import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Bản nháp điều khoản sử dụng InkRail, chờ thông tin đơn vị vận hành và rà soát pháp lý.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Terms of Service · Draft</p>
      <h1 className="mt-3 editorial-title text-4xl sm:text-6xl">Điều khoản sử dụng</h1>
      <div role="note" className="my-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-6">
        <strong>BẢN NHÁP — CHƯA SẴN SÀNG ĐỂ XUẤT BẢN.</strong> Cần bổ sung tên pháp lý của đơn vị vận hành, khu vực áp dụng, ngày hiệu lực và rà soát với chuyên gia pháp lý. Nội dung này không phải tư vấn pháp lý.
      </div>

      <div className="space-y-7 text-sm leading-7 text-muted-foreground">
        <p>Đơn vị vận hành dự kiến: <strong className="text-foreground">[TÊN PHÁP LÝ / CÁ NHÂN VẬN HÀNH]</strong>. Khu vực áp dụng: <strong className="text-foreground">[QUỐC GIA / KHU VỰC]</strong>. Ngày hiệu lực: <strong className="text-foreground">[CHƯA ẤN ĐỊNH]</strong>.</p>

        <section>
          <h2 className="section-title text-foreground">1. Dịch vụ và nguồn nội dung</h2>
          <p>InkRail cung cấp giao diện đọc và quản lý thư viện cá nhân. Metadata, chapter và ảnh được lấy hoặc chuyển tiếp từ các nguồn bên thứ ba, bao gồm MangaDex. InkRail độc lập, không liên kết với MangaDex; bản quyền tác phẩm thuộc về các chủ sở hữu quyền tương ứng.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">2. Điều kiện sử dụng nguồn MangaDex</h2>
          <p>InkRail hiện không tích hợp quảng cáo hoặc bán quyền truy cập vào nội dung lấy từ MangaDex. Nguồn MangaDex và nhóm dịch được ghi nhận tại các trang truyện/chapter. Yêu cầu gỡ hợp lệ được tiếp nhận qua <Link href="/content-removal" className="text-primary underline-offset-2 hover:underline">biểu mẫu Content Removal</Link> và được xem xét thủ công.</p>
          <p className="mt-2">Việc dùng API miễn phí không tự cấp quyền phân phối tác phẩm. Phạm vi giấy phép/ủy quyền cho từng nguồn nội dung cần được đơn vị vận hành xác minh và lưu hồ sơ trước khi phát hành.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">3. Tài khoản và nội dung người dùng</h2>
          <p>Tài khoản có thể lưu hồ sơ, bookmark, truyện theo dõi, tiến độ đọc, tùy chọn và bình luận. Người dùng chịu trách nhiệm với nội dung họ đăng và không được gửi nội dung trái luật hoặc xâm phạm quyền của người khác. Cơ chế xử lý vi phạm, khiếu nại và chấm dứt tài khoản cần được đơn vị vận hành hoàn thiện trước ngày hiệu lực.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">4. Tính khả dụng</h2>
          <p>Nội dung bên thứ ba có thể thay đổi, bị gỡ hoặc tạm thời không khả dụng. InkRail không cam kết thời gian hoạt động hoặc tính đầy đủ của dữ liệu nguồn. Các giới hạn trách nhiệm cụ thể phải được rà soát theo luật áp dụng trước khi sử dụng bản này.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">5. Liên hệ</h2>
          <p>Câu hỏi về điều khoản hoặc yêu cầu gỡ nội dung: <a href="mailto:contactinkrail@proton.me" className="text-primary hover:underline">contactinkrail@proton.me</a>. Cần bổ sung địa chỉ liên hệ pháp lý và quy trình khiếu nại: <strong className="text-foreground">[CHƯA CUNG CẤP]</strong>.</p>
        </section>

        <p className="border-t border-border pt-4 text-xs">Trạng thái tài liệu: bản nháp nội bộ; không thay thế tư vấn pháp lý.</p>
      </div>
    </main>
  );
}
