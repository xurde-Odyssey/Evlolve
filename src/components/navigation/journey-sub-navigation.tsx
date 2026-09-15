"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { journeySubRoutes } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

export function JourneySubNavigation() {
  const pathname = usePathname();
  return <div className="ml-7 mt-1 space-y-0.5 border-l border-[var(--border)] pl-3">{journeySubRoutes.map((route) => { const active = pathname === route.href || (route.href === "/journey/mind-map" && pathname === "/journey"); return <Link key={route.href} href={route.href} aria-current={active ? "page" : undefined} className={cn("block rounded px-2 py-1.5 text-xs text-[var(--foreground-muted)] transition hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]", active && "bg-[var(--surface-elevated)] font-semibold text-[var(--foreground)]")}>{route.label}</Link>; })}</div>;
}
