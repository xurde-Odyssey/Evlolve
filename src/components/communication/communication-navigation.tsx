import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const links = [
  ["/communication", "Today"],
  ["/communication/practice", "Practice"],
  ["/communication/phrases", "Phrase Bank"],
  ["/communication/progress", "Progress"],
] as const;

export function CommunicationNavigation({ active }: { active: (typeof links)[number][0] }) {
  return (
    <nav className="grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 sm:flex" aria-label="Communication sections">
      {links.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={cn(
            "flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold text-[var(--foreground-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-offset-2",
            active === href && "bg-[var(--foreground)] text-[var(--background)] shadow-[var(--shadow-soft)] hover:bg-[var(--foreground)] hover:text-[var(--background)]",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
