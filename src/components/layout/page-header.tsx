type PageHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export function PageHeader({ title, description, eyebrow }: PageHeaderProps) {
  return (
    <header className="max-w-3xl space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
          {eyebrow}
        </p>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)] md:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-[var(--foreground-muted)]">
          {description}
        </p>
      </div>
    </header>
  );
}
