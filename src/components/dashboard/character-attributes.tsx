import Image from "next/image";
import { Card } from "@/components/ui/card";
import { getLocalDateKey } from "@/application/evolve/time-policy";

export type CharacterAttributeKey =
  | "training"
  | "reading"
  | "running"
  | "health"
  | "discipline"
  | "career"
  | "social";

export type CharacterAttribute = {
  key: CharacterAttributeKey;
  label: string;
  value: string;
  context: string;
  progress: number;
};

const dailyPrinciples = [
  "Control the next action, not the entire outcome.",
  "A standard is built by repeated ordinary decisions.",
  "Make the important thing easy to begin.",
  "Keep the promise small enough to keep.",
  "Measure the work. Adjust the method.",
  "Do not trade a durable standard for a temporary feeling.",
  "What is repeated becomes structure.",
  "Finish the essential before adding the impressive.",
  "Let evidence refine the plan.",
  "A calm system outlasts a dramatic effort.",
  "Protect the work that keeps other work possible.",
  "Consistency is a decision made again today.",
];

export function CharacterAttributes({ now, timezone }: { now: string; timezone: string }) {
  const dateKey = getLocalDateKey(now, timezone);
  const principle = dailyPrinciples[Number(dateKey.replaceAll("-", "")) % dailyPrinciples.length];

  return (
    <Card className="h-full overflow-hidden p-3 sm:p-4">
      <figure className="dashboard-wall-frame">
        <div className="dashboard-wall-frame-mat">
          <Image
            src="/goals.png"
            alt="Goals and personal development artwork"
            fill
            sizes="(max-width: 1279px) 100vw, 28rem"
            className="object-contain"
            priority
          />
        </div>
      </figure>
      <div className="daily-principle-paper mt-4 flex min-h-36 flex-col justify-center px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent-pro)]">
          Daily principle
        </p>
        <blockquote className="mt-3 max-w-sm border-l-2 border-[var(--accent-pro)]/50 pl-4 font-mono text-lg font-semibold leading-7 text-[var(--foreground)] sm:text-xl sm:leading-8">
          {principle}
        </blockquote>
      </div>
      <div className="mt-4 space-y-6">
        {([
          ["/background.png", "Focused personal development workspace"],
          ["/seond.jpeg", "Personal development workspace"],
        ] as const).map(([src, alt], index) => (
          <div key={src}>
            <figure className="dashboard-wall-frame">
              <div className="dashboard-wall-frame-mat">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="(max-width: 1279px) 100vw, 28rem"
                  className="object-contain"
                />
              </div>
            </figure>
            {index === 0 && <p className="py-1 text-center font-mono text-sm font-semibold italic text-[var(--foreground-muted)]">Be wise.</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
