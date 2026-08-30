import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex min-h-11 items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
          variant === "primary" &&
            "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-105",
          variant === "secondary" &&
            "border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:border-[var(--primary)]",
          variant === "ghost" &&
            "text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]",
          className,
        )}
        {...props}
      />
    );
  },
);
