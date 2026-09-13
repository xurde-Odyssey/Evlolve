import type {
  CommunicationPhrase,
  CommunicationPhraseEvent,
  CommunicationPhraseStatus,
  CommunicationPracticeResult,
} from "@/types/communication";

export const phraseReviewIntervals: Record<CommunicationPhraseStatus, number> = {
  NEW: 1,
  LEARNING: 2,
  PRACTICING: 5,
  MASTERED: 21,
};

export type PhraseMasteryDecision = {
  status: CommunicationPhraseStatus;
  nextReviewAt: string;
  masteredAt?: string;
};

export function normalizePhrase(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[.!?,;:]+$/g, "").replace(/\s+/g, " ");
}

export function evaluatePhraseMastery(
  phrase: Pick<CommunicationPhrase, "status" | "masteredAt">,
  events: readonly CommunicationPhraseEvent[],
  now = new Date().toISOString(),
): PhraseMasteryDecision {
  const meaningful = events.filter((event) => event.eventType !== "EXPOSED");
  const recognition = meaningful.filter((event) => ["UNDERSTOOD", "RECOGNIZED", "REQUESTED_HELP", "REVIEW_PASSED"].includes(event.eventType)).length;
  const successes = meaningful.filter((event) => ["RECALLED", "USED_WITH_PROMPT", "USED_UNPROMPTED", "USED_CORRECTLY", "REVIEW_PASSED"].includes(event.eventType));
  const unprompted = meaningful.filter((event) => ["USED_UNPROMPTED", "USED_CORRECTLY"].includes(event.eventType));
  const failures = meaningful.filter((event) => ["USED_INCORRECTLY", "REVIEW_FAILED"].includes(event.eventType));
  const days = new Set(successes.map((event) => event.occurredAt.slice(0, 10)));
  const recentFailures = failures.filter((event) => Date.parse(event.occurredAt) >= Date.parse(now) - 30 * 86_400_000);

  let status: CommunicationPhraseStatus = "NEW";
  if (recognition > 0) status = "LEARNING";
  if (successes.length >= 2) status = "PRACTICING";
  if (unprompted.length >= 3 && days.size >= 2 && recentFailures.length < 2) status = "MASTERED";
  if (phrase.status === "MASTERED" && recentFailures.length >= 2) status = "PRACTICING";

  const nextReviewAt = new Date(Date.parse(now) + phraseReviewIntervals[status] * 86_400_000).toISOString();
  return { status, nextReviewAt, ...(status === "MASTERED" ? { masteredAt: phrase.masteredAt ?? now } : {}) };
}

export function eventForPractice(result: CommunicationPracticeResult, activityType: string): "REVIEW_PASSED" | "RECALLED" | "USED_CORRECTLY" | "USED_INCORRECTLY" | "REVIEW_FAILED" {
  if (result === "FAIL") return "REVIEW_FAILED";
  if (activityType === "RECALL") return "RECALLED";
  if (activityType === "NATURAL_USAGE" || activityType === "CONVERSATION_USAGE") return result === "PASS" ? "USED_CORRECTLY" : "USED_INCORRECTLY";
  return result === "PASS" ? "REVIEW_PASSED" : "REVIEW_FAILED";
}
