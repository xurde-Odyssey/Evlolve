import {
  Award,
  ChartNoAxesCombined,
  ClipboardCheck,
  Crown,
  LayoutDashboard,
  ListChecks,
  Plus,
  StickyNote,
  Route,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { NavigationIcon as NavigationIconName } from "@/types/navigation";

const icons: Record<NavigationIconName, LucideIcon> = {
  activity: ClipboardCheck,
  analytics: ChartNoAxesCombined,
  award: Award,
  boss: Crown,
  character: UserRound,
  journey: Route,
  overview: LayoutDashboard,
  plus: Plus,
  quests: ListChecks,
  settings: Settings,
  notepad: StickyNote,
};

type NavigationIconProps = {
  name: NavigationIconName;
  className?: string;
  strokeWidth?: number;
};

export function NavigationIcon({ name, className, strokeWidth = 1.9 }: NavigationIconProps) {
  const Icon = icons[name];

  return (
    <Icon
      aria-hidden="true"
      className={className}
      focusable="false"
      strokeWidth={strokeWidth}
    />
  );
}
