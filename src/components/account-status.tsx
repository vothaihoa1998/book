"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import { IconLinkButton } from "@/components/ui/primitives";
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
      <IconLinkButton
        href="/login"
        variant="primary"
        aria-label="Account"
      >
        <UserRound size={16} />
      </IconLinkButton>
    );
  }

  return (
    <Link
      href="/profile"
      className="group flex h-9 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      aria-label={`Đã đăng nhập: ${getUserLabel(user)}`}
      title={getUserLabel(user)}
    >
      <span className="grid size-6 place-items-center rounded-[var(--radius-control)] bg-background font-code text-[10px] text-foreground">
        {getInitial(user)}
      </span>
      <Check size={14} className="hidden sm:block" />
    </Link>
  );
}
