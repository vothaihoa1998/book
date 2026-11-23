import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";

/* ============================================================
   BUTTON — shadcn-style với CVA variants
   ============================================================ */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium leading-5 transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:brightness-110",
        secondary: "border border-border bg-secondary text-foreground hover:border-input hover:bg-surface-elevated",
        ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
        soft: "bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
        outline: "border border-border bg-card text-foreground hover:bg-secondary",
        destructive: "bg-danger text-white hover:opacity-90",
        danger: "bg-danger text-white hover:opacity-90",
        link: "text-primary underline-offset-2 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-[var(--control-h-lg)] px-5 text-sm",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = ComponentPropsWithoutRef<"button"> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps & { pill?: boolean }>(
  ({ className, variant, size, pill, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), pill && "rounded-full", className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

/** @deprecated use Button — kept for back-compat with existing imports */
export const AppButton = Button;

/** @deprecated use Button with `variant="secondary"` size="icon" */
export const IconButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => <Button ref={ref} size="icon" variant="secondary" className={className} {...props} />,
);
IconButton.displayName = "IconButton";

/** LinkButton — Next/Link styled like a Button */
export const LinkButton = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof Link> & VariantProps<typeof buttonVariants> & { pill?: boolean }
>(({ className, variant, size, pill, ...props }, ref) => (
  <Link ref={ref} className={cn(buttonVariants({ variant, size }), pill && "rounded-full", className)} {...props} />
));
LinkButton.displayName = "LinkButton";

/** @deprecated use LinkButton */
export const AppLinkButton = LinkButton;

export const IconLinkButton = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<typeof Link> & VariantProps<typeof buttonVariants>
>(({ className, variant, ...props }, ref) => (
  <LinkButton ref={ref} variant={variant} size="icon" className={className} {...props} />
));
IconLinkButton.displayName = "IconLinkButton";

/* ============================================================
   BADGE — shadcn-style
   ============================================================ */
const badgeVariants = cva(
  "meta-mono inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1",
  {
    variants: {
      tone: {
        neutral: "bg-secondary text-muted-foreground",
        accent: "bg-primary/15 text-primary",
        success: "bg-accent-2/18 text-accent-2",
        danger: "bg-danger/15 text-danger",
        outline: "border border-border text-muted-foreground",
        muted: "bg-secondary/60 text-muted-foreground",
      },
      variant: {
        default: "bg-primary/15 text-primary",
        secondary: "bg-secondary text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        destructive: "bg-danger/15 text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = ComponentPropsWithoutRef<"span"> & VariantProps<typeof badgeVariants>;

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ tone: tone || (variant as never) || "neutral" }), className)}
      {...props}
    />
  ),
);
Badge.displayName = "Badge";

/* ============================================================
   FIELD LABEL + INPUT family
   ============================================================ */
export function FieldLabel({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return <span className={cn("mb-2 block text-sm font-medium text-foreground", className)} {...props} />;
}

const inputClass =
  "w-full rounded-[var(--radius-control)] border border-input bg-background text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />,
);
Input.displayName = "Input";

export const TextField = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<"input"> & { label?: string; inputClassName?: string }
>(function TextField({ label, className, inputClassName, ...props }, ref) {
  return (
    <label className={cn("block", className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Input ref={ref} className={cn("h-[var(--control-h-lg)] px-4", inputClassName)} {...props} />
    </label>
  );
});

export function TextareaField({
  label,
  className,
  textareaClassName,
  ...props
}: ComponentPropsWithoutRef<"textarea"> & { label?: string; textareaClassName?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea className={cn(inputClass, "min-h-28 resize-y p-4 leading-6", textareaClassName)} {...props} />
    </label>
  );
}

/* ============================================================
   CARD — shadcn-style
   ============================================================ */
export const Card = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />,
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<"h3">>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold leading-tight tracking-tight text-foreground", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<"p">>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />,
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />,
);
CardFooter.displayName = "CardFooter";

/* ============================================================
   CHIP / FilterChip — single + multi select
   ============================================================ */
const chipBase =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus-ring";

/** RadioChip — span styled purely via Tailwind peer-checked variant.
 *  Place inside a <label> whose child <input type="radio" class="peer sr-only"> is a SIBLING. */
export const RadioChip = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<"span">>(
  ({ className, children, ...props }, ref) => (
    <span ref={ref} className={cn(chipBase, className)} {...props}>
      {children}
    </span>
  ),
);
RadioChip.displayName = "RadioChip";

/** FilterChip — span with explicit active state (for inline display, not form-bound). */
export const FilterChip = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<"span"> & { active?: boolean; size?: "sm" | "md" }
>(({ className, active, size = "sm", ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center gap-2 rounded-full bg-secondary px-4 text-sm font-medium text-muted-foreground transition",
      size === "md" ? "min-h-11 px-4" : "h-8 px-3 text-[12px]",
      active && "bg-primary text-primary-foreground",
      className,
    )}
    {...props}
  />
));
FilterChip.displayName = "FilterChip";

/* ============================================================
   SEGMENTED — radio-group styled as inline pills
   ============================================================ */
export const Segmented = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      role="radiogroup"
      className={cn("inline-flex items-center gap-1 rounded-full border border-border bg-secondary p-1", className)}
      {...props}
    >
      {children}
    </div>
  ),
);
Segmented.displayName = "Segmented";

export const SegmentedControl = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap gap-2", className)} {...props}>
      {children}
    </div>
  ),
);
SegmentedControl.displayName = "SegmentedControl";

export const SegmentButton = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium leading-5 transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring min-h-11 rounded-[var(--radius-control)] px-4",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-secondary text-muted-foreground hover:text-foreground",
      className,
    )}
    {...props}
  />
));
SegmentButton.displayName = "SegmentButton";

/* ============================================================
   ALERT — inline status banner
   ============================================================ */
const alertVariants = cva(
  "rounded-[var(--radius-card)] border p-4 text-sm leading-6",
  {
    variants: {
      tone: {
        neutral: "border-border bg-card text-muted-foreground",
        warning: "border-warning/30 text-warning",
        danger: "border-danger/30 text-danger",
      },
      variant: {
        info: "border-border bg-secondary/60 text-foreground",
        warning: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        destructive: "border-danger/30 bg-danger/10 text-danger",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type AlertProps = ComponentPropsWithoutRef<"div"> & VariantProps<typeof alertVariants>;

export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ tone: tone || (variant as never) || "neutral" }), className)}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

/** @deprecated use Alert — kept for back-compat */
export const AlertState = forwardRef<HTMLDivElement, AlertProps & { children: ReactNode }>(
  ({ children, ...props }, ref) => (
    <Alert ref={ref} {...props}>
      {children}
    </Alert>
  ),
);
AlertState.displayName = "AlertState";

/* ============================================================
   SKELETON + BOTTOM SHEET + EMPTY STATE
   ============================================================ */
export const Skeleton = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-pulse rounded-[var(--radius-card)] bg-surface-strong", className)}
      {...props}
    />
  ),
);
Skeleton.displayName = "Skeleton";

/** @deprecated use Skeleton */
export const SkeletonBlock = Skeleton;

export function BottomSheet({ className, children, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex max-h-[82vh] w-full flex-col overflow-auto rounded-t-[var(--radius-sheet)] border border-border bg-popover p-5 shadow-2xl md:h-full md:max-w-sm md:rounded-[var(--radius-sheet)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function EmptyState({
  className,
  icon,
  title,
  children,
  action,
}: {
  className?: string;
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={cn("border-y border-border py-14 text-center", className)}>
      {icon && (
        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-[var(--radius-control)] bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="section-title">{title}</p>
      {children && <div className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ============================================================
   TABS — shadcn-style (simple controlled version)
   ============================================================ */
export const TabsList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-secondary/80 p-1",
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<"button"> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    role="tab"
    type="button"
    aria-selected={active || false}
    data-state={active ? "active" : "inactive"}
    className={cn(
      "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:pointer-events-none disabled:opacity-50",
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";