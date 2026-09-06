"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export function PasswordField() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        autoComplete="current-password"
        className="min-h-12 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3.5 pr-12 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] outline-none transition placeholder:text-[var(--foreground-muted)] focus:border-[var(--primary)] focus:shadow-[var(--shadow-focus)]"
        name="password"
        required
        type={visible ? "text" : "password"}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[var(--foreground-muted)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-offset-0"
        onClick={() => setVisible((current) => !current)}
        title={visible ? "Hide password" : "Show password"}
        type="button"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.9} />
        ) : (
          <Eye aria-hidden="true" className="size-4" strokeWidth={1.9} />
        )}
      </button>
    </div>
  );
}
