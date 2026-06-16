"use client";

import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = getBrowserSupabaseClient();
  const authRedirect = () => `${location.origin}/auth/callback?next=/library`;

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

  return (
    <div className="border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-[8px] bg-foreground ink-on-dark">
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2 className="font-display text-3xl font-semibold">Đăng nhập Supabase</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Đồng bộ bookmark, lịch sử đọc, preference reader và avatar giữa các thiết bị.
          </p>
        </div>
      </div>
      <form onSubmit={signInWithEmail} className="mt-6 space-y-3">
        <label className="block">
          <span className="mb-2 block font-code text-[11px] uppercase text-muted">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="h-12 w-full rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40"
          />
        </label>
        <button disabled={loading} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark disabled:opacity-50">
          <Mail size={16} />
          {loading ? "Đang gửi" : "Gửi magic link"}
        </button>
      </form>
      <button onClick={signInWithGoogle} className="mt-3 h-12 w-full rounded-[8px] border border-border bg-background px-4 text-sm font-semibold transition hover:border-foreground/25">
        Tiếp tục với Google
      </button>
      {message && <p className="mt-4 border border-border bg-background p-3 text-sm leading-6 text-muted">{message}</p>}
    </div>
  );
}
