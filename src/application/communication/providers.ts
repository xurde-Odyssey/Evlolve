import "server-only";

import type {
  CommunicationDifficulty,
  CommunicationMessage,
  CommunicationMessageInputSource,
  CommunicationPhraseCandidate,
  CommunicationSessionSetup,
  CommunicationSessionReview,
  CommunicationSkillDimension,
} from "@/types/communication";
import { getCommunicationProviderConfig, requireGroqKey } from "./config";
import { buildCommunicationPrompt, trimConversationContext } from "./prompts";

export type ConversationProviderInput = {
  setup: CommunicationSessionSetup;
  messages: readonly CommunicationMessage[];
};

export type ConversationProvider = {
  respond(input: ConversationProviderInput): Promise<string>;
  analyze(input: ConversationProviderInput): Promise<CommunicationSessionReview["skillObservations"]>;
};

export type SpeechToTextProvider = {
  transcribe(input: { audio: Blob; language: string }): Promise<string>;
};

export function getConversationProvider(): ConversationProvider {
  const config = getCommunicationProviderConfig();
  if (config.llmProvider === "groq" && process.env.GROQ_API_KEY) {
    const primary = new GroqConversationProvider(config.chatModel, config.analysisModel);
    return config.fallbackEnabled ? withConversationFallback(primary, new MockConversationProvider()) : primary;
  }
  return new MockConversationProvider();
}

export function getSpeechToTextProvider(): SpeechToTextProvider {
  const config = getCommunicationProviderConfig();
  if (config.speechProvider === "groq" && process.env.GROQ_API_KEY) {
    const primary = new GroqSpeechToTextProvider(config.speechModel);
    return config.fallbackEnabled ? withSpeechFallback(primary, new MockSpeechToTextProvider()) : primary;
  }
  return new MockSpeechToTextProvider();
}

export function getProviderName() {
  const config = getCommunicationProviderConfig();
  return `${config.llmProvider} / ${config.speechProvider}`;
}

class MockConversationProvider implements ConversationProvider {
  async respond({ messages, setup }: ConversationProviderInput) {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "USER");
    if (!lastUserMessage) return openingFor(setup.conversationStyle);

    const text = lastUserMessage.content.toLowerCase();
    if (text.includes("fair enough") || text.includes("what does")) {
      return "It means you understand or accept someone's point, even if you do not completely agree. What is a situation where you might say it?";
    }
    if (lastUserMessage.content.trim().split(/\s+/).length < 5) {
      return `Fair enough. What makes you feel that way about ${lastUserMessage.content.trim() || "it"}?`;
    }
    return followUpFor(setup.difficulty, lastUserMessage.content);
  }

  async analyze({ messages }: ConversationProviderInput) {
    const userMessages = messages.filter((message) => message.role === "USER");
    const words = userMessages.reduce((total, message) => total + message.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const evidenceCount = userMessages.length;
    const base = evidenceCount === 0 ? null : Math.min(100, 55 + Math.min(35, evidenceCount * 7) + (words > evidenceCount * 12 ? 5 : 0));
    return dimensionObservations(base, evidenceCount);
  }
}

class MockSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(input: { audio: Blob; language: string }): Promise<string> {
    void input;
    throw new Error("Speech transcription is not configured. Continue in text mode or use browser voice input.");
  }
}

class GroqConversationProvider implements ConversationProvider {
  constructor(private readonly chatModel: string, private readonly analysisModel: string) {}

  async respond(input: ConversationProviderInput) {
    const result = await this.request(this.chatModel, [
      { role: "system", content: buildCommunicationPrompt({ module: "DAILY_CONVERSATION", difficulty: input.setup.difficulty }) },
      ...trimConversationContext(input.messages).map((message) => ({ role: message.role === "USER" ? "user" : "assistant", content: message.content })),
    ]);
    return result.trim();
  }

  async analyze(input: ConversationProviderInput) {
    const result = await this.request(this.analysisModel, [
      { role: "system", content: `${buildCommunicationPrompt({ module: "DAILY_CONVERSATION", difficulty: input.setup.difficulty })} Return JSON only with skill observations for conversationFlow, understanding, wordChoice, explanationClarity, fluency, phraseUsage. Each value must have score, confidence, evidenceCount, and optional observation.` },
      { role: "user", content: JSON.stringify(trimConversationContext(input.messages)) },
    ], true);
    const parsed = safeObservationJson(result);
    if (!parsed) throw new Error("Communication analysis returned invalid structured output.");
    return parsed;
  }

  private async request(model: string, messages: readonly { role: string; content: string }[], json = false) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${requireGroqKey()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 500, ...(json ? { response_format: { type: "json_object" } } : {}) }),
    });
    if (!response.ok) throw new Error(`Communication provider returned ${response.status}.`);
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Communication provider returned an empty response.");
    return content;
  }
}

class GroqSpeechToTextProvider implements SpeechToTextProvider {
  constructor(private readonly model: string) {}

  async transcribe(input: { audio: Blob; language: string }) {
    const form = new FormData();
    form.append("file", input.audio, "communication-audio.webm");
    form.append("model", this.model);
    form.append("language", input.language);
    form.append("response_format", "json");
    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${requireGroqKey()}` },
      body: form,
    });
    if (!response.ok) throw new Error(`Speech provider returned ${response.status}.`);
    const payload = await response.json() as { text?: string };
    if (!payload.text?.trim()) throw new Error("Speech provider returned an empty transcript.");
    return payload.text.trim();
  }
}

function withConversationFallback(primary: ConversationProvider, fallback: ConversationProvider): ConversationProvider {
  return {
    async respond(input) { try { return await primary.respond(input); } catch { return fallback.respond(input); } },
    async analyze(input) { try { return await primary.analyze(input); } catch { return fallback.analyze(input); } },
  };
}

function withSpeechFallback(primary: SpeechToTextProvider, fallback: SpeechToTextProvider): SpeechToTextProvider {
  return { async transcribe(input) { try { return await primary.transcribe(input); } catch { return fallback.transcribe(input); } } };
}

function safeObservationJson(value: string): CommunicationSessionReview["skillObservations"] | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const dimensions: CommunicationSkillDimension[] = ["conversationFlow", "understanding", "wordChoice", "explanationClarity", "fluency", "phraseUsage"];
    const result = {} as CommunicationSessionReview["skillObservations"];
    for (const dimension of dimensions) {
      const item = parsed[dimension];
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const score = record.score === null ? null : Number(record.score);
      const confidence = Number(record.confidence);
      const evidenceCount = Number(record.evidenceCount);
      if ((score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || !Number.isInteger(evidenceCount) || evidenceCount < 0) return null;
      result[dimension] = { score, confidence, evidenceCount, observation: typeof record.observation === "string" ? record.observation : undefined };
    }
    return result;
  } catch {
    return null;
  }
}

function openingFor(style: CommunicationSessionSetup["conversationStyle"]) {
  if (style === "SOCIAL") return "How has your day been so far? Has anything interesting happened?";
  if (style === "IDEAS_OPINIONS") return "What is something you have been thinking about lately?";
  if (style === "EVERYDAY") return "What is something you enjoy doing when you are not working?";
  return "How has your day been so far? What has been taking up most of your time?";
}

function followUpFor(difficulty: CommunicationDifficulty, content: string) {
  const prompt = difficulty === "EASY"
    ? "Could you tell me one more detail about that?"
    : difficulty === "CHALLENGING"
      ? "That is interesting. What is the strongest reason behind your view, and has it changed over time?"
      : "That makes sense. What is one example that comes to mind?";
  return `${prompt} I am curious about your experience with ${content.split(/\s+/).slice(0, 4).join(" ")}.`;
}

function dimensionObservations(score: number | null, evidenceCount: number): Record<CommunicationSkillDimension, { score: number | null; confidence: number; evidenceCount: number; observation?: string }> {
  const confidence = evidenceCount === 0 ? 0 : Math.min(0.9, 0.35 + evidenceCount * 0.1);
  const observation = score === null ? undefined : "Provisional observation from this session; more conversation evidence will make it more reliable.";
  return {
    conversationFlow: { score, confidence, evidenceCount, observation },
    understanding: { score, confidence, evidenceCount, observation },
    wordChoice: { score: score === null ? null : Math.max(0, score - 5), confidence, evidenceCount, observation },
    explanationClarity: { score, confidence, evidenceCount, observation },
    fluency: { score, confidence, evidenceCount, observation },
    phraseUsage: { score: score === null ? null : Math.max(0, score - 8), confidence, evidenceCount, observation },
  };
}

export function inputSourceForVoice(): CommunicationMessageInputSource {
  return "VOICE_TRANSCRIPT";
}

export function phraseCandidatesFor(messages: readonly CommunicationMessage[]): CommunicationPhraseCandidate[] {
  const content = messages.map((message) => message.content.toLowerCase()).join(" ");
  const candidates: CommunicationPhraseCandidate[] = [];
  if (content.includes("fair enough")) candidates.push({ id: "fair-enough", phrase: "fair enough", meaning: "Used to acknowledge that another person's point is reasonable.", example: "Fair enough. I can see why you prefer quieter places.", eventTypes: ["EXPOSED", "USED_UNPROMPTED"] });
  if (content.includes("that makes sense")) candidates.push({ id: "that-makes-sense", phrase: "that makes sense", meaning: "A natural way to show that you understand an explanation.", example: "That makes sense. I had not considered the timing.", eventTypes: ["EXPOSED", "USED_UNPROMPTED"] });
  return candidates;
}
