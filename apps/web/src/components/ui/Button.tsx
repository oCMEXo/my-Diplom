import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:brightness-90 active:brightness-75",
  secondary: "bg-control text-fg hover:bg-control-hover",
  ghost: "text-muted hover:bg-raised hover:text-fg",
  // The same solid red in both themes: white text reads on it.
  danger: "bg-danger text-white hover:brightness-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 rounded-lg px-3 text-sm",
  md: "h-10 gap-2 rounded-lg px-4 text-base",
  lg: "h-11 gap-2 rounded-lg px-6 text-base",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition duration-150 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  className,
  active,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={rest.title ?? label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-raised hover:text-fg disabled:opacity-40",
        active && "bg-selected text-fg",
        className,
      )}
      {...rest}
    />
  );
}
