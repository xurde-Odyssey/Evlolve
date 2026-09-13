import "server-only";

export type CommunicationProviderName = "mock" | "groq";

export type CommunicationProviderConfig = {
  llmProvider: CommunicationProviderName;
  chatModel: string;
  analysisModel: string;
  speechProvider: CommunicationProviderName;
  speechModel: string;
  fallbackEnabled: boolean;
  audioMaxMb: number;
  audioMaxSeconds: number;
};

function provider(value: string | undefined): CommunicationProviderName {
  return value === "groq" ? "groq" : "mock";
}

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getCommunicationProviderConfig(): CommunicationProviderConfig {
  return {
    llmProvider: provider(process.env.COMMUNICATION_LLM_PROVIDER),
    chatModel: process.env.COMMUNICATION_CHAT_MODEL || "llama-3.1-8b-instant",
    analysisModel: process.env.COMMUNICATION_ANALYSIS_MODEL || process.env.COMMUNICATION_CHAT_MODEL || "llama-3.1-8b-instant",
    speechProvider: provider(process.env.SPEECH_TO_TEXT_PROVIDER),
    speechModel: process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo",
    fallbackEnabled: process.env.COMMUNICATION_PROVIDER_FALLBACK_ENABLED === "true",
    audioMaxMb: positiveNumber(process.env.COMMUNICATION_AUDIO_MAX_MB, 10),
    audioMaxSeconds: positiveNumber(process.env.COMMUNICATION_AUDIO_MAX_SECONDS, 120),
  };
}

export function requireGroqKey() {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not configured.");
  return key;
}
