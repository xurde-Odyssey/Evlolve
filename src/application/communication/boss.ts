import type { BossChallenge } from "@/types/boss";
import type { CommunicationProgressData } from "@/types/communication";

export function getCommunicationBossCandidate(data: CommunicationProgressData): BossChallenge | null {
  const evidenceCount = data.dimensions.reduce((total, item) => total + item.evidenceCount, 0);
  if (evidenceCount < 12 || !data.weakest || data.weakest.confidence < 0.52) return null;
  const focus = data.weakest;
  return {
    id: "communication-integrated-conversation",
    title: "Integrated Communication Practice",
    description: "Complete an eight-minute conversation, explain one idea clearly, and use two useful expressions naturally.",
    activityKey: "communication",
    activityLabel: "Communication",
    evaluationType: "consistency",
    measurement: { type: "duration", target: 8, unit: "minutes" },
    currentProgress: 0,
    status: "offered",
    generatedReason: `Built from established Communication evidence. Current focus: ${focus.dimension}.`,
    evidence: [
      { label: "Primary focus", value: focus.dimension },
      { label: "Evidence", value: `${evidenceCount} Communication evidence items` },
      { label: "Requirement", value: "Limited assistance and natural usage" },
    ],
  };
}
