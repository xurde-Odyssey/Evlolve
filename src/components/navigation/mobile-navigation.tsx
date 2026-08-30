import { mobileRoutes } from "@/config/navigation";
import { LogActivityAction } from "./log-activity-action";
import { NavigationItem } from "./navigation-item";

export function MobileNavigation() {
  return (
    <nav
      aria-label="Mobile primary navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--chrome-surface)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_36px_color-mix(in_srgb,var(--primary)_8%,transparent)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto grid w-full max-w-xl grid-cols-5 items-end gap-1">
        {mobileRoutes.map((route) =>
          route.href === "/activities" ? (
            <LogActivityAction key={route.href} variant="mobile" />
          ) : (
            <NavigationItem
              key={route.href}
              href={route.href}
              icon={route.icon}
              label={route.shortLabel ?? route.label}
              variant="mobile"
            />
          ),
        )}
      </div>
    </nav>
  );
}
