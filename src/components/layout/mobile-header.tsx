import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { APP_NAME } from "@/lib/constants/app";

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 w-full min-w-0 border-b border-[var(--border)] bg-[var(--chrome-surface)] px-[var(--space-page-x)] pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <div className="flex min-h-10 items-center justify-between gap-3">
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
          <LogoMark size="sm" />
          <span className="truncate text-base font-semibold tracking-normal">
            {APP_NAME}
          </span>
        </Link>
      </div>
    </header>
  );
}
