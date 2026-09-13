import type { CommunicationExplainAnalysis, CommunicationExplainPracticeType, CommunicationExplainTask, CommunicationDifficulty } from "@/types/communication";

type PromptSeed = { promptType: Exclude<CommunicationExplainPracticeType, "MIXED">; prompt: string };

export const explainPromptLibrary: readonly PromptSeed[] = [
  { promptType: "SITUATION", prompt: "Your internet stopped working during an important call. Explain what happened and what you need next." },
  { promptType: "SITUATION", prompt: "The wrong item arrived in your online order. Explain the problem to customer support." },
  { promptType: "IDEA", prompt: "Explain why you prefer quieter workplaces to someone who has never thought about it." },
  { promptType: "IDEA", prompt: "Explain what makes someone easy to communicate with." },
  { promptType: "STORY", prompt: "Tell me about a time you had to solve an unexpected problem quickly." },
  { promptType: "STORY", prompt: "Describe a memorable trip or day and what made it memorable." },
  { promptType: "OPINION", prompt: "Is being busy the same as being productive? Give your view and one example." },
  { promptType: "OPINION", prompt: "Do people rely too much on phones? Explain your position naturally." },
];

export function buildExplainTasks(type: CommunicationExplainPracticeType, difficulty: CommunicationDifficulty, count = 2): Omit<CommunicationExplainTask, "id" | "sessionId" | "createdAt">[] {
  const pool = type === "MIXED" ? explainPromptLibrary : explainPromptLibrary.filter((item) => item.promptType === type);
  const selected = (pool.length ? pool : explainPromptLibrary).slice(0, count);
  return selected.map((item, index) => ({ prompt: item.prompt, promptType: item.promptType, difficulty, sequence: index + 1 }));
}

export function analyzeExplanation(transcript: string, task: Pick<CommunicationExplainTask, "promptType">): CommunicationExplainAnalysis {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const evidenceCount = words.length > 0 ? 1 : 0;
  const enough = words.length >= 18;
  const hasConnector = /because|so|but|first|then|finally|for example|although|however/i.test(transcript);
  const score = words.length === 0 ? null : Math.min(100, 48 + Math.min(30, words.length) + (hasConnector ? 10 : 0));
  const metric = (value: number | null, observation: string): { value: number | null; confidence: number; evidenceCount: number; observation?: string } => ({ value, confidence: evidenceCount ? Math.min(0.82, 0.38 + (enough ? 0.3 : 0.08)) : 0, evidenceCount, observation });
  const strengths = words.length >= 10 ? ["You gave enough information for the listener to identify your main point."] : [];
  const improvements = !enough ? ["Add one reason, example, or result so the listener can follow the idea more easily."] : hasConnector ? [] : ["Use a simple connector such as because, then, or for example to make the explanation easier to follow."];
  const corrections = /silent one/i.test(transcript) ? [{ id: "quieter-place", original: "silent one", naturalVersion: "somewhere quieter", why: "Quiet or quieter is more natural for a workplace; silent usually means no sound at all." }] : [];
  return { clarity: metric(score, "Can another person follow the main idea?"), structure: metric(score === null ? null : Math.max(0, score - (hasConnector ? 0 : 8)), task.promptType === "STORY" ? "Stories benefit from clear sequence and outcome." : "A clear reason or result strengthens the flow."), wordChoice: metric(corrections.length ? Math.max(0, (score ?? 0) - 12) : score, corrections.length ? "One phrase could sound more natural in everyday conversation." : "No high-value word-choice issue was detected."), naturalness: metric(score, "This is a provisional spoken-English observation."), detail: metric(enough ? score : score === null ? null : Math.max(0, score - 15), "The response should contain enough detail without becoming an essay."), fluency: metric(score, "Transcript-only fluency hook; pauses and pronunciation are not measured yet."), strengths, improvements, corrections, phraseCandidates: [], retryRecommended: corrections.length > 0 || !enough, evidence: words.length ? [`${words.length} words submitted`, `${task.promptType.toLowerCase()} explanation`] : ["No response submitted" ] };
}
