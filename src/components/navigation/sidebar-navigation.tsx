import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { primaryRoutes, secondaryRoutes } from "@/config/navigation";
import { APP_NAME } from "@/lib/constants/app";
import { LogActivityAction } from "./log-activity-action";
import { NavigationItem } from "./navigation-item";

export function SidebarNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] border-r border-[var(--border)] bg-[var(--chrome-surface)] px-4 py-5 backdrop-blur lg:block xl:w-64">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2">
          <LogoMark />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--foreground)]">
              {APP_NAME}
            </p>
            <p className="truncate text-xs text-[var(--foreground-muted)]">
              Personal progression
            </p>
          </div>
        </Link>

        <div className="mt-7">
          <LogActivityAction />
        </div>

        <nav aria-label="Primary navigation" className="mt-7 space-y-1.5">
          {primaryRoutes.map((route) => (
            <NavigationItem
              key={route.href}
              href={route.href}
              icon={route.icon}
              label={route.label}
            />
          ))}
        </nav>

        <div className="mt-7 border-t border-[var(--border)] pt-5">
          <nav aria-label="Secondary navigation" className="space-y-1.5">
            {secondaryRoutes.map((route) => (
              <NavigationItem
                key={route.href}
                href={route.href}
                icon={route.icon}
                label={route.label}
              />
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
}
