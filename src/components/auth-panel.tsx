"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CheckCircle2, LogOut, Mail } from "lucide-react";
import { AlertState, AppButton, AppLinkButton, TextField } from "@/components/ui/primitives";
import { getBrowserSupabaseClient, type SupabaseBrowserEnv } from "@/lib/supabase/client";

function decodeAuthMessage(value: string | null) {
  if (!value) return "";

  let decoded = value.replace(/\+/g, " ");
  for (let index = 0; index < 2; index += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
  }

  return decoded;
}

function getOAuthRedirectMessage() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  const providerError = decodeAuthMessage(hashParams.get("error_description"));
  if (providerError) return `Google OAuth lỗi từ Supabase: ${providerError}`;

  const callbackError = decodeAuthMessage(searchParams.get("error"));
  if (callbackError === "missing-code") {
    return "Callback không nhận được mã đăng nhập từ Supabase. Hãy kiểm tra Google Client Secret và Authorized redirect URI trong Supabase/Google Cloud.";
  }

  return callbackError ? `Không đăng nhập được: ${callbackError}` : "";
}

function getUserLabel(user: User) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email ?? "Tài khoản Supabase";
}

export function AuthPanel({ supabaseEnv }: { supabaseEnv: SupabaseBrowserEnv | null }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const supabase = getBrowserSupabaseClient(supabaseEnv);
  const authRedirect = () => `${location.origin}/auth/callback?next=/library`;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const authMessage = getOAuthRedirectMessage();
      if (authMessage) setMessage(authMessage);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!supabase) {
      const timeoutId = window.setTimeout(() => setAuthReady(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setAuthReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signInWithEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Chưa cấu hình NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirect() },
    });
    setLoading(false);
    setMessage(error ? error.message : "Đã gửi magic link. Kiểm tra hộp thư của bạn.");
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage("Chưa cấu hình Supabase env để bật Google OAuth.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirect() },
    });
  }

  async function signOut() {
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    setUser(null);
    setMessage("Đã đăng xuất.");
  }

  if (authReady && user) {
    return (
      <div className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-3">
          {typeof user.user_metadata?.avatar_url === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="size-12 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-12 place-items-center rounded-[var(--radius-control)] bg-accent-2 text-background"><CheckCircle2 size={18} /></span>
          )}
          <div>
            <h2 className="section-title">Đã đăng nhập</h2>
            <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">{getUserLabel(user)}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <AppLinkButton href="/library" size="lg">
            Vào thư viện
          </AppLinkButton>
          <AppButton
            type="button"
            onClick={signOut}
            disabled={loading}
            variant="secondary"
            size="lg"
          >
            <LogOut size={16} />
            Đăng xuất
          </AppButton>
        </div>
        {message && <AlertState className="mt-4">{message}</AlertState>}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-card p-5 shadow-2xl shadow-black/20">
      <div>
        <h2 className="section-title">Đăng nhập</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Tiếp tục nơi bạn đã dừng lại.</p>
      </div>
      <AppButton onClick={signInWithGoogle} variant="secondary" size="lg" className="mt-8 w-full">
        <GoogleIcon />
        Tiếp tục với Google
      </AppButton>
      <div className="my-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span className="h-px bg-border" />
        <span className="meta-mono">Hoặc email</span>
        <span className="h-px bg-border" />
      </div>
      <form onSubmit={signInWithEmail} className="mt-6 flex flex-col gap-3">
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
        <AppButton disabled={loading} size="lg" className="w-full">
          <Mail size={16} />
          {loading ? "Đang gửi" : "Gửi magic link"}
        </AppButton>
      </form>
      {message && <AlertState className="mt-4">{message}</AlertState>}
      <p className="mt-6 text-center text-sm text-muted-foreground">Chưa có tài khoản? Google sẽ tự tạo tài khoản Supabase cho bạn.</p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.94v2.34A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.96H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.04l3.02-2.34Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .94 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
