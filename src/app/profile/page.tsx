import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ",
  description: "Thông tin hồ sơ đọc truyện và avatar Supabase Storage.",
};

export default async function ProfilePage() {
  const user = await getVerifiedUser();
  const supabase = await createServerSupabaseClient();
  const profile = user && supabase ? await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle() : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <p className="font-code text-[11px] uppercase text-muted">Tôi</p>
      <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Hồ sơ đọc</h1>
      <section className="mt-8 border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-16 place-items-center rounded-[8px] bg-foreground ink-on-dark">
            <UserRound size={24} />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold">
              {profile?.data?.display_name || user?.email || "Chưa đăng nhập"}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Avatar được lưu trong Supabase Storage bucket `avatars`. Bản v1 đã có policy public-read và authenticated write theo folder user id.
            </p>
            {!user && (
              <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
                Đăng nhập
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
