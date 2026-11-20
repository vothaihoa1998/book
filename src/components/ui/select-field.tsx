"use client";

import { useId, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectFieldOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type SelectFieldProps = {
  options: readonly SelectFieldOption[];
  label?: string;
  className?: string;
  triggerClassName?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onValueChange?: (value: string | null) => void;
  "aria-label"?: string;
};

export function SelectField({
  options,
  label,
  className,
  triggerClassName,
  name,
  value,
  defaultValue,
  placeholder,
  onValueChange,
  "aria-label": ariaLabel,
}: SelectFieldProps) {
  const id = useId();
  const labelId = label ? `${id}-label` : undefined;
  const items = options.map(({ value: itemValue, label: itemLabel }) => ({
    value: itemValue,
    label: itemLabel,
  }));

  return (
    <div className={cn("min-w-0", className)}>
      {label && <span id={labelId} className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>}
      <Select
        items={items}
        name={name}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
      >
        <SelectTrigger
          aria-label={ariaLabel}
          aria-labelledby={labelId}
          className={cn("h-10", triggerClassName)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
