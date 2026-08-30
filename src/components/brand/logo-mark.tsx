import Image from "next/image";

type LogoMarkProps = {
  size?: "sm" | "md";
};

const sizeClassNames: Record<NonNullable<LogoMarkProps["size"]>, string> = {
  sm: "size-9",
  md: "size-10",
};

export function LogoMark({ size = "md" }: LogoMarkProps) {
  return (
    <span
      className={`${sizeClassNames[size]} grid shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface-elevated)]`}
    >
      <Image
        src="/evolve.svg"
        alt=""
        width={1254}
        height={1254}
        className="size-full object-contain"
        aria-hidden="true"
      />
    </span>
  );
}
