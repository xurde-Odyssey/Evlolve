import type { CommunicationDifficulty } from "@/types/communication";
import type { CommunicationModule } from "./session";

export type CommunicationLearningContext = {
  weakestDimension?: string;
  recentStrengths?: readonly string[];
  recentPhraseIds?: readonly string[];
  duePhraseCount?: number;
  recentModules?: readonly CommunicationModule[];
};

export const communicationBehaviorPrompt = [
  "Speak naturally and briefly in international conversational English.",
  "Respond to what the user actually said and keep the interaction moving.",
  "Do not lecture, over-correct, praise every response, or turn practice into a grammar test.",
  "Prefer clarity, context, natural word choice, and useful real-world language.",
].join(" ");

export function buildCommunicationPrompt(input: { module: CommunicationModule; difficulty: CommunicationDifficulty; context?: CommunicationLearningContext }) {
  const context = input.context;
  const focus = context?.weakestDimension ? ` Current focus: ${context.weakestDimension}.` : "";
  const phrases = context?.duePhraseCount ? ` There are ${context.duePhraseCount} phrases due for review; use one only when natural.` : "";
  return `${communicationBehaviorPrompt} Module: ${input.module}. Difficulty: ${input.difficulty}.${focus}${phrases}`;
}

export function trimConversationContext<T extends { role: string; content: string }>(messages: readonly T[], maxMessages = 24, maxCharacters = 24_000) {
  const recent = messages.slice(-maxMessages);
  let total = 0;
  const selected: T[] = [];
  for (const message of [...recent].reverse()) {
    if (total + message.content.length > maxCharacters && selected.length > 1) break;
    selected.unshift(message);
    total += message.content.length;
  }
  return selected;
}
