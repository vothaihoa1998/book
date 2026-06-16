import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập InkRail bằng Supabase Auth để đồng bộ lịch sử đọc và thư viện.",
};

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_420px] md:items-center md:py-16 lg:px-8">
      <section>
        <p className="font-code text-[11px] uppercase text-muted">Tài khoản</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold leading-none md:text-7xl">Đọc tiếp ở bất kỳ thiết bị nào.</h1>
        <p className="mt-6 max-w-2xl font-display text-xl leading-8 text-muted md:text-2xl md:leading-9">
          Auth nằm trên Supabase, reader vẫn hoạt động khi chưa đăng nhập. Khi có session, progress được ghi bằng RLS chỉ cho chính bạn.
        </p>
      </section>
      <AuthPanel />
    </main>
  );
}
