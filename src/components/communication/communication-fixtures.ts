import type {
  CommunicationPhrase,
  CommunicationPracticeModule,
  CommunicationSessionSummary,
  CommunicationSkillProgress,
  CommunicationSummary,
} from "@/types/communication";

export const communicationSummary: CommunicationSummary = {
  communicationXp: 0,
  currentStreak: 0,
  sessionsThisWeek: 0,
};

export const communicationWeakness = {
  label: "Word Choice",
  description: "You sometimes understand the idea but need a more natural phrase quickly.",
};

export const phraseToRevisit: CommunicationPhrase = {
  id: "phrase-fair-enough",
  phrase: "fair enough",
  meaning: "Used to acknowledge that another person's opinion or explanation is reasonable.",
  example: "Fair enough. I can see why you chose that approach.",
  status: "LEARNING",
  lastPracticed: "Not practiced yet",
};

export const communicationModules: CommunicationPracticeModule[] = [
  {
    id: "conversation",
    title: "Daily Conversation",
    description: "Build natural back-and-forth communication through realistic situations.",
    support: "Voice + text - Feedback after the conversation",
    actionLabel: "Start Conversation",
  },
  {
    id: "explain",
    title: "Explain Better",
    description: "Practice explaining situations, ideas, opinions, stories, and problems clearly.",
    support: "Structure - Clarity - Confidence",
    actionLabel: "Practice Explaining",
  },
  {
    id: "meaning",
    title: "Understand Meaning",
    description: "Train your ear for natural phrases, implied meaning, idioms, and conversational language.",
    support: "Expressions - Context - Meaning",
    actionLabel: "Start Practice",
  },
  {
    id: "phrase-practice",
    title: "Phrase Practice",
    description: "Recall useful expressions and use them naturally in context.",
    support: "Recall - Context - Natural usage",
    actionLabel: "Practice Phrases",
  },
];

export const communicationPhrases: CommunicationPhrase[] = [
  phraseToRevisit,
  {
    id: "phrase-that-makes-sense",
    phrase: "that makes sense",
    meaning: "A natural way to show that an explanation is clear and logical.",
    example: "That makes sense. I had not looked at it that way.",
    status: "NEW",
    lastPracticed: "Not practiced yet",
  },
  {
    id: "phrase-on-the-other-hand",
    phrase: "on the other hand",
    meaning: "Used to introduce a contrasting idea or consideration.",
    example: "The role is demanding. On the other hand, it offers useful experience.",
    status: "PRACTICING",
    lastPracticed: "Not practiced yet",
  },
];

export const communicationProgress: CommunicationSkillProgress[] = [
  { dimension: "conversationFlow", label: "Conversation Flow", value: null, description: "How naturally ideas connect across a conversation." },
  { dimension: "understanding", label: "Understanding", value: null, description: "How well meaning is understood in context." },
  { dimension: "wordChoice", label: "Word Choice", value: null, description: "How quickly natural words and phrases come to mind." },
  { dimension: "explanationClarity", label: "Explanation Clarity", value: null, description: "How clearly situations, opinions, and ideas are explained." },
  { dimension: "fluency", label: "Fluency", value: null, description: "How smoothly communication continues without unnecessary pauses." },
  { dimension: "phraseUsage", label: "Phrase Usage", value: null, description: "How naturally useful expressions are used in context." },
];

export const communicationSessions: CommunicationSessionSummary[] = [];
