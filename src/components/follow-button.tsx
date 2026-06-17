"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { type Manga } from "@/lib/types";

type FollowState = "idle" | "saving" | "saved" | "anonymous" | "error";

const labels: Record<FollowState, string> = {
  idle: "Theo dõi",
  saving: "Đang lưu",
  saved: "Đã theo dõi",
  anonymous: "Đăng nhập để theo dõi",
  error: "Không lưu được",
};

export function FollowButton({ manga }: { manga: Manga }) {
  const [state, setState] = useState<FollowState>("idle");

  async function follow() {
    setState("saving");
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mangaId: manga.id, manga }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; mode?: string } | null;

      if (!response.ok || payload?.ok === false) {
        setState("error");
        return;
      }

      setState(payload?.mode === "anonymous" || payload?.mode === "local-only" ? "anonymous" : "saved");
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      onClick={follow}
      disabled={state === "saving"}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border border-border bg-surface px-5 text-sm font-semibold transition hover:border-foreground/25 disabled:opacity-60"
    >
      {state === "saving" ? <Loader2 size={16} className="animate-spin" /> : state === "saved" ? <Check size={16} /> : <Bell size={16} />}
      {labels[state]}
    </button>
  );
}
