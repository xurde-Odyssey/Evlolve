import type { CommunicationModule } from "./session";

export type CommunicationCompletionInput = {
  module: CommunicationModule;
  durationSeconds: number;
  meaningfulUnits: number;
  endedAt: string;
};

export function isMeaningfulCommunicationCompletion(input: CommunicationCompletionInput) {
  const minimumUnits = input.module === "DAILY_CONVERSATION" ? 2 : 1;
  return input.durationSeconds >= 60 && input.meaningfulUnits >= minimumUnits;
}

export function communicationActivityLogInput(sessionId: string, input: CommunicationCompletionInput) {
  if (!isMeaningfulCommunicationCompletion(input)) return null;
  return {
    idempotencyKey: `communication:${input.module}:${sessionId}`,
    activityKey: "communication" as const,
    measurementType: "completion" as const,
    value: 1,
    unit: "session",
    occurredAt: input.endedAt,
  };
}
