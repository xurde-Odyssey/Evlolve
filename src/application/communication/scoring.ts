import type { CommunicationAssistanceLevel, CommunicationDifficulty, CommunicationSkillDimension, CommunicationSkillDimensionState, CommunicationSkillEvidence, CommunicationSkillSnapshot } from "@/types/communication";

export const communicationDimensions: CommunicationSkillDimension[] = ["conversationFlow", "understanding", "wordChoice", "explanationClarity", "fluency", "phraseUsage"];
export const communicationDimensionLabels: Record<CommunicationSkillDimension, string> = { conversationFlow: "Conversation Flow", understanding: "Understanding", wordChoice: "Word Choice", explanationClarity: "Explanation Clarity", fluency: "Fluency", phraseUsage: "Phrase Usage" };
export const communicationDimensionDescriptions: Record<CommunicationSkillDimension, string> = { conversationFlow: "Continuing exchanges with relevant detail and natural transitions.", understanding: "Following contextual meaning, indirect language, and intent.", wordChoice: "Finding appropriate, natural words and phrases.", explanationClarity: "Organizing ideas so another person can follow them easily.", fluency: "Maintaining continuity without relying heavily on help.", phraseUsage: "Recognizing, recalling, and using useful expressions naturally." };
const scoreWeights: Record<CommunicationSkillDimension, number> = { conversationFlow: 0.2, understanding: 0.2, wordChoice: 0.2, explanationClarity: 0.2, fluency: 0.1, phraseUsage: 0.1 };
const difficultyWeight: Record<CommunicationDifficulty, number> = { EASY: 0.8, ADAPTIVE: 0.9, NORMAL: 1, CHALLENGING: 1.1 };
const assistanceWeight: Record<CommunicationAssistanceLevel, number> = { NONE: 1, LIGHT_HINT: 0.88, STRONG_HINT: 0.72, MODEL_EXAMPLE: 0.58, DIRECT_PROMPT: 0.68 };

export function scoreCommunicationSkills(evidence: readonly CommunicationSkillEvidence[], now = new Date().toISOString()) {
  const dimensions = communicationDimensions.map((dimension) => scoreDimension(dimension, evidence.filter((item) => item.dimension === dimension), now));
  const established = dimensions.filter((item) => item.score !== null);
  const totalWeight = established.reduce((sum, item) => sum + scoreWeights[item.dimension], 0);
  const overallScore = totalWeight ? Math.round(established.reduce((sum, item) => sum + (item.score ?? 0) * scoreWeights[item.dimension], 0) / totalWeight) : null;
  const strongest = established.slice().sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const weakest = established.filter((item) => item.confidence >= 0.45).slice().sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0] ?? established.slice().sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
  return { dimensions, overallScore, overallBand: bandFor(overallScore), strongest, weakest };
}

function scoreDimension(dimension: CommunicationSkillDimension, items: readonly CommunicationSkillEvidence[], now: string): CommunicationSkillDimensionState {
  if (!items.length) return state(dimension, null, 0, 0, "INSUFFICIENT", "INSUFFICIENT_DATA");
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(item.evidenceKey ?? item.id, (counts.get(item.evidenceKey ?? item.id) ?? 0) + 1));
  const weighted = items.map((item) => {
    const ageDays = Math.max(0, (Date.parse(now) - Date.parse(item.occurredAt)) / 86_400_000);
    const recency = Math.exp(-ageDays / 45);
    const duplicateDampening = 1 / (1 + ((counts.get(item.evidenceKey ?? item.id) ?? 1) - 1) * 0.35);
    const weight = recency * difficultyWeight[item.difficulty] * assistanceWeight[item.assistanceLevel] * Math.max(0.2, item.confidence) * duplicateDampening;
    return { item, weight };
  });
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  const score = Math.round(weighted.reduce((sum, entry) => sum + entry.item.value * entry.weight, 0) / totalWeight);
  const confidenceAverage = weighted.reduce((sum, entry) => sum + entry.item.confidence * entry.weight, 0) / totalWeight;
  const diversity = Math.min(1, new Set(items.map((item) => `${item.sourceModule}:${item.evidenceType}`)).size / 3);
  const confidence = Math.round(confidenceAverage * Math.min(1, items.length / 8) * (0.7 + diversity * 0.3) * 100) / 100;
  const status = items.length >= 8 ? "ESTABLISHED" : "EARLY";
  const recent = weighted.filter((entry) => Date.parse(now) - Date.parse(entry.item.occurredAt) <= 14 * 86_400_000);
  const previous = weighted.filter((entry) => { const age = Date.parse(now) - Date.parse(entry.item.occurredAt); return age > 14 * 86_400_000 && age <= 28 * 86_400_000; });
  const recentAverage = average(recent.map((entry) => entry.item.value));
  const previousAverage = average(previous.map((entry) => entry.item.value));
  const trend = recentAverage === null || previousAverage === null ? "INSUFFICIENT_DATA" : recentAverage - previousAverage >= 5 ? "IMPROVING" : recentAverage - previousAverage <= -5 ? "DECLINING" : "STABLE";
  return state(dimension, score, confidence, items.length, status, trend);
}

function state(dimension: CommunicationSkillDimension, score: number | null, confidence: number, evidenceCount: number, status: CommunicationSkillDimensionState["status"], trend: CommunicationSkillDimensionState["trend"]): CommunicationSkillDimensionState { return { dimension, score, confidence, evidenceCount, status, trend, band: bandFor(score) }; }
function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; }
export function bandFor(score: number | null) { if (score === null) return "Not enough data"; if (score < 20) return "Foundation"; if (score < 40) return "Developing"; if (score < 60) return "Functional"; if (score < 75) return "Strong"; if (score < 90) return "Advanced"; return "Highly Natural"; }

export function buildCommunicationInsight(result: ReturnType<typeof scoreCommunicationSkills>) {
  if (!result.strongest || !result.weakest) return "Complete a few different Communication sessions to build a more reliable profile.";
  if (result.weakest.dimension === result.strongest.dimension) return `${communicationDimensionLabels[result.strongest.dimension]} is beginning to form a useful baseline.`;
  return `${communicationDimensionLabels[result.strongest.dimension]} is currently strongest. ${communicationDimensionLabels[result.weakest.dimension]} is the clearest next practice focus.`;
}

export function makeSnapshot(id: string, item: CommunicationSkillDimensionState, capturedAt: string): CommunicationSkillSnapshot { return { id, dimension: item.dimension, score: item.score, confidence: item.confidence, evidenceCount: item.evidenceCount, capturedAt }; }
