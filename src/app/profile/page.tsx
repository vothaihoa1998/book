import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookMarked, CheckCircle2, Heart, LogIn, Save, Settings2, UserRound } from "lucide-react";
import { createServerSupabaseClient, getVerifiedUser } from "@/lib/supabase/server";
import { updateProfile, updateProfilePrefs } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ",
  description: "Thông tin hồ sơ đọc truyện, thống kê thư viện và tuỳ chọn reader.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readStatus(searchParams: Record<string, string | string[] | undefined>) {
  const value = searchParams.status;
  return typeof value === "string" ? value : "";
}

function getAuthName(user: NonNullable<Awaited<ReturnType<typeof getVerifiedUser>>>) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email ?? "Tài khoản Supabase";
}

function getAvatar(user: NonNullable<Awaited<ReturnType<typeof getVerifiedUser>>>, profileAvatar?: string | null) {
  if (profileAvatar) return profileAvatar;
  const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return typeof metadataAvatar === "string" && metadataAvatar.trim() ? metadataAvatar : null;
}

export default async function ProfilePage({ searchParams }: Props) {
  const status = readStatus(await searchParams);
  const user = await getVerifiedUser();
  const supabase = await createServerSupabaseClient();

  if (!user || !supabase) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="font-code text-[11px] uppercase text-muted">Tôi</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Hồ sơ đọc</h1>
        <section className="mt-8 border border-border bg-surface p-6">
          <LogIn size={22} />
          <p className="mt-4 text-sm leading-6 text-muted">Đăng nhập để xem hồ sơ, thống kê thư viện và đồng bộ reader preferences.</p>
          <Link href="/login" className="mt-5 inline-flex h-11 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
            Đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  const [profile, prefs, bookmarks, history, follows] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, created_at").eq("id", user.id).maybeSingle(),
    supabase.from("reading_prefs").select("theme, direction, fit").eq("user_id", user.id).maybeSingle(),
    supabase.from("bookmarks").select("id", { count: "exact", head: true }),
    supabase.from("reading_history").select("id", { count: "exact", head: true }),
    supabase.from("follows").select("id", { count: "exact", head: true }),
  ]);
  const displayName = profile.data?.display_name || getAuthName(user);
  const avatarUrl = getAvatar(user, profile.data?.avatar_url);
  const provider = typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "supabase";
  const profileError = profile.error?.message;
  const prefsError = prefs.error?.message;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside className="h-fit rounded-[8px] border border-border bg-surface p-5">
          <div className="flex items-start gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="size-20 rounded-[8px] border border-border object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="grid size-20 place-items-center rounded-[8px] bg-foreground ink-on-dark"><UserRound size={28} /></div>
            )}
            <div className="min-w-0">
              <p className="font-code text-[11px] uppercase text-muted">Tôi</p>
              <h1 className="mt-2 break-words font-display text-4xl font-semibold leading-none">{displayName}</h1>
              {user.email && <p className="mt-2 break-all text-sm text-muted">{user.email}</p>}
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <InfoRow label="Provider" value={provider} />
            <InfoRow label="Tạo lúc" value={new Date(user.created_at).toLocaleDateString("vi-VN")} />
          </dl>
        </aside>

        <section className="min-w-0">
          <p className="font-code text-[11px] uppercase text-muted">Hồ sơ đọc</p>
          <h2 className="mt-3 font-display text-5xl font-semibold leading-none md:text-7xl">Không gian cá nhân</h2>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat icon={<BookMarked size={17} />} label="Bookmark" value={bookmarks.count ?? 0} />
            <Stat icon={<Settings2 size={17} />} label="Lượt đọc" value={history.count ?? 0} />
            <Stat icon={<Heart size={17} />} label="Theo dõi" value={follows.count ?? 0} />
          </div>

          {status && (
            <div className="mt-6 flex items-start gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm text-muted">
              {status === "updated" || status === "prefs-updated" ? <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" /> : <AlertTriangle size={16} className="mt-0.5 text-foreground" />}
              {status === "updated" ? "Hồ sơ đã được cập nhật." : status === "prefs-updated" ? "Tuỳ chọn reader đã được lưu." : `Không cập nhật được: ${status}`}
            </div>
          )}

          {(profileError || prefsError) && (
            <div className="mt-6 flex items-start gap-2 rounded-[8px] border border-border bg-surface p-3 text-sm text-muted">
              <AlertTriangle size={16} className="mt-0.5 text-foreground" />
              {profileError || prefsError}
            </div>
          )}

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <form action={updateProfile} className="rounded-[8px] border border-border bg-surface p-5">
              <h3 className="font-display text-3xl font-semibold">Tên hiển thị</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Tên này dùng cho hồ sơ và bình luận mới.</p>
              <label className="mt-5 block">
                <span className="mb-2 block font-code text-[11px] uppercase text-muted">Display name</span>
                <input
                  name="displayName"
                  defaultValue={profile.data?.display_name ?? ""}
                  placeholder={getAuthName(user)}
                  maxLength={80}
                  className="h-12 w-full rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40"
                />
              </label>
              <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
                <Save size={16} /> Lưu hồ sơ
              </button>
            </form>

            <form action={updateProfilePrefs} className="rounded-[8px] border border-border bg-surface p-5">
              <h3 className="font-display text-3xl font-semibold">Reader mặc định</h3>
              <p className="mt-2 text-sm leading-6 text-muted">Áp dụng cho các phiên đọc sau khi đồng bộ Supabase.</p>
              <div className="mt-5 grid gap-3">
                <Select name="theme" label="Theme" value={prefs.data?.theme ?? "warm-light"} options={["warm-light", "paper", "sepia", "graphite-dark", "pure-black"]} />
                <Select name="direction" label="Kiểu đọc" value={prefs.data?.direction ?? "vertical"} options={["vertical", "horizontal-ltr", "horizontal-rtl"]} />
                <Select name="fit" label="Fit ảnh" value={prefs.data?.fit ?? "width"} options={["width", "height", "original", "smart"]} />
              </div>
              <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
                <Save size={16} /> Lưu reader
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold capitalize">{value}</dd>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[8px] border border-border bg-surface p-4">
      <p className="flex items-center gap-2 font-code text-[11px] uppercase text-muted">{icon} {label}</p>
      <p className="mt-3 font-display text-4xl font-semibold">{value}</p>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block font-code text-[11px] uppercase text-muted">{label}</span>
      <select name={name} defaultValue={value} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}
