import type { CommunicationProgressData, CommunicationRecommendation } from "@/types/communication";

export function recommendCommunicationPractice(data: Pick<CommunicationProgressData, "weakest" | "summary">): CommunicationRecommendation {
  const focus = data.weakest?.dimension;
  if (focus === "understanding") return { module: "UNDERSTAND_MEANING", title: "Understand Meaning", href: "/communication/practice/meaning", reason: "Train contextual meaning and conversational reactions.", dimension: focus };
  if (focus === "phraseUsage") return { module: "PHRASE_BANK", title: "Phrase Practice", href: "/communication/phrases/practice", reason: `${data.summary.duePhrases || "Some"} phrases are ready to revisit in context.`, dimension: focus };
  if (focus === "explanationClarity" || focus === "wordChoice") return { module: "EXPLAIN_BETTER", title: "Explain Better", href: "/communication/practice/explain", reason: "Practice making your ideas clearer and more natural.", dimension: focus };
  return { module: "DAILY_CONVERSATION", title: "Daily Conversation", href: "/communication/practice/conversation", reason: "Build natural back-and-forth and keep ideas moving.", dimension: focus };
}
