"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function MangaDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const canExpand = description.trim().length > 360;

  return (
    <div className="max-w-3xl">
      <div className="relative">
        <p
          id={contentId}
          className={cn(
            "text-sm leading-6 text-muted-foreground sm:text-[15px] sm:leading-7",
            canExpand && !expanded && "line-clamp-5 sm:line-clamp-6",
          )}
        >
          {description}
        </p>
        {canExpand && !expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-transparent to-background" />
        )}
      </div>

      {canExpand && (
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 inline-flex h-9 items-center rounded-[var(--radius-control)] text-sm font-medium text-primary transition hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
