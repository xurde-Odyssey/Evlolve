import type { CommunicationDifficulty, CommunicationInputMode } from "@/types/communication";

export type CommunicationModule = "DAILY_CONVERSATION" | "EXPLAIN_BETTER" | "UNDERSTAND_MEANING" | "PHRASE_PRACTICE";
export type CommunicationSessionFoundationStatus = "CREATED" | "ACTIVE" | "PROCESSING" | "COMPLETED" | "INCOMPLETE" | "FAILED" | "CANCELLED";

export type CommunicationSessionFoundation = {
  sessionId: string;
  userId: string;
  module: CommunicationModule;
  startedAt: string;
  endedAt?: string;
  status: CommunicationSessionFoundationStatus;
  inputMode?: CommunicationInputMode;
  difficulty?: CommunicationDifficulty;
  targetDurationMinutes?: number;
  actualDurationSeconds?: number;
  xpAwarded?: number;
  evidenceGenerated: boolean;
};

export const communicationSessionMinimums = {
  DAILY_CONVERSATION: { minutes: 2, userTurns: 2 },
  EXPLAIN_BETTER: { minutes: 1, completedTasks: 1 },
  UNDERSTAND_MEANING: { minutes: 1, completedItems: 1 },
  PHRASE_PRACTICE: { minutes: 1, answeredPhrases: 1 },
} as const;

export const communicationSessionInactivityMs = 45 * 60 * 1000;

export function isCommunicationSessionStale(startedAt: string, now = Date.now()) {
  return now - Date.parse(startedAt) > communicationSessionInactivityMs;
}

export function normalizeCommunicationSessionStatus(status: string): CommunicationSessionFoundationStatus {
  if (status === "ACTIVE" || status === "ANALYZING") return status === "ANALYZING" ? "PROCESSING" : "ACTIVE";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "INCOMPLETE") return "INCOMPLETE";
  if (status === "ERROR") return "FAILED";
  return "CREATED";
}
