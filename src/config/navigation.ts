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
    href: "/achievements",
    label: "Achievements",
    description: "Foundation route for future milestones.",
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
  getRoute("/journey"),
  getRoute("/character"),
  getRoute("/reports"),
];

export const secondaryRoutes: AppRoute[] = [
  getRoute("/achievements"),
  getRoute("/settings"),
];

export const mobileRoutes: AppRoute[] = [
  getRoute("/dashboard"),
  getRoute("/quests"),
  logActivityRoute,
  getRoute("/journey"),
  getRoute("/character"),
];
