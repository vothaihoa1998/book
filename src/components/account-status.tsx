"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

function getUserLabel(user: User) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email ?? "Tài khoản";
}

function getInitial(user: User) {
  return getUserLabel(user).trim().charAt(0).toUpperCase() || "U";
}

export function AccountStatus() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const supabase = getBrowserSupabaseClient();

  useEffect(() => {
    if (!supabase) {
      const timeoutId = window.setTimeout(() => setReady(true), 0);
      return () => window.clearTimeout(timeoutId);
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data.user);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  if (!ready || !user) {
    return (
      <Link
        href="/login"
        className="grid size-10 place-items-center rounded-[8px] bg-foreground ink-on-dark transition hover:opacity-90"
        aria-label="Account"
      >
        <UserRound size={16} />
      </Link>
    );
  }

  return (
    <Link
      href="/library"
      className="group flex h-10 items-center gap-2 rounded-[8px] bg-foreground px-2.5 text-sm font-semibold ink-on-dark transition hover:opacity-90"
      aria-label={`Đã đăng nhập: ${getUserLabel(user)}`}
      title={getUserLabel(user)}
    >
      <span className="grid size-6 place-items-center rounded-[6px] bg-background text-[11px] text-foreground">
        {getInitial(user)}
      </span>
      <Check size={14} className="hidden sm:block" />
    </Link>
  );
}
