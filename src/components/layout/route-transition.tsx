"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type RouteTransitionProps = {
  children: ReactNode;
};

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => setIsNavigating(false), 0);
    return () => window.clearTimeout(resetTimer);
  }, [pathname]);

  useEffect(() => {
    function handleLinkIntent(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;

      setIsNavigating(true);
    }

    document.addEventListener("click", handleLinkIntent);
    return () => document.removeEventListener("click", handleLinkIntent);
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`route-progress ${isNavigating ? "route-progress-visible" : ""}`}
      />
      <div key={pathname} className="route-page-enter">
        {children}
      </div>
    </>
  );
}
