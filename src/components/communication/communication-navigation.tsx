import Link from "next/link";
import { BarChart3, BookOpen, CalendarDays, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const links = [
  { href: "/communication", label: "Today", icon: CalendarDays },
  { href: "/communication/practice", label: "Practice", icon: MessageSquare },
  { href: "/communication/phrases", label: "Phrase Bank", icon: BookOpen },
  { href: "/communication/progress", label: "Progress", icon: BarChart3 },
] as const;

export function CommunicationNavigation({ active }: { active: (typeof links)[number]["href"] }) {
  return (
    <nav className="flex w-full gap-1 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-soft)] [scrollbar-width:none] sm:grid sm:grid-cols-4 sm:overflow-visible" aria-label="Communication sections">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 min-w-[6.75rem] flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-semibold text-[var(--foreground-muted)] transition-[background-color,color,box-shadow] duration-200 hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)] sm:min-w-0",
            active === href && "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[var(--shadow-soft)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]",
          )}
        >
          <Icon aria-hidden="true" className={cn("mr-2 size-4 shrink-0", active === href && "text-[var(--foreground)]")} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
