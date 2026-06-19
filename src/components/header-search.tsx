"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { TextField } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  }

  return (
    <form onSubmit={onSubmit} className={cn("relative", className)} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm truyện nhanh"
        aria-label="Tìm truyện nhanh"
        inputClassName="h-10 rounded-full bg-surface pl-10 pr-4 focus:bg-background"
      />
    </form>
  );
}
