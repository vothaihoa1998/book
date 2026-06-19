import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const buttonBase = "inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-foreground ink-on-dark hover:opacity-90",
  secondary: "border border-border bg-surface text-foreground hover:border-foreground/25 hover:bg-surface-elevated",
  ghost: "text-foreground hover:bg-foreground/6",
  soft: "bg-chip text-chip-text hover:text-foreground",
  danger: "bg-danger text-white hover:opacity-90",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-[var(--control-h-sm)] rounded-[var(--radius-control)] px-3 text-sm",
  md: "h-[var(--control-h-md)] rounded-[var(--radius-control)] px-4 text-sm",
  lg: "h-[var(--control-h-lg)] rounded-[var(--radius-control)] px-5 text-sm",
  icon: "size-11 rounded-[var(--radius-control)] p-0",
};

export type AppButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
};

export function AppButton({ className, variant = "primary", size = "md", pill = false, ...props }: AppButtonProps) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], pill && "rounded-full", className)}
      {...props}
    />
  );
}

export function AppLinkButton({ className, variant = "primary", size = "md", pill = false, href, ...props }: ComponentPropsWithoutRef<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  pill?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], pill && "rounded-full", className)}
      {...props}
    />
  );
}

export function IconButton({ className, variant = "secondary", ...props }: Omit<AppButtonProps, "size">) {
  return <AppButton className={className} variant={variant} size="icon" {...props} />;
}

export function IconLinkButton({ className, variant = "secondary", href, ...props }: ComponentPropsWithoutRef<typeof Link> & { variant?: ButtonVariant }) {
  return <AppLinkButton href={href} className={className} variant={variant} size="icon" {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("mb-2 block text-sm font-semibold text-foreground", className)} {...props} />;
}

const inputClass = "w-full rounded-[var(--radius-control)] border border-border bg-background text-sm text-foreground outline-none transition placeholder:text-muted focus:border-foreground/35 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

export function TextField({ label, className, inputClassName, ...props }: ComponentPropsWithoutRef<"input"> & { label?: string; inputClassName?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input className={cn(inputClass, "h-[var(--control-h-lg)] px-4", inputClassName)} {...props} />
    </label>
  );
}

export function SelectField({ label, className, selectClassName, children, ...props }: ComponentPropsWithoutRef<"select"> & { label?: string; selectClassName?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <select className={cn(inputClass, "h-[var(--control-h-md)] px-4", selectClassName)} {...props}>
        {children}
      </select>
    </label>
  );
}

export function TextareaField({ label, className, textareaClassName, ...props }: ComponentPropsWithoutRef<"textarea"> & { label?: string; textareaClassName?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea className={cn(inputClass, "min-h-28 resize-y p-4 leading-6", textareaClassName)} {...props} />
    </label>
  );
}

export function Badge({ className, tone = "neutral", ...props }: ComponentPropsWithoutRef<"span"> & { tone?: "neutral" | "accent" | "success" | "danger" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-chip text-chip-text",
        tone === "accent" && "bg-foreground text-background",
        tone === "success" && "bg-accent-2/18 text-accent-2",
        tone === "danger" && "bg-danger/15 text-danger",
        className,
      )}
      {...props}
    />
  );
}

export function FilterChip({ className, active, children, ...props }: ComponentPropsWithoutRef<"span"> & { active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full bg-chip px-4 text-sm font-medium text-chip-text transition",
        active && "bg-foreground text-background",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function SegmentedControl({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>;
}

export function SegmentButton({ className, active, children, ...props }: ComponentPropsWithoutRef<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        buttonBase,
        "min-h-11 rounded-full px-4 text-sm",
        active ? "bg-foreground text-background" : "bg-chip text-chip-text hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function BottomSheet({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("flex max-h-[82vh] w-full flex-col overflow-auto rounded-t-[var(--radius-sheet)] border border-border bg-background p-5 shadow-2xl md:h-full md:max-w-sm md:rounded-[var(--radius-card)]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertState({ className, children, tone = "neutral" }: { className?: string; children: ReactNode; tone?: "neutral" | "danger" | "warning" }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-border bg-surface p-4 text-sm leading-6 text-muted", tone === "danger" && "border-danger/30 text-danger", tone === "warning" && "border-warning/30 text-warning", className)}>
      {children}
    </div>
  );
}

export function EmptyState({ className, icon, title, children, action }: { className?: string; icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("border-y border-border py-14 text-center", className)}>
      {icon && <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-chip text-chip-text">{icon}</div>}
      <p className="font-display text-3xl font-semibold">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[var(--radius-card)] bg-surface-strong", className)} />;
}
