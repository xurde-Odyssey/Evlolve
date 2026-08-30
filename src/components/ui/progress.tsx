type ProgressProps = {
  value: number;
  ariaLabel?: string;
  ariaValueText?: string;
  label?: string;
};

export function Progress({
  value,
  ariaLabel,
  ariaValueText,
  label,
}: ProgressProps) {
  const boundedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--foreground-muted)]">
          <span>{label}</span>
          <span className="numeric font-mono text-[var(--foreground)]">
            {boundedValue}%
          </span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={boundedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={ariaValueText}
      >
        <div
          className="h-full rounded-full bg-[var(--xp)] transition-[width] [transition-duration:var(--motion-duration-base)] [transition-timing-function:var(--motion-ease)]"
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
}
