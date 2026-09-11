"use client";

import { LogOut, X } from "lucide-react";
import { useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { LogoMark } from "@/components/brand/logo-mark";
import { NavigationItem } from "@/components/navigation/navigation-item";
import { secondaryRoutes } from "@/config/navigation";
import { APP_NAME } from "@/lib/constants/app";

export function MobileHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="mobile-header sticky top-0 z-30 w-full min-w-0 border-b border-[var(--border)] bg-[var(--chrome-surface)] px-[var(--space-page-x)] pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <button
          type="button"
          className="mobile-header-trigger flex min-w-0 items-center gap-3 rounded-md text-left"
          aria-expanded={menuOpen}
          aria-controls="mobile-secondary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <LogoMark size="sm" />
          <span className="truncate text-base font-semibold tracking-normal text-[var(--foreground)]">
            {APP_NAME}
          </span>
          {menuOpen ? <X aria-hidden="true" className="size-4 text-[var(--foreground-muted)]" /> : null}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="mobile-secondary-navigation"
          className="mobile-header-menu"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
          }}
        >
          <p className="mobile-header-menu-label">More</p>
          <nav aria-label="Mobile secondary navigation" className="space-y-1">
            {secondaryRoutes.map((route) => (
              <NavigationItem
                key={route.href}
                href={route.href}
                icon={route.icon}
                label={route.label}
              />
            ))}
          </nav>
          <form action={signOutAction} className="mt-2 border-t border-[var(--border)] pt-2">
            <button className="mobile-header-signout" type="submit">
              <LogOut aria-hidden="true" className="size-4" strokeWidth={1.9} />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
