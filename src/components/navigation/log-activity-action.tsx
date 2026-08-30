import { logActivityRoute } from "@/config/navigation";
import { NavigationItem } from "./navigation-item";

type LogActivityActionProps = {
  variant?: "desktop" | "mobile";
};

export function LogActivityAction({ variant = "desktop" }: LogActivityActionProps) {
  const label =
    variant === "mobile" ? logActivityRoute.shortLabel ?? "Log" : logActivityRoute.label;

  return (
    <NavigationItem
      href={logActivityRoute.href}
      icon={logActivityRoute.icon}
      label={label}
      variant={variant === "mobile" ? "mobile" : "action"}
      isEmphasized
    />
  );
}
