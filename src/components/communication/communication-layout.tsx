import type { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CommunicationNavigation } from "./communication-navigation";

export function CommunicationLayout({
  active,
  title,
  description,
  children,
}: {
  active: "/communication" | "/communication/practice" | "/communication/phrases" | "/communication/progress";
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="/communication" title={title} description={description} />
      <CommunicationNavigation active={active} />
      {children}
    </div>
  );
}
