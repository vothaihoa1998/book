"use client";

import { FormEvent, useMemo, useState } from "react";
import { LogIn, MessageCircle, Send, Trash2 } from "lucide-react";
import { AlertState, AppButton, AppLinkButton, EmptyState, IconButton, SegmentButton, SegmentedControl, TextareaField } from "@/components/ui/primitives";

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
          <p className="eyebrow">Cộng đồng</p>
          <h2 className="mt-2 flex items-center gap-2 section-title"><MessageCircle size={22} /> Bình luận</h2>
        </div>
        <SegmentedControl>
          <SegmentButton active={sort === "newest"} onClick={() => setSort("newest")}>Mới nhất</SegmentButton>
          <SegmentButton active={sort === "oldest"} onClick={() => setSort("oldest")}>Cũ nhất</SegmentButton>
        </SegmentedControl>
      </div>

      <div className="mt-5 rounded-[var(--radius-card)] border border-border bg-card p-4">
        {userId ? (
          <form onSubmit={submit} className="grid gap-3">
            <TextareaField
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Viết cảm nhận ngắn về bộ truyện..."
              textareaClassName="min-h-28"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="meta-mono">{body.length}/1000</span>
              <AppButton disabled={loading || !body.trim()} size="sm">
                <Send size={15} /> {loading ? "Đang gửi" : "Gửi"}
              </AppButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LogIn size={16} /> Đăng nhập để tham gia bình luận.</p>
            <AppLinkButton href="/login" size="sm">Đăng nhập</AppLinkButton>
          </div>
        )}
        {message && <AlertState className="mt-3">{message}</AlertState>}
      </div>

      <div className="mt-5 divide-y divide-border border-y border-border">
        {ordered.length ? ordered.map((comment) => (
          <article key={comment.id} className="py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-secondary text-sm font-medium text-muted-foreground">
                  {(comment.author_name || "B").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{comment.author_name || "Bạn đọc"}</p>
                  <p className="meta-mono mt-1">{new Date(comment.created_at).toLocaleString("vi-VN")}</p>
                </div>
              </div>
              {userId === comment.user_id && (
                <IconButton type="button" onClick={() => remove(comment.id)} variant="secondary" className="text-muted-foreground hover:text-danger" aria-label="Xoá bình luận">
                  <Trash2 size={15} />
                </IconButton>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{comment.body}</p>
          </article>
        )) : (
          <EmptyState title="Chưa có bình luận" className="border-0 py-8">
            Hãy là người mở cuộc trò chuyện.
          </EmptyState>
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
