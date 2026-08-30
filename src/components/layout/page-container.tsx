import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-6xl space-y-6", className)}>
      {children}
    </div>
  );
}
