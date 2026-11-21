"use client";

import { useState, type FormEvent } from "react";

type ClaimType = "scanlation_group_leader" | "rights_holder";

export function ContentRemovalForm() {
  const [claimType, setClaimType] = useState<ClaimType>("scanlation_group_leader");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setError("");

    const values = new FormData(event.currentTarget);
    const payload = {
      claimantName: values.get("claimantName"),
      claimantEmail: values.get("claimantEmail"),
      claimType: values.get("claimType"),
      groupUrl: values.get("groupUrl"),
      contentUrl: values.get("contentUrl"),
      details: values.get("details"),
      confirmsAuthority: values.get("confirmsAuthority") === "on",
    };

    try {
      const response = await fetch("/api/content-removal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { requestId?: string; error?: string };
      if (!response.ok) {
        setError(result.error || "Không gửi được yêu cầu. Vui lòng thử lại.");
        return;
      }
      setRequestId(result.requestId ?? "");
      form.reset();
      setClaimType("scanlation_group_leader");
    } catch {
      setError("Không thể kết nối để gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (requestId) {
    return (
      <div role="status" className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <h2 className="font-semibold text-foreground">Đã nhận yêu cầu</h2>
        <p className="mt-2 text-sm text-muted-foreground">Mã yêu cầu: <code>{requestId}</code>. Yêu cầu sẽ được kiểm tra thủ công trước khi có quyết định.</p>
        <button type="button" onClick={() => setRequestId("")} className="mt-4 text-sm font-medium text-primary underline-offset-2 hover:underline">
          Gửi yêu cầu khác
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <label className="block text-sm font-medium">
        Bạn gửi yêu cầu với tư cách
        <select
          name="claimType"
          value={claimType}
          onChange={(event) => setClaimType(event.target.value as ClaimType)}
          className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3"
        >
          <option value="scanlation_group_leader">Trưởng nhóm dịch đang hoạt động trên MangaDex</option>
          <option value="rights_holder">Chủ sở hữu quyền / đại diện được ủy quyền</option>
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Tên người yêu cầu
          <input name="claimantName" required minLength={2} maxLength={120} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3" />
        </label>
        <label className="block text-sm font-medium">
          Email liên hệ
          <input name="claimantEmail" required type="email" maxLength={254} autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3" />
        </label>
      </div>

      {claimType === "scanlation_group_leader" && (
        <label className="block text-sm font-medium">
          URL nhóm MangaDex
          <input name="groupUrl" required type="url" placeholder="https://mangadex.org/group/..." className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3" />
        </label>
      )}

      <label className="block text-sm font-medium">
        URL truyện hoặc chapter trên MangaDex
        <input name="contentUrl" required type="url" placeholder="https://mangadex.org/title/... hoặc /chapter/..." className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3" />
      </label>

      <label className="block text-sm font-medium">
        Thông tin xác minh và nội dung cần gỡ
        <textarea name="details" required minLength={20} maxLength={2000} rows={5} className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2" />
      </label>

      <label className="flex items-start gap-2 text-sm text-muted-foreground">
        <input name="confirmsAuthority" type="checkbox" required className="mt-1" />
        <span>Tôi xác nhận thông tin đúng và có quyền gửi yêu cầu này. Yêu cầu sẽ được xác minh thủ công.</span>
      </label>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={submitting} className="ink-cta min-h-11 rounded-xl px-5 text-sm font-semibold disabled:opacity-50">
        {submitting ? "Đang gửi..." : "Gửi yêu cầu gỡ"}
      </button>
      <p className="text-xs leading-5 text-muted-foreground">
        Chỉ gửi thông tin cần thiết; không tải lên tài liệu định danh. Xem{" "}
        <a href="/privacy" className="underline underline-offset-2">bản nháp chính sách quyền riêng tư</a>.
      </p>
    </form>
  );
}
