export type CommunicationSkillDimension =
  | "conversationFlow"
  | "understanding"
  | "wordChoice"
  | "explanationClarity"
  | "fluency"
  | "phraseUsage";

export type CommunicationPhraseStatus = "NEW" | "LEARNING" | "PRACTICING" | "MASTERED";
export type CommunicationPhraseSourceType = "CONVERSATION" | "MANUAL" | "EXPLAIN_BETTER" | "UNDERSTAND_MEANING" | "AI_RECOMMENDED" | "BOSS_CHALLENGE";

export type CommunicationSummary = {
  communicationXp: number;
  currentStreak: number;
  sessionsThisWeek: number;
};

export type CommunicationPhrase = {
  id: string;
  userId?: string;
  phrase: string;
  normalizedPhrase?: string;
  meaning: string;
  shortMeaning?: string;
  example: string;
  contextNote?: string;
  status: CommunicationPhraseStatus;
  sourceType?: CommunicationPhraseSourceType;
  sourceSessionId?: string;
  createdAt?: string;
  updatedAt?: string;
  lastPracticed?: string;
  lastPracticedAt?: string;
  nextReviewAt?: string;
  masteredAt?: string;
  isArchived?: boolean;
  personalNote?: string;
  tags?: string[];
};

export type CommunicationPracticeModule = {
  id: "conversation" | "explain" | "meaning";
  title: string;
  description: string;
  support: string;
  actionLabel: string;
};

export type CommunicationSessionSummary = {
  id: string;
  moduleId: CommunicationPracticeModule["id"];
  label: string;
  completedAt: string;
  durationMinutes: number;
};

export type CommunicationInputMode = "VOICE_TEXT" | "TEXT_ONLY";
export type CommunicationDifficulty = "ADAPTIVE" | "EASY" | "NORMAL" | "CHALLENGING";
export type CommunicationStyle = "EVERYDAY" | "SOCIAL" | "IDEAS_OPINIONS" | "MIXED";
export type CommunicationSessionStatus =
  | "SETUP"
  | "ACTIVE"
  | "ANALYZING"
  | "COMPLETED"
  | "INCOMPLETE"
  | "ERROR";
export type CommunicationMessageRole = "SYSTEM" | "USER" | "ASSISTANT";
export type CommunicationMessageInputSource = "TEXT" | "VOICE_TRANSCRIPT" | "SYSTEM";

export type CommunicationSessionSetup = {
  targetDurationMinutes: 5 | 10 | 15 | 20;
  inputMode: CommunicationInputMode;
  difficulty: CommunicationDifficulty;
  conversationStyle: CommunicationStyle;
};

export type CommunicationMessage = {
  id: string;
  sessionId: string;
  role: CommunicationMessageRole;
  content: string;
  inputSource: CommunicationMessageInputSource;
  timestamp: string;
};

export type CommunicationSkillObservation = {
  score: number | null;
  confidence: number;
  evidenceCount: number;
  observation?: string;
};

export type CommunicationEvidenceSourceModule = "DAILY_CONVERSATION" | "PHRASE_BANK" | "EXPLAIN_BETTER" | "UNDERSTAND_MEANING" | "BOSS_CHALLENGE" | "LISTENING" | "PRONUNCIATION";
export type CommunicationEvidenceType = "CONTEXTUAL_INFERENCE" | "NATURAL_WORD_CHOICE" | "STRUCTURED_EXPLANATION" | "CONVERSATION_TURN" | "PHRASE_RECOGNITION" | "PHRASE_USAGE" | "SELF_REPAIR" | "SESSION_OBSERVATION";
export type CommunicationAssistanceLevel = "NONE" | "LIGHT_HINT" | "STRONG_HINT" | "MODEL_EXAMPLE" | "DIRECT_PROMPT";
export type CommunicationSkillStatus = "INSUFFICIENT" | "EARLY" | "ESTABLISHED";
export type CommunicationSkillTrend = "IMPROVING" | "STABLE" | "DECLINING" | "INSUFFICIENT_DATA";

export type CommunicationSkillEvidence = {
  id: string;
  userId?: string;
  sessionId?: string;
  sourceModule: CommunicationEvidenceSourceModule;
  dimension: CommunicationSkillDimension;
  value: number;
  confidence: number;
  difficulty: CommunicationDifficulty;
  evidenceType: CommunicationEvidenceType;
  assistanceLevel: CommunicationAssistanceLevel;
  occurredAt: string;
  evidenceKey?: string;
  metadata?: Record<string, unknown>;
};

export type CommunicationSkillDimensionState = {
  dimension: CommunicationSkillDimension;
  score: number | null;
  confidence: number;
  evidenceCount: number;
  status: CommunicationSkillStatus;
  trend: CommunicationSkillTrend;
  band: string;
};

export type CommunicationSkillSnapshot = {
  id: string;
  dimension: CommunicationSkillDimension;
  score: number | null;
  confidence: number;
  evidenceCount: number;
  capturedAt: string;
};

export type CommunicationProgressData = {
  dimensions: CommunicationSkillDimensionState[];
  overallScore: number | null;
  overallBand: string;
  strongest?: CommunicationSkillDimensionState;
  weakest?: CommunicationSkillDimensionState;
  history: CommunicationSkillSnapshot[];
  summary: { sessionsThisWeek: number; practiceMinutes: number; phrasesMastered: number; duePhrases: number };
  insight: string;
};

export type CommunicationRecommendation = {
  module: "DAILY_CONVERSATION" | "EXPLAIN_BETTER" | "UNDERSTAND_MEANING" | "PHRASE_BANK";
  title: string;
  href: string;
  reason: string;
  dimension?: CommunicationSkillDimension;
};

export type CommunicationPhraseEventType =
  | "EXPOSED"
  | "UNDERSTOOD"
  | "REQUESTED_HELP"
  | "USED_WITH_PROMPT"
  | "USED_UNPROMPTED"
  | "USED_CORRECTLY"
  | "RECOGNIZED"
  | "RECALLED"
  | "USED_INCORRECTLY"
  | "REVIEW_PASSED"
  | "REVIEW_FAILED";

export type CommunicationPracticeActivityType = "MEANING_RECOGNITION" | "CONTEXT_RECOGNITION" | "RECALL" | "NATURAL_USAGE" | "CONVERSATION_USAGE";
export type CommunicationPracticeResult = "PASS" | "PARTIAL" | "FAIL";
export type CommunicationExplainPracticeType = "MIXED" | "SITUATION" | "IDEA" | "STORY" | "OPINION";
export type CommunicationExplainInputMode = CommunicationInputMode;
export type CommunicationExplainSessionStatus = "ACTIVE" | "COMPLETED" | "INCOMPLETE" | "ERROR";

export type CommunicationExplainSession = {
  id: string;
  userId?: string;
  practiceType: CommunicationExplainPracticeType;
  difficulty: CommunicationDifficulty;
  inputMode: CommunicationExplainInputMode;
  startedAt: string;
  endedAt?: string;
  status: CommunicationExplainSessionStatus;
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
};

export type CommunicationExplainTask = {
  id: string;
  sessionId: string;
  prompt: string;
  promptType: Exclude<CommunicationExplainPracticeType, "MIXED">;
  difficulty: CommunicationDifficulty;
  sequence: number;
  createdAt: string;
};

export type CommunicationExplainMetric = {
  value: number | null;
  confidence: number;
  evidenceCount: number;
  observation?: string;
};

export type CommunicationExplainAnalysis = {
  clarity: CommunicationExplainMetric;
  structure: CommunicationExplainMetric;
  wordChoice: CommunicationExplainMetric;
  naturalness: CommunicationExplainMetric;
  detail: CommunicationExplainMetric;
  fluency: CommunicationExplainMetric;
  strengths: string[];
  improvements: string[];
  corrections: CommunicationCorrection[];
  phraseCandidates: CommunicationPhraseCandidate[];
  retryRecommended: boolean;
  evidence: string[];
};

export type CommunicationExplainAttempt = {
  id: string;
  taskId: string;
  userId?: string;
  transcript: string;
  inputSource: CommunicationMessageInputSource;
  attemptNumber: number;
  usedHints: string[];
  submittedAt: string;
  analysis?: CommunicationExplainAnalysis;
  createdAt: string;
};

export type CommunicationMeaningQuestionType = "WHAT_DOES_IT_MEAN" | "REALLY_SAYING" | "BEST_RESPONSE" | "SAME_MEANING" | "MINI_CONVERSATION";
export type CommunicationMeaningSessionStatus = "ACTIVE" | "COMPLETED" | "INCOMPLETE" | "ERROR";
export type CommunicationMeaningCorrectness = "CORRECT" | "PARTIAL" | "INCORRECT";
export type CommunicationMeaningRegionality = "INTERNATIONAL" | "AUSTRALIAN" | "AMERICAN" | "BRITISH";

export type CommunicationMeaningContent = {
  phrase?: string;
  context: string;
  prompt: string;
  options?: string[];
  correctAnswer: string;
  acceptedAnswers?: string[];
  explanation: string;
  shortMeaning: string;
  relatedPhrase?: string;
};

export type CommunicationMeaningSession = {
  id: string;
  userId?: string;
  difficulty: CommunicationDifficulty;
  inputMode: CommunicationInputMode;
  targetItemCount: number;
  startedAt: string;
  endedAt?: string;
  status: CommunicationMeaningSessionStatus;
  completedItemCount: number;
  createdAt: string;
};

export type CommunicationMeaningItem = {
  id: string;
  sessionId: string;
  phraseId?: string;
  questionType: CommunicationMeaningQuestionType;
  content: CommunicationMeaningContent;
  difficulty: CommunicationDifficulty;
  category: string;
  sequence: number;
  createdAt: string;
};

export type CommunicationMeaningAttempt = {
  id: string;
  itemId: string;
  userId?: string;
  response: string;
  responseMode: CommunicationMessageInputSource;
  correctness: CommunicationMeaningCorrectness;
  confidence?: "SURE" | "NOT_SURE";
  usedHint: boolean;
  timeTakenMs?: number;
  analysis?: { explanation: string; correctAnswer: string; shortMeaning: string; relatedPhrase?: string };
  createdAt: string;
};

export type CommunicationPhraseEvent = {
  id: string;
  phraseId: string;
  userId?: string;
  eventType: CommunicationPhraseEventType;
  sessionId?: string;
  occurredAt: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export type CommunicationPhrasePracticeSession = {
  id: string;
  phraseIds: string[];
  currentIndex: number;
  completed: boolean;
  createdAt: string;
};

export type CommunicationPhraseCandidate = {
  id: string;
  phrase: string;
  meaning: string;
  example: string;
  eventTypes: CommunicationPhraseEventType[];
};

export type CommunicationCorrection = {
  id: string;
  original: string;
  naturalVersion: string;
  why: string;
};

export type CommunicationSessionReview = {
  session: CommunicationSession;
  strengths: string[];
  improvements: string[];
  corrections: CommunicationCorrection[];
  phraseCandidates: CommunicationPhraseCandidate[];
  skillObservations: Record<CommunicationSkillDimension, CommunicationSkillObservation>;
};

export type CommunicationSession = {
  id: string;
  userId?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  targetDurationMinutes: number;
  inputMode: CommunicationInputMode;
  conversationStyle: CommunicationStyle;
  difficulty: CommunicationDifficulty;
  status: CommunicationSessionStatus;
  messageCount: number;
  summary?: string;
  skillObservations?: Record<CommunicationSkillDimension, CommunicationSkillObservation>;
  createdAt: string;
};

export type CommunicationSkillProgress = {
  dimension: CommunicationSkillDimension;
  label: string;
  value: number | null;
  description: string;
};
