import { Grid2X2, List, Search } from "lucide-react";

export function DiscoverForm({ q = "", status = "all", view = "grid" }: { q?: string; status?: string; view?: string }) {
  return (
    <form className="grid gap-3 border-y border-border bg-surface/70 p-4 md:grid-cols-[1fr_160px_120px_auto] md:items-center md:p-5">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Tìm truyện, tác giả, thể loại"
          className="h-12 w-full rounded-[8px] border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-foreground/40"
        />
      </label>
      <select
        name="status"
        defaultValue={status}
        className="h-12 rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40"
      >
        <option value="all">Mọi trạng thái</option>
        <option value="ongoing">Đang ra</option>
        <option value="completed">Hoàn thành</option>
        <option value="hiatus">Tạm nghỉ</option>
      </select>
      <select
        name="view"
        defaultValue={view}
        className="h-12 rounded-[8px] border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground/40"
      >
        <option value="grid">Grid</option>
        <option value="list">List</option>
      </select>
      <button className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-foreground px-4 text-sm font-semibold ink-on-dark">
        {view === "list" ? <List size={16} /> : <Grid2X2 size={16} />}
        Tìm
      </button>
    </form>
  );
}
