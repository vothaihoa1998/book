import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth-panel";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập InkRail bằng Supabase Auth để đồng bộ lịch sử đọc và thư viện.",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-[calc(100vh-4rem)] bg-background text-foreground md:grid-cols-2">
      <section className="relative hidden border-r border-border px-10 py-12 md:flex md:flex-col md:justify-between lg:px-14">
        <div className="font-display text-3xl font-semibold">InkRail</div>
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-accent">Sổ tay người đọc</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] lg:text-6xl">
            Lưu truyện đang đọc, tiếp tục từ đúng chương đó trên mọi thiết bị.
          </h1>
          <p className="mt-6 text-sm leading-7 text-muted">Không quảng cáo trong reader, không làm phiền khi đang đọc. Đăng nhập chỉ để đồng bộ lịch sử, bookmark và preference.</p>
        </div>
        <p className="text-xs font-medium text-muted">© 2026 InkRail</p>
      </section>
      <section className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[460px]">
          <div className="mb-10 md:hidden">
            <p className="font-display text-3xl font-semibold">InkRail</p>
            <p className="mt-4 font-display text-4xl font-semibold leading-tight">Đăng nhập để đọc tiếp ở mọi thiết bị.</p>
          </div>
          <AuthPanel />
        </div>
      </section>
    </main>
  );
}
