import type {
  CommunicationDifficulty,
  CommunicationMessage,
  CommunicationMessageInputSource,
  CommunicationPhraseCandidate,
  CommunicationSessionSetup,
  CommunicationSessionReview,
  CommunicationSkillDimension,
} from "@/types/communication";

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
  return new MockConversationProvider();
}

export function getSpeechToTextProvider(): SpeechToTextProvider {
  return new MockSpeechToTextProvider();
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

export function getProviderName() {
  return "development mock";
}

export function phraseCandidatesFor(messages: readonly CommunicationMessage[]): CommunicationPhraseCandidate[] {
  const content = messages.map((message) => message.content.toLowerCase()).join(" ");
  const candidates: CommunicationPhraseCandidate[] = [];
  if (content.includes("fair enough")) candidates.push({ id: "fair-enough", phrase: "fair enough", meaning: "Used to acknowledge that another person's point is reasonable.", example: "Fair enough. I can see why you prefer quieter places.", eventTypes: ["EXPOSED", "USED_UNPROMPTED"] });
  if (content.includes("that makes sense")) candidates.push({ id: "that-makes-sense", phrase: "that makes sense", meaning: "A natural way to show that you understand an explanation.", example: "That makes sense. I had not considered the timing.", eventTypes: ["EXPOSED", "USED_UNPROMPTED"] });
  return candidates;
}
