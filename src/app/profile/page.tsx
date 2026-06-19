import type { Metadata } from "next";
import { AlertTriangle, BookMarked, CheckCircle2, Heart, LogIn, Save, Settings2, UserRound } from "lucide-react";
import { AlertState, AppButton, AppLinkButton, SelectField, TextField } from "@/components/ui/primitives";
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
        <p className="eyebrow">Tôi</p>
        <h1 className="mt-3 editorial-title text-5xl md:text-7xl">Hồ sơ đọc</h1>
        <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-card p-6">
          <LogIn size={22} />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Đăng nhập để xem hồ sơ, thống kê thư viện và đồng bộ reader preferences.</p>
          <AppLinkButton href="/login" className="mt-5">
            Đăng nhập
          </AppLinkButton>
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
      <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
        <aside className="h-fit rounded-[var(--radius-card)] border border-border bg-card p-5">
          <div className="flex items-start gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="size-20 rounded-full border border-border object-cover shadow-[var(--shadow-soft)] sm:size-24" referrerPolicy="no-referrer" />
            ) : (
              <div
                aria-hidden
                className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary via-accent to-accent-2 text-2xl font-display font-medium text-primary-foreground shadow-[var(--shadow-soft)] sm:size-24"
              >
                {displayName.slice(0, 1).toUpperCase() || <UserRound size={26} />}
              </div>
            )}
            <div className="min-w-0">
              <p className="eyebrow">Tôi</p>
              <h1 className="mt-2 break-words text-2xl font-display font-medium leading-tight text-foreground md:text-3xl">{displayName}</h1>
              {user.email && <p className="mt-1 break-all text-sm text-muted-foreground">{user.email}</p>}
            </div>
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <InfoRow label="Provider" value={provider} />
            <InfoRow label="Tạo lúc" value={new Date(user.created_at).toLocaleDateString("vi-VN")} />
          </dl>
        </aside>

        <section className="min-w-0">
          <p className="eyebrow">Hồ sơ đọc</p>
          <h2 className="mt-3 editorial-title text-5xl md:text-7xl">Không gian cá nhân</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base md:leading-7">
            Quản lý tên hiển thị, thống kê kệ đọc và tuỳ chọn reader mặc định cho những phiên đọc dài hơn.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat icon={<BookMarked size={17} />} label="Bookmark" value={bookmarks.count ?? 0} />
            <Stat icon={<Settings2 size={17} />} label="Lượt đọc" value={history.count ?? 0} />
            <Stat icon={<Heart size={17} />} label="Theo dõi" value={follows.count ?? 0} />
          </div>

          {status && (
            <AlertState className="mt-6 flex items-start gap-2">
              {status === "updated" || status === "prefs-updated" ? <CheckCircle2 size={16} className="mt-0.5 text-emerald-500" /> : <AlertTriangle size={16} className="mt-0.5 text-foreground" />}
              {status === "updated" ? "Hồ sơ đã được cập nhật." : status === "prefs-updated" ? "Tuỳ chọn reader đã được lưu." : `Không cập nhật được: ${status}`}
            </AlertState>
          )}

          {(profileError || prefsError) && (
            <AlertState className="mt-6 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 text-foreground" />
              {profileError || prefsError}
            </AlertState>
          )}

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <form action={updateProfile} className="rounded-[var(--radius-card)] border border-border bg-card p-5">
              <h3 className="section-title">Tên hiển thị</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Tên này dùng cho hồ sơ và bình luận mới.</p>
              <TextField
                className="mt-5"
                label="Display name"
                name="displayName"
                defaultValue={profile.data?.display_name ?? ""}
                placeholder={getAuthName(user)}
                maxLength={80}
              />
              <AppButton className="mt-4">
                <Save size={16} /> Lưu hồ sơ
              </AppButton>
            </form>

            <form action={updateProfilePrefs} className="rounded-[var(--radius-card)] border border-border bg-card p-5">
              <h3 className="section-title">Reader mặc định</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Áp dụng cho các phiên đọc sau khi đồng bộ Supabase.</p>
              <div className="mt-5 grid gap-3">
                <Select name="theme" label="Theme" value={prefs.data?.theme ?? "warm-light"} options={["warm-light", "paper", "sepia", "graphite-dark", "pure-black"]} />
                <Select name="direction" label="Kiểu đọc" value={prefs.data?.direction ?? "vertical"} options={["vertical", "horizontal-ltr", "horizontal-rtl"]} />
                <Select name="fit" label="Fit ảnh" value={prefs.data?.fit ?? "width"} options={["width", "height", "original", "smart"]} />
              </div>
              <AppButton className="mt-4">
                <Save size={16} /> Lưu reader
              </AppButton>
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-4">
      <p className="meta-mono flex items-center gap-2">{icon} {label}</p>
      <p className="mt-3 font-display text-4xl font-medium">{value}</p>
    </div>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: string[] }) {
  return (
    <SelectField name={name} label={label} defaultValue={value}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </SelectField>
  );
}
