import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-[8px] px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-foreground ink-on-dark hover:opacity-90",
        variant === "secondary" && "border border-border bg-surface text-foreground hover:border-foreground/25",
        variant === "ghost" && "text-foreground hover:bg-foreground/5",
        className,
      )}
      {...props}
    />
  );
}
