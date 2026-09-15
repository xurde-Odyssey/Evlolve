import type { AppRoute } from "@/types/navigation";

export const appRoutes: AppRoute[] = [
  {
    href: "/dashboard",
    label: "Overview",
    description: "Foundation route for the main command view.",
    icon: "overview",
  },
  {
    href: "/quests",
    label: "Quests",
    description: "Foundation route for future quest planning.",
    icon: "quests",
  },
  {
    href: "/activities",
    label: "Activities",
    description: "Foundation route for future activity capture.",
    icon: "activity",
  },
  {
    href: "/communication",
    label: "Communication",
    description: "Practice natural English communication over time.",
    icon: "communication",
  },
  {
    href: "/markets",
    label: "Markets & News",
    description: "A focused view for news, crypto markets, and top-flight football.",
    icon: "markets",
  },
  {
    href: "/journey",
    label: "Journey",
    description: "Foundation route for progression history.",
    icon: "journey",
  },
  {
    href: "/character",
    label: "Character",
    description: "Foundation route for the evolving avatar.",
    icon: "character",
  },
  {
    href: "/goals",
    label: "Boss Challenges",
    description: "Adaptive challenges based on demonstrated capability.",
    icon: "boss",
  },
  {
    href: "/hub",
    label: "Achievements",
    description: "Visual room for earned accomplishments.",
    icon: "award",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Evidence view for activity and progression reports.",
    icon: "analytics",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Foundation route for future preferences.",
    icon: "settings",
  },
  {
    href: "/notepad",
    label: "Notepad",
    description: "A quiet place for quick notes and working thoughts.",
    icon: "notepad",
  },
];

function getRoute(href: AppRoute["href"]) {
  const route = appRoutes.find((item) => item.href === href);

  if (!route) {
    throw new Error(`Missing route configuration for ${href}`);
  }

  return route;
}

export const logActivityRoute: AppRoute = {
  ...getRoute("/activities"),
  label: "Log Activity",
  shortLabel: "Log",
  icon: "plus",
};

export const primaryRoutes: AppRoute[] = [
  getRoute("/dashboard"),
  getRoute("/quests"),
  getRoute("/communication"),
  getRoute("/markets"),
  getRoute("/journey"),
  getRoute("/character"),
  getRoute("/reports"),
  getRoute("/hub"),
  getRoute("/notepad"),
  getRoute("/settings"),
];

export const secondaryRoutes: AppRoute[] = [];

export const mobileMoreRoutes: AppRoute[] = [
  getRoute("/markets"),
  getRoute("/reports"),
  getRoute("/hub"),
  getRoute("/notepad"),
  getRoute("/settings"),
];

export const journeySubRoutes = [
  { href: "/journey/mind-map", label: "Roadmap" },
  { href: "/journey/diary", label: "Diary" },
  { href: "/journey/timeline", label: "Timeline" },
] as const;

export const mobileRoutes: AppRoute[] = [
  getRoute("/dashboard"),
  getRoute("/quests"),
  getRoute("/communication"),
  logActivityRoute,
  getRoute("/journey"),
  getRoute("/character"),
];
