"use client";

import { FormEvent, useMemo, useState } from "react";
import { LogIn, MessageCircle, Send, Trash2 } from "lucide-react";
import Link from "next/link";

export type CommentItem = {
  id: string;
  user_id: string;
  author_name: string | null;
  manga_id: string;
  chapter_id: string | null;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export function CommentsPanel({ mangaId, initialComments, initialUserId, initialError }: { mangaId: string; initialComments: CommentItem[]; initialUserId: string | null; initialError?: string | null }) {
  const [comments, setComments] = useState(initialComments);
  const [userId] = useState(initialUserId);
  const [body, setBody] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [message, setMessage] = useState(formatError(initialError));
  const [loading, setLoading] = useState(false);

  const ordered = useMemo(() => {
    return comments.slice().sort((a, b) => {
      const delta = Date.parse(a.created_at) - Date.parse(b.created_at);
      return sort === "oldest" ? delta : -delta;
    });
  }, [comments, sort]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mangaId, body: text }),
    });
    const payload = await response.json().catch(() => null) as { ok?: boolean; comment?: CommentItem; error?: string } | null;
    setLoading(false);
    if (!response.ok || !payload?.ok || !payload.comment) {
      setMessage(payload?.error ?? "Không gửi được bình luận.");
      return;
    }
    setComments((current) => [payload.comment!, ...current]);
    setBody("");
  }

  async function remove(id: string) {
    const previous = comments;
    setComments((current) => current.filter((comment) => comment.id !== id));
    const response = await fetch(`/api/comments?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      setComments(previous);
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      setMessage(payload?.error ?? "Không xoá được bình luận.");
    }
  }

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-code text-[11px] uppercase text-muted">Cộng đồng</p>
          <h2 className="mt-2 flex items-center gap-2 font-display text-4xl font-semibold"><MessageCircle size={22} /> Bình luận</h2>
        </div>
        <div className="grid h-10 grid-cols-2 rounded-[8px] border border-border bg-surface p-1 text-sm font-semibold">
          <button type="button" onClick={() => setSort("newest")} className={sort === "newest" ? "rounded-[6px] bg-foreground px-3 ink-on-dark" : "rounded-[6px] px-3 text-muted"}>Mới nhất</button>
          <button type="button" onClick={() => setSort("oldest")} className={sort === "oldest" ? "rounded-[6px] bg-foreground px-3 ink-on-dark" : "rounded-[6px] px-3 text-muted"}>Cũ nhất</button>
        </div>
      </div>

      <div className="mt-5 rounded-[8px] border border-border bg-surface p-4">
        {userId ? (
          <form onSubmit={submit} className="grid gap-3">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Viết cảm nhận ngắn về bộ truyện..."
              className="min-h-24 resize-y rounded-[8px] border border-border bg-background p-3 text-sm leading-6 outline-none transition placeholder:text-muted focus:border-foreground/40"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="font-code text-[10px] uppercase text-muted">{body.length}/1000</span>
              <button disabled={loading || !body.trim()} className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark disabled:opacity-50">
                <Send size={15} /> {loading ? "Đang gửi" : "Gửi"}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-muted"><LogIn size={16} /> Đăng nhập để tham gia bình luận.</p>
            <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">Đăng nhập</Link>
          </div>
        )}
        {message && <p className="mt-3 rounded-[8px] border border-border bg-background p-3 text-sm leading-6 text-muted">{message}</p>}
      </div>

      <div className="mt-5 divide-y divide-border border-y border-border">
        {ordered.length ? ordered.map((comment) => (
          <article key={comment.id} className="py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold">{comment.author_name || "Bạn đọc"}</p>
                <p className="mt-1 font-code text-[10px] uppercase text-muted">{new Date(comment.created_at).toLocaleString("vi-VN")}</p>
              </div>
              {userId === comment.user_id && (
                <button type="button" onClick={() => remove(comment.id)} className="grid size-9 place-items-center rounded-[8px] border border-border bg-surface text-muted transition hover:text-foreground" aria-label="Xoá bình luận">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{comment.body}</p>
          </article>
        )) : (
          <p className="py-8 text-center text-sm text-muted">Chưa có bình luận. Hãy là người mở cuộc trò chuyện.</p>
        )}
      </div>
    </section>
  );
}

function formatError(error?: string | null) {
  if (!error) return "";
  if (error.includes("public.comments") || error.toLowerCase().includes("schema cache")) {
    return "Bình luận chưa sẵn sàng trên Supabase. Hãy apply migration comments rồi reload trang.";
  }
  return error;
}
