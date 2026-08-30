import type { ReactNode } from "react";
import {
  AlertTriangle,
  ChartNoAxesCombined,
  LoaderCircle,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type SystemStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "warning" | "error";
  compact?: boolean;
};

export function SystemState({
  title,
  description,
  action,
  icon: Icon = ChartNoAxesCombined,
  tone = "neutral",
  compact = false,
}: SystemStateProps) {
  return (
    <div
      className={cn(
        "motion-panel rounded-md border border-[var(--border)] bg-[var(--background)] p-4",
        tone === "warning" && "bg-[var(--warning-subtle)]",
        tone === "error" && "bg-[var(--boss-subtle)]",
        compact ? "space-y-2" : "space-y-4",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground-muted)]">
          <Icon
            aria-hidden="true"
            className="size-4"
            focusable="false"
            strokeWidth={1.9}
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  title = "Loading",
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <SystemState
      title={title}
      description={description}
      icon={LoaderCircle}
      compact
    />
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <SystemState
      title={title}
      description={description}
      icon={AlertTriangle}
      tone="error"
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}

export function OfflineState() {
  return (
    <SystemState
      title="You're offline"
      description="Some Evolve data may be unavailable until your connection returns."
      icon={WifiOff}
      tone="warning"
    />
  );
}
