import type { ReactNode } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNavigation } from "@/components/navigation/mobile-navigation";
import { SidebarNavigation } from "@/components/navigation/sidebar-navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <SidebarNavigation />
      <div className="flex min-h-dvh flex-col lg:pl-[15.5rem] xl:pl-64">
        <MobileHeader />
        <main className="min-w-0 flex-1 px-[var(--space-page-x)] py-[var(--space-page-y)] pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:py-7 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNavigation />
    </div>
  );
}
