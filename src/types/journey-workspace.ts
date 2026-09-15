export type JourneyNodeCategory = "skills" | "learning" | "experience" | "goals" | "resources";
export type JourneyNodeStatus = "planned" | "learning" | "in_progress" | "completed" | "paused";
export type JourneySkillLevel = "basic" | "intermediate" | "advanced";
export type JourneyDiaryType = "learning" | "project" | "achievement" | "experience" | "reflection" | "milestone" | "lesson" | "decision" | "resource" | "note";

export type JourneyNode = {
  id: string;
  category: JourneyNodeCategory;
  title: string;
  description?: string;
  status: JourneyNodeStatus;
  completed: boolean;
  completedAt?: string;
  level?: JourneySkillLevel;
  targetDate?: string;
};

export type JourneyDiaryEntry = {
  id: string;
  title: string;
  body: string;
  type: JourneyDiaryType;
  entryDate: string;
  tags: string[];
  nodeIds: string[];
  milestone?: boolean;
};

export type JourneyQuickNote = { id: string; body: string; createdAt: string; pinned: boolean };
export type JourneyNextStep = { id: string; title: string; completed: boolean; dueDate?: string };

export type JourneyFocus = {
  id: string;
  title: string;
  description: string;
  startedAt: string;
  targetDate?: string;
  status: "active" | "paused" | "completed";
};

export type JourneyWorkspaceData = {
  focus: JourneyFocus;
  nodes: JourneyNode[];
  diary: JourneyDiaryEntry[];
  notes: JourneyQuickNote[];
  nextSteps: JourneyNextStep[];
};
