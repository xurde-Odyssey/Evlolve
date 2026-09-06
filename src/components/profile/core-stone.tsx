import { cn } from "@/lib/utils/cn";
import { getCoreStoneStage } from "./core-stone-stage";

type CoreStoneProps = {
  level: number;
  highestLevel?: number;
  progressionState?: string;
  size?: "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-12 w-12",
  md: "h-40 w-40",
  lg: "h-56 w-56 sm:h-64 sm:w-64",
} as const;

export function CoreStone({
  level,
  highestLevel = level,
  progressionState,
  size = "lg",
  animate = true,
  className,
}: CoreStoneProps) {
  const stage = getCoreStoneStage(level);
  const highestStage = getCoreStoneStage(highestLevel);
  const normalized = Math.min(Math.max(Number.isFinite(level) ? level / 100 : 0, 0), 1);
  const structure = stage.index / 10 + stage.progress / 10;
  const isAtRisk = progressionState?.toUpperCase().includes("RISK");
  const detailed = size !== "sm";
  const fragments = stage.index >= 5 && detailed;

  const points = stage.index < 2
    ? "110,22 170,45 191,111 158,199 99,232 37,185 25,106 55,47"
    : stage.index < 4
      ? "110,17 175,48 187,116 156,210 110,237 58,207 31,119 49,50"
      : "110,12 172,45 194,112 161,216 110,244 59,216 26,112 48,45";

  return (
    <div
      className={cn("core-stone relative shrink-0", sizeClasses[size], !animate && "core-stone-static", className)}
      data-stage={stage.key}
      data-progression-state={progressionState ?? "STABLE"}
      role="img"
      aria-label={`Core Stone, Level ${Math.max(1, Math.floor(level || 1))}, ${stage.key.toLowerCase()}`}
    >
      <svg viewBox="0 0 220 260" className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="core-stone-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--core-stone-highlight)" />
            <stop offset="0.48" stopColor="var(--core-stone-surface)" />
            <stop offset="1" stopColor="var(--core-stone-base)" />
          </linearGradient>
          <linearGradient id="core-stone-core" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--core-stone-core-light)" />
            <stop offset="1" stopColor="var(--core-stone-core-dark)" />
          </linearGradient>
          <filter id="core-stone-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <ellipse cx="110" cy="239" rx="67" ry="10" fill="var(--core-stone-shadow)" opacity="0.25" filter="url(#core-stone-shadow)" />

        {highestStage.index > stage.index ? (
          <polygon points={highestStage.index >= 4 ? "110,5 184,39 202,111 169,224 110,253 50,224 18,111 37,39" : points} fill="none" stroke="var(--core-stone-memory)" strokeWidth="1.5" opacity="0.22" />
        ) : null}

        {stage.index >= 5 && detailed ? (
          <ellipse className="core-stone-orbit" cx="110" cy="126" rx="91" ry="49" fill="none" stroke="var(--core-stone-orbit-color)" strokeWidth="1.2" opacity={0.18 + normalized * 0.12} transform="rotate(-23 110 126)" />
        ) : null}

        <polygon points={points} fill="url(#core-stone-shell)" stroke="var(--core-stone-edge)" strokeWidth={stage.index >= 3 ? 2 : 1.5} />
        <polygon points="110,17 139,66 160,119 145,199 110,237 103,174 84,114 88,57" fill="var(--core-stone-facet-light)" opacity={0.12 + structure * 0.12} />
        <polygon points="110,17 88,57 84,114 103,174 110,237 110,158 110,78" fill="var(--core-stone-facet-dark)" opacity="0.25" />
        <polygon points="110,17 175,48 187,116 156,210 110,237 145,199 160,119 139,66" fill="var(--core-stone-facet-mid)" opacity="0.2" />

        {stage.index >= 1 ? (
          <path d="M83 51 105 88 94 119 111 145 100 184" fill="none" stroke="var(--core-stone-crack)" strokeWidth="2" strokeLinecap="round" opacity={0.35 + stage.progress * 0.18} />
        ) : null}
        {stage.index >= 2 ? (
          <path d="M139 68 119 101 132 126 116 164" fill="none" stroke="var(--core-stone-crack)" strokeWidth="1.4" strokeLinecap="round" opacity="0.38" />
        ) : null}

        {stage.index >= 2 ? (
          <polygon className="core-stone-inner" points="110,66 137,112 127,173 110,202 91,169 86,115" fill="url(#core-stone-core)" opacity={0.45 + normalized * 0.4} />
        ) : null}
        {stage.index >= 3 ? (
          <path d="M110 72 121 114 116 178" fill="none" stroke="var(--core-stone-core-light)" strokeWidth="2" opacity={0.35 + normalized * 0.35} />
        ) : null}
        <path d="M55 49 83 34M37 105 31 143M166 48 183 76" fill="none" stroke="var(--core-stone-highlight)" strokeWidth="2" strokeLinecap="round" opacity={0.22 + structure * 0.2} />

        {fragments ? (
          <g className="core-stone-fragments" fill="var(--core-stone-fragment)" opacity="0.65">
            <polygon points="188,77 198,71 202,83 194,91" />
            <polygon points="30,151 21,146 24,135 34,140" />
          </g>
        ) : null}
        {stage.index >= 8 && detailed ? <circle cx="187" cy="117" r="2" fill="var(--accent-pro)" opacity="0.62" /> : null}
        {isAtRisk ? <path d="M110 20 174 49" stroke="var(--core-stone-risk)" strokeWidth="1" opacity="0.22" /> : null}
      </svg>
    </div>
  );
}
