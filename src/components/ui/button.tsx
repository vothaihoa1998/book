import { type ComponentPropsWithoutRef } from "react";
import { AppButton } from "./primitives";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <AppButton className={className} variant={variant} {...props} />;
}
