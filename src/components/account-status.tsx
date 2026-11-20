"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { Check, UserRound } from "lucide-react";
import Link from "next/link";
import { IconLinkButton } from "@/components/ui/primitives";
import { getBrowserSupabaseClient, type SupabaseBrowserEnv } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function getUserLabel(user: User) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return user.email ?? "Tài khoản";
}

function getInitial(user: User) {
  return getUserLabel(user).trim().charAt(0).toUpperCase() || "U";
}

export function AccountStatus({
  supabaseEnv,
  selected = false,
  onSelect,
}: {
  supabaseEnv: SupabaseBrowserEnv | null;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const supabase = getBrowserSupabaseClient(supabaseEnv);

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
        variant="ghost"
        className={cn(
          "relative z-10 rounded-full transition-colors duration-300 ease-in-out",
          selected
            ? "bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
        onClick={onSelect}
        data-header-action="account"
        aria-label="Account"
      >
        <UserRound size={16} />
      </IconLinkButton>
    );
  }

  return (
    <Link
      href="/profile"
      onClick={onSelect}
      data-header-action="account"
      className={`group flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition duration-300 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${
        selected
          ? "relative z-10 bg-transparent text-primary-foreground hover:bg-transparent hover:text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
      aria-label={`Đã đăng nhập: ${getUserLabel(user)}`}
      title={getUserLabel(user)}
    >
      <span className="grid size-6 place-items-center rounded-full bg-background font-code text-[10px] text-foreground">
        {getInitial(user)}
      </span>
      <Check size={14} className="hidden sm:block" />
    </Link>
  );
}
