import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

type AppLayoutProps = {
  children: ReactNode;
};

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: AppLayoutProps) {
  return <AppShell>{children}</AppShell>;
}
