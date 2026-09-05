import { ArrowRight, LockKeyhole } from "lucide-react";
import { signInAction } from "@/app/auth/actions";
import { LogoMark } from "@/components/brand/logo-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthWorkspaceProps = {
  nextPath: string;
  errorMessage?: string;
};

export function AuthWorkspace({ nextPath, errorMessage }: AuthWorkspaceProps) {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-md items-center justify-center py-8 sm:py-12">
      <div className="motion-panel w-full space-y-6">
        <div className="flex flex-col items-center text-center">
          <LogoMark size="md" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
            Evolve
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--foreground)] sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--foreground-muted)]">
            Continue building a clearer record of your progress.
          </p>
        </div>

        <Card className="space-y-6 p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--accent-subtle)] text-[var(--primary)]">
              <LockKeyhole aria-hidden="true" className="size-4" strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">
                Sign in to your account
              </h2>
              <p className="mt-1 text-xs text-[var(--foreground-muted)]">
                Your commitments and progression are waiting.
              </p>
            </div>
          </div>

          <form action={signInAction} className="space-y-5">
            <input name="next" type="hidden" value={nextPath} />
            {errorMessage ? (
              <p
                aria-live="polite"
                className="rounded-md border border-[var(--accent-pro)] bg-[var(--accent-subtle)] px-3.5 py-3 text-sm leading-5 text-[var(--foreground)]"
                role="alert"
              >
                {errorMessage}
              </p>
            ) : null}
            <AuthField label="Email address" name="email" type="email" />
            <AuthField label="Password" name="password" type="password" />
            <Button className="w-full gap-2" disabled={!configured} type="submit">
              Sign in
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Button>
          </form>

          {!configured ? (
            <p className="border-t border-[var(--border)] pt-4 text-center text-xs leading-5 text-[var(--foreground-muted)]">
              Authentication is unavailable until the Supabase environment is configured.
            </p>
          ) : null}
        </Card>

        <p className="text-center text-xs text-[var(--foreground-muted)]">
          Private workspace | Your data stays tied to your account
        </p>
      </div>
    </div>
  );
}

function AuthField({
  label,
  name,
  type,
}: {
  label: string;
  name: string;
  type: "email" | "password";
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-[var(--foreground)]">
      <span>{label}</span>
      <input
        autoComplete={type === "email" ? "email" : "current-password"}
        className="min-h-12 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3.5 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)] outline-none transition placeholder:text-[var(--foreground-muted)] focus:border-[var(--primary)] focus:shadow-[var(--shadow-focus)]"
        name={name}
        required
        type={type}
      />
    </label>
  );
}
