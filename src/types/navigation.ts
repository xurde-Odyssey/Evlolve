export type AppRoute = {
  href: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: NavigationIcon;
};

export type NavigationIcon =
  | "activity"
  | "analytics"
  | "award"
  | "boss"
  | "character"
  | "journey"
  | "overview"
  | "plus"
  | "quests"
  | "settings";
