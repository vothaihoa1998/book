import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư",
  description: "Bản nháp quyền riêng tư InkRail, chờ xác nhận thời hạn lưu trữ và thông tin đơn vị vận hành.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Privacy Policy · Draft</p>
      <h1 className="mt-3 editorial-title text-4xl sm:text-6xl">Chính sách quyền riêng tư</h1>
      <div role="note" className="my-6 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-6">
        <strong>BẢN NHÁP — CHƯA SẴN SÀNG ĐỂ XUẤT BẢN.</strong> Cần xác nhận đơn vị vận hành, nơi lưu trữ, thời hạn lưu dữ liệu, khu vực áp dụng và rà soát pháp lý. Nội dung này không phải tư vấn pháp lý.
      </div>

      <div className="space-y-7 text-sm leading-7 text-muted-foreground">
        <p>Đơn vị kiểm soát dữ liệu dự kiến: <strong className="text-foreground">[TÊN PHÁP LÝ / CÁ NHÂN VẬN HÀNH]</strong>. Khu vực áp dụng: <strong className="text-foreground">[QUỐC GIA / KHU VỰC]</strong>. Ngày hiệu lực: <strong className="text-foreground">[CHƯA ẤN ĐỊNH]</strong>.</p>

        <section>
          <h2 className="section-title text-foreground">1. Dữ liệu có thể được xử lý</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Thông tin tài khoản và hồ sơ như email đăng nhập, tên hiển thị và avatar.</li>
            <li>Bookmark, truyện theo dõi, tiến độ đọc, chương/trang đang đọc và tùy chọn reader.</li>
            <li>Bình luận do người dùng đăng; bình luận có thể hiển thị công khai trên trang truyện.</li>
            <li>Truy vấn tìm kiếm trong log vận hành nguồn dữ liệu khi logging được bật.</li>
            <li>Dữ liệu kỹ thuật cần cho đăng nhập, bảo mật, cache ứng dụng và PWA; nhà cung cấp hosting và thời hạn log cần được xác nhận.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title text-foreground">2. Mục đích và nhà cung cấp</h2>
          <p>Dữ liệu được dùng để đăng nhập, đồng bộ thư viện/tiến độ, hiển thị bình luận và vận hành nguồn truyện. Supabase được dùng cho xác thực, cơ sở dữ liệu và lưu avatar. MangaDex và các nguồn nội dung nhận các request cần thiết để cung cấp metadata hoặc ảnh qua backend. Cần bổ sung nhà cung cấp hosting, khu vực xử lý dữ liệu và hợp đồng xử lý dữ liệu trước ngày hiệu lực.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">3. Lưu trữ trên thiết bị</h2>
          <p>Ứng dụng có thể lưu tùy chọn đọc, trạng thái giao diện, shell PWA và một số metadata tìm kiếm trên thiết bị. Cache offline ảnh chapter đã bị tắt; proxy ảnh trả `no-store`. Thời gian lưu metadata và dữ liệu phiên cần được xác nhận khi cấu hình hosting.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">4. Quảng cáo và theo dõi</h2>
          <p>Phiên bản hiện tại không tích hợp quảng cáo hoặc dịch vụ thu phí cho nội dung MangaDex. Tài liệu này chưa xác nhận các hoạt động tracking hoặc log của nhà cung cấp hạ tầng; cần kiểm kê và cập nhật trước khi phát hành.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">5. Thời hạn lưu và quyền của người dùng</h2>
          <p>Thời hạn lưu tài khoản, tiến độ đọc, bình luận, log nguồn và yêu cầu gỡ: <strong className="text-foreground">[CHƯA ĐƯỢC XÁC ĐỊNH]</strong>. Người dùng có thể liên hệ để yêu cầu truy cập, sửa hoặc xóa dữ liệu; quyền và thời hạn xử lý cụ thể phụ thuộc luật áp dụng và cần được đơn vị vận hành xác nhận.</p>
        </section>

        <section>
          <h2 className="section-title text-foreground">6. Yêu cầu và liên hệ</h2>
          <p>Yêu cầu quyền riêng tư: <a href="mailto:contactinkrail@proton.me" className="text-primary hover:underline">contactinkrail@proton.me</a>. Yêu cầu gỡ nội dung có thể gửi qua biểu mẫu Content Removal. Không gửi giấy tờ định danh hoặc dữ liệu nhạy cảm qua biểu mẫu công khai.</p>
        </section>

        <p className="border-t border-border pt-4 text-xs">Trạng thái tài liệu: bản nháp nội bộ; chưa phải chính sách có hiệu lực.</p>
      </div>
    </main>
  );
}
