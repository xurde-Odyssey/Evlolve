"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavigationIcon as NavigationIconName } from "@/types/navigation";
import { NavigationIcon } from "./navigation-icon";

type NavigationItemProps = {
  href: string;
  label: string;
  icon: NavigationIconName;
  isEmphasized?: boolean;
  variant?: "sidebar" | "mobile" | "action";
};

export function NavigationItem({
  href,
  label,
  icon,
  isEmphasized = false,
  variant = "sidebar",
}: NavigationItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (variant === "mobile") {
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        aria-label={isEmphasized ? "Log activity" : label}
        className={cn(
          "group flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-center text-[0.68rem] font-medium text-[var(--foreground-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] active:scale-[0.99] focus-visible:outline-offset-0 min-[380px]:text-[0.72rem] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
          isActive &&
            "bg-[var(--surface-elevated)] text-[var(--foreground)]",
          isEmphasized &&
            "min-h-14 bg-transparent text-[var(--foreground)] hover:bg-transparent",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-6 place-items-center rounded-md transition [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
            isActive && "text-[var(--accent-pro)]",
            isEmphasized &&
              "size-10 border border-[var(--emphasis-border)] bg-[var(--accent-pro)] text-white shadow-[var(--shadow-soft)] group-active:scale-95",
          )}
        >
          <NavigationIcon
            name={icon}
            className={cn("size-4", isEmphasized && "size-5")}
          />
        </span>
        <span className="max-w-full truncate">{label}</span>
      </Link>
    );
  }

  if (variant === "action") {
    return (
      <Link
        href={href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group flex min-h-11 items-center gap-2.5 rounded-md border border-[var(--emphasis-border)] bg-[var(--surface-elevated)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent-pro)] hover:bg-[var(--muted)] focus-visible:outline-offset-2 active:translate-y-px [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
          isActive && "border-[var(--accent-pro)] bg-[var(--accent-subtle)]",
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-[var(--accent-pro)] text-white transition group-active:scale-95 [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]">
          <NavigationIcon name={icon} className="size-4" />
        </span>
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 items-center gap-2.5 rounded-md px-3 text-sm font-medium text-[var(--foreground-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-offset-2 active:translate-y-px [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
        isActive &&
          "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[inset_3px_0_0_var(--accent-pro)]",
      )}
    >
      <NavigationIcon
        name={icon}
        className={cn(
          "size-4 shrink-0 text-current opacity-75 transition [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease)]",
          isActive && "text-[var(--accent-pro)] opacity-100",
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
