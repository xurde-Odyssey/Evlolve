import {
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  CirclePause,
  Code,
  Droplets,
  Dumbbell,
  Footprints,
  Moon,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ActivityKey } from "@/types/activity";

export const activityIcons = {
  workout: Dumbbell,
  running: Footprints,
  reading: BookOpen,
  coding: Code,
  meditation: Brain,
  sleep: Moon,
  water: Droplets,
  custom: Circle,
} satisfies Record<ActivityKey, LucideIcon>;

export const statusIcons = {
  completed: CheckCircle2,
  pending: Circle,
  missed: XCircle,
  inactive: CirclePause,
  scheduled_rest: Moon,
} satisfies Record<
  "completed" | "pending" | "missed" | "inactive" | "scheduled_rest",
  LucideIcon
>;
