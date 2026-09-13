import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CommunicationPhrase,
  CommunicationPhraseEvent,
  CommunicationPhraseEventType,
  CommunicationPhrasePracticeSession,
  CommunicationPhraseSourceType,
  CommunicationPracticeActivityType,
  CommunicationPracticeResult,
  CommunicationMessage,
  CommunicationSession,
  CommunicationSessionReview,
  CommunicationSessionSetup,
  CommunicationExplainAnalysis,
  CommunicationExplainAttempt,
  CommunicationExplainPracticeType,
  CommunicationExplainSession,
  CommunicationExplainSessionStatus,
  CommunicationExplainTask,
  CommunicationDifficulty,
  CommunicationExplainInputMode,
  CommunicationMeaningAttempt,
  CommunicationMeaningContent,
  CommunicationMeaningCorrectness,
  CommunicationMeaningItem,
  CommunicationMeaningQuestionType,
  CommunicationMeaningSession,
  CommunicationMeaningSessionStatus,
  CommunicationMessageInputSource,
  CommunicationSkillEvidence,
  CommunicationSkillSnapshot,
  CommunicationSkillDimensionState,
} from "@/types/communication";
import { evaluatePhraseMastery, eventForPractice, normalizePhrase } from "./mastery";

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_seconds: number;
  target_duration_minutes: number;
  input_mode: CommunicationSession["inputMode"];
  conversation_style: CommunicationSession["conversationStyle"];
  difficulty: CommunicationSession["difficulty"];
  status: CommunicationSession["status"];
  message_count: number;
  summary: unknown;
  skill_observations: unknown;
  review: unknown;
  created_at: string;
};
type MessageRow = CommunicationMessage & { user_id: string; session_id: string; input_source: CommunicationMessage["inputSource"]; timestamp: string };
type PhraseRow = { id: string; user_id: string; phrase: string; normalized_phrase: string; meaning: string; short_meaning: string; example: string; context_note: string | null; personal_note: string | null; status: CommunicationPhrase["status"]; source_type: CommunicationPhraseSourceType; source_session_id: string | null; created_at: string; updated_at: string; last_practiced_at: string | null; next_review_at: string | null; mastered_at: string | null; is_archived: boolean; tags: unknown };
type PhraseEventRow = { id: string; user_id: string; phrase_id: string; event_type: CommunicationPhraseEventType; session_id: string | null; occurred_at: string; confidence: number | null; metadata: unknown };
type ExplainSessionRow = { id: string; user_id: string; practice_type: CommunicationExplainPracticeType; difficulty: CommunicationDifficulty; input_mode: CommunicationExplainInputMode; started_at: string; ended_at: string | null; status: CommunicationExplainSessionStatus; task_count: number; completed_task_count: number; created_at: string };
type ExplainTaskRow = { id: string; session_id: string; prompt: string; prompt_type: Exclude<CommunicationExplainPracticeType, "MIXED">; difficulty: CommunicationDifficulty; sequence: number; created_at: string };
type ExplainAttemptRow = { id: string; task_id: string; user_id: string; transcript: string; input_source: CommunicationMessage["inputSource"]; attempt_number: number; used_hints: unknown; submitted_at: string; analysis: unknown; created_at: string };
type MeaningSessionRow = { id: string; user_id: string; difficulty: CommunicationDifficulty; input_mode: CommunicationMeaningSession["inputMode"]; target_item_count: number; started_at: string; ended_at: string | null; status: CommunicationMeaningSessionStatus; completed_item_count: number; created_at: string };
type MeaningItemRow = { id: string; session_id: string; user_id: string; phrase_id: string | null; question_type: CommunicationMeaningQuestionType; content: unknown; difficulty: CommunicationDifficulty; category: string; sequence: number; created_at: string };
type MeaningAttemptRow = { id: string; item_id: string; user_id: string; response: string; response_mode: CommunicationMessageInputSource; correctness: CommunicationMeaningCorrectness; confidence: "SURE" | "NOT_SURE" | null; used_hint: boolean; time_taken_ms: number | null; analysis: unknown; created_at: string };
type SkillEvidenceRow = { id: string; user_id: string; session_id: string | null; source_module: CommunicationSkillEvidence["sourceModule"]; dimension: CommunicationSkillEvidence["dimension"]; value: number; confidence: number; difficulty: CommunicationDifficulty; evidence_type: CommunicationSkillEvidence["evidenceType"]; assistance_level: CommunicationSkillEvidence["assistanceLevel"]; evidence_key: string; metadata: unknown; occurred_at: string };
type SkillSnapshotRow = { id: string; user_id: string; dimension: CommunicationSkillSnapshot["dimension"]; score: number | null; confidence: number; evidence_count: number; captured_at: string };

export class CommunicationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createSession(userId: string, setup: CommunicationSessionSetup): Promise<CommunicationSession> {
    const now = new Date().toISOString();
    const session = {
      id: crypto.randomUUID(),
      user_id: userId,
      started_at: now,
      duration_seconds: 0,
      target_duration_minutes: setup.targetDurationMinutes,
      input_mode: setup.inputMode,
      conversation_style: setup.conversationStyle,
      difficulty: setup.difficulty,
      status: "ACTIVE" as const,
      message_count: 0,
      summary: null,
      skill_observations: {},
      created_at: now,
    };
    const response = await this.client.from("communication_sessions").insert(session).select("*").single();
    if (response.error) throw response.error;
    return mapSession(response.data as SessionRow);
  }

  async getSession(userId: string, sessionId: string) {
    const sessionResponse = await this.client.from("communication_sessions").select("*").eq("user_id", userId).eq("id", sessionId).single();
    if (sessionResponse.error) throw sessionResponse.error;
    const messagesResponse = await this.client.from("communication_messages").select("*").eq("user_id", userId).eq("session_id", sessionId).order("timestamp", { ascending: true });
    if (messagesResponse.error) throw messagesResponse.error;
    const session = mapSession(sessionResponse.data as SessionRow);
    const review = isRecord((sessionResponse.data as SessionRow).review) ? (sessionResponse.data as SessionRow).review : undefined;
    return { session, messages: (messagesResponse.data as MessageRow[]).map(mapMessage), review };
  }

  async appendMessage(userId: string, sessionId: string, message: Omit<CommunicationMessage, "id" | "sessionId" | "timestamp">) {
    const now = new Date().toISOString();
    const row = { id: crypto.randomUUID(), session_id: sessionId, user_id: userId, role: message.role, content: message.content, input_source: message.inputSource, timestamp: now };
    const insert = await this.client.from("communication_messages").insert(row).select("*").single();
    if (insert.error) throw insert.error;
    const update = await this.client.from("communication_sessions").update({ message_count: await this.countMessages(userId, sessionId) }).eq("id", sessionId).eq("user_id", userId);
    if (update.error) throw update.error;
    return mapMessage(insert.data as MessageRow);
  }

  async completeSession(userId: string, sessionId: string, review: CommunicationSessionReview) {
    const endedAt = new Date().toISOString();
    const update = await this.client.from("communication_sessions").update({ status: review.session.status, ended_at: endedAt, duration_seconds: Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(review.session.startedAt)) / 1000)), message_count: review.session.messageCount, summary: review.session.summary ?? null, skill_observations: review.skillObservations, review: { strengths: review.strengths, improvements: review.improvements, corrections: review.corrections, phraseCandidates: review.phraseCandidates, skillObservations: review.skillObservations } }).eq("id", sessionId).eq("user_id", userId).select("*").single();
    if (update.error) throw update.error;
    return mapSession(update.data as SessionRow);
  }

  async savePhraseEvent(userId: string, sessionId: string, phraseId: string, eventType: string) {
    return this.recordPhraseEvent(userId, phraseId, eventType as CommunicationPhraseEventType, sessionId);
  }

  async listPhrases(userId: string) {
    const response = await this.client.from("communication_phrases").select("*").eq("user_id", userId).eq("is_archived", false).order("created_at", { ascending: false });
    if (response.error) throw response.error;
    return (response.data as PhraseRow[]).map(mapPhrase);
  }

  async getPhrase(userId: string, phraseId: string) {
    const response = await this.client.from("communication_phrases").select("*").eq("user_id", userId).eq("id", phraseId).single();
    if (response.error) throw response.error;
    return mapPhrase(response.data as PhraseRow);
  }

  async createPhrase(userId: string, input: { phrase: string; meaning?: string; example?: string; personalNote?: string; sourceType?: CommunicationPhraseSourceType; sourceSessionId?: string }) {
    const phrase = input.phrase.trim();
    const normalizedPhrase = normalizePhrase(phrase);
    if (!normalizedPhrase) throw new Error("phrase is required");
    const existing = await this.client.from("communication_phrases").select("*").eq("user_id", userId).eq("normalized_phrase", normalizedPhrase).maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return { phrase: mapPhrase(existing.data as PhraseRow), created: false };
    const now = new Date().toISOString();
    const response = await this.client.from("communication_phrases").insert({ id: crypto.randomUUID(), user_id: userId, phrase, normalized_phrase: normalizedPhrase, meaning: input.meaning?.trim() ?? "", short_meaning: input.meaning?.trim() ?? "", example: input.example?.trim() ?? "", personal_note: input.personalNote?.trim() || null, status: "NEW", source_type: input.sourceType ?? "MANUAL", source_session_id: input.sourceSessionId ?? null, created_at: now, updated_at: now, next_review_at: new Date(Date.parse(now) + 86_400_000).toISOString(), is_archived: false, tags: [] }).select("*").single();
    if (response.error) throw response.error;
    return { phrase: mapPhrase(response.data as PhraseRow), created: true };
  }

  async updatePhrase(userId: string, phraseId: string, input: { meaning?: string; example?: string; personalNote?: string; isArchived?: boolean }) {
    const response = await this.client.from("communication_phrases").update({ ...(input.meaning !== undefined ? { meaning: input.meaning.trim(), short_meaning: input.meaning.trim() } : {}), ...(input.example !== undefined ? { example: input.example.trim() } : {}), ...(input.personalNote !== undefined ? { personal_note: input.personalNote.trim() || null } : {}), ...(input.isArchived !== undefined ? { is_archived: input.isArchived } : {}), updated_at: new Date().toISOString() }).eq("user_id", userId).eq("id", phraseId).select("*").single();
    if (response.error) throw response.error;
    return mapPhrase(response.data as PhraseRow);
  }

  async listDuePhrases(userId: string, limit = 5) {
    const now = new Date().toISOString();
    const response = await this.client.from("communication_phrases").select("*").eq("user_id", userId).eq("is_archived", false).lte("next_review_at", now).order("next_review_at", { ascending: true }).limit(limit);
    if (response.error) throw response.error;
    return (response.data as PhraseRow[]).map(mapPhrase);
  }

  async recordPhraseEvent(userId: string, phraseId: string, eventType: CommunicationPhraseEventType, sessionId?: string, metadata?: Record<string, unknown>) {
    const now = new Date().toISOString();
    const inserted = await this.client.from("communication_phrase_events").insert({ id: crypto.randomUUID(), user_id: userId, session_id: sessionId ?? null, phrase_id: phraseId, event_type: eventType, occurred_at: now, metadata: metadata ?? null, created_at: now }).select("*").single();
    if (inserted.error) throw inserted.error;
    const eventsResponse = await this.client.from("communication_phrase_events").select("*").eq("user_id", userId).eq("phrase_id", phraseId).order("occurred_at", { ascending: true });
    if (eventsResponse.error) throw eventsResponse.error;
    const phrase = await this.getPhrase(userId, phraseId);
    const decision = evaluatePhraseMastery(phrase, (eventsResponse.data as PhraseEventRow[]).map(mapPhraseEvent), now);
    const updated = await this.client.from("communication_phrases").update({ status: decision.status, next_review_at: decision.nextReviewAt, mastered_at: decision.masteredAt ?? null, last_practiced_at: now, updated_at: now }).eq("user_id", userId).eq("id", phraseId).select("*").single();
    if (updated.error) throw updated.error;
    return mapPhrase(updated.data as PhraseRow);
  }

  async startPractice(userId: string, limit: number) {
    const phrases = await this.listDuePhrases(userId, limit);
    const now = new Date().toISOString();
    const response = await this.client.from("communication_phrase_practice_sessions").insert({ id: crypto.randomUUID(), user_id: userId, phrase_ids: phrases.map((phrase) => phrase.id), current_index: 0, completed: phrases.length === 0, created_at: now }).select("*").single();
    if (response.error) throw response.error;
    return { session: mapPracticeSession(response.data as { id: string; phrase_ids: unknown; current_index: number; completed: boolean; created_at: string }), phrases };
  }

  async getPracticeSession(userId: string, practiceSessionId: string) {
    const response = await this.client.from("communication_phrase_practice_sessions").select("*").eq("user_id", userId).eq("id", practiceSessionId).single();
    if (response.error) throw response.error;
    const session = mapPracticeSession(response.data as { id: string; phrase_ids: unknown; current_index: number; completed: boolean; created_at: string });
    const phrases = await Promise.all(session.phraseIds.map((phraseId) => this.getPhrase(userId, phraseId)));
    return { session, phrases };
  }

  async answerPractice(userId: string, practiceSessionId: string, input: { phraseId: string; activityType: CommunicationPracticeActivityType; result: CommunicationPracticeResult; response?: string }) {
    const current = await this.getPracticeSession(userId, practiceSessionId);
    if (!current.session.phraseIds.includes(input.phraseId)) throw new Error("phrase is not in this practice session");
    const phrase = await this.recordPhraseEvent(userId, input.phraseId, eventForPractice(input.result, input.activityType), undefined, { activityType: input.activityType, result: input.result, response: input.response ?? "" });
    const nextIndex = Math.min(current.session.currentIndex + 1, current.session.phraseIds.length);
    const completed = nextIndex >= current.session.phraseIds.length;
    const update = await this.client.from("communication_phrase_practice_sessions").update({ current_index: nextIndex, completed }).eq("user_id", userId).eq("id", practiceSessionId).select("*").single();
    if (update.error) throw update.error;
    return { session: mapPracticeSession(update.data as { id: string; phrase_ids: unknown; current_index: number; completed: boolean; created_at: string }), phrase };
  }

  async completePractice(userId: string, practiceSessionId: string) {
    const response = await this.client.from("communication_phrase_practice_sessions").update({ completed: true }).eq("user_id", userId).eq("id", practiceSessionId).select("*").single();
    if (response.error) throw response.error;
    return mapPracticeSession(response.data as { id: string; phrase_ids: unknown; current_index: number; completed: boolean; created_at: string });
  }

  async createExplainSession(userId: string, input: { practiceType: CommunicationExplainPracticeType; difficulty: CommunicationDifficulty; inputMode: CommunicationExplainInputMode }, tasks: readonly Omit<CommunicationExplainTask, "id" | "sessionId" | "createdAt">[]) {
    const startedAt = new Date().toISOString();
    const sessionResponse = await this.client.from("communication_explain_sessions").insert({ id: crypto.randomUUID(), user_id: userId, practice_type: input.practiceType, difficulty: input.difficulty, input_mode: input.inputMode, started_at: startedAt, status: "ACTIVE", task_count: tasks.length, completed_task_count: 0, created_at: startedAt }).select("*").single();
    if (sessionResponse.error) throw sessionResponse.error;
    const session = mapExplainSession(sessionResponse.data as ExplainSessionRow);
    const rows = tasks.map((task) => ({ id: crypto.randomUUID(), session_id: session.id, user_id: userId, prompt: task.prompt, prompt_type: task.promptType, difficulty: task.difficulty, sequence: task.sequence, created_at: startedAt }));
    const taskResponse = rows.length ? await this.client.from("communication_explain_tasks").insert(rows).select("*") : { data: [], error: null };
    if (taskResponse.error) throw taskResponse.error;
    return { session, tasks: (taskResponse.data as ExplainTaskRow[]).map(mapExplainTask) };
  }

  async getExplainSession(userId: string, sessionId: string) {
    const sessionResponse = await this.client.from("communication_explain_sessions").select("*").eq("id", sessionId).eq("user_id", userId).single();
    if (sessionResponse.error) throw sessionResponse.error;
    const tasksResponse = await this.client.from("communication_explain_tasks").select("*").eq("session_id", sessionId).eq("user_id", userId).order("sequence", { ascending: true });
    if (tasksResponse.error) throw tasksResponse.error;
    const attemptsResponse = await this.client.from("communication_explain_attempts").select("*").eq("user_id", userId).in("task_id", (tasksResponse.data as ExplainTaskRow[]).map((task) => task.id)).order("attempt_number", { ascending: true });
    if (attemptsResponse.error) throw attemptsResponse.error;
    return { session: mapExplainSession(sessionResponse.data as ExplainSessionRow), tasks: (tasksResponse.data as ExplainTaskRow[]).map(mapExplainTask), attempts: (attemptsResponse.data as ExplainAttemptRow[]).map(mapExplainAttempt) };
  }

  async analyzeExplainAttempt(userId: string, taskId: string, input: { transcript: string; inputSource: CommunicationMessage["inputSource"]; usedHints: string[] }, analysis: CommunicationExplainAnalysis) {
    const taskResponse = await this.client.from("communication_explain_tasks").select("*").eq("id", taskId).eq("user_id", userId).single();
    if (taskResponse.error) throw taskResponse.error;
    const countResponse = await this.client.from("communication_explain_attempts").select("id", { count: "exact", head: true }).eq("task_id", taskId).eq("user_id", userId);
    if (countResponse.error) throw countResponse.error;
    const attemptNumber = (countResponse.count ?? 0) + 1;
    const now = new Date().toISOString();
    const response = await this.client.from("communication_explain_attempts").insert({ id: crypto.randomUUID(), task_id: taskId, user_id: userId, transcript: input.transcript.trim(), input_source: input.inputSource, attempt_number: attemptNumber, used_hints: input.usedHints, submitted_at: now, analysis, created_at: now }).select("*").single();
    if (response.error) throw response.error;
    return mapExplainAttempt(response.data as ExplainAttemptRow);
  }

  async getExplainTask(userId: string, taskId: string) {
    const response = await this.client.from("communication_explain_tasks").select("*").eq("id", taskId).eq("user_id", userId).single();
    if (response.error) throw response.error;
    return mapExplainTask(response.data as ExplainTaskRow);
  }

  async completeExplainSession(userId: string, sessionId: string) {
    const current = await this.getExplainSession(userId, sessionId);
    const completedTaskCount = new Set(current.attempts.map((attempt) => current.tasks.find((task) => task.id === attempt.taskId)?.id).filter(Boolean)).size;
    const response = await this.client.from("communication_explain_sessions").update({ status: completedTaskCount > 0 ? "COMPLETED" : "INCOMPLETE", ended_at: new Date().toISOString(), completed_task_count: completedTaskCount }).eq("id", sessionId).eq("user_id", userId).select("*").single();
    if (response.error) throw response.error;
    return mapExplainSession(response.data as ExplainSessionRow);
  }

  async createMeaningSession(userId: string, input: { difficulty: CommunicationDifficulty; inputMode: CommunicationMeaningSession["inputMode"]; targetItemCount: number }, items: readonly Omit<CommunicationMeaningItem, "id" | "sessionId" | "createdAt">[]) {
    const now = new Date().toISOString();
    const sessionResponse = await this.client.from("communication_meaning_sessions").insert({ id: crypto.randomUUID(), user_id: userId, difficulty: input.difficulty, input_mode: input.inputMode, target_item_count: input.targetItemCount, started_at: now, status: "ACTIVE", completed_item_count: 0, created_at: now }).select("*").single();
    if (sessionResponse.error) throw sessionResponse.error;
    const session = mapMeaningSession(sessionResponse.data as MeaningSessionRow);
    const rows = items.map((item) => ({ id: crypto.randomUUID(), session_id: session.id, user_id: userId, phrase_id: item.phraseId ?? null, question_type: item.questionType, content: item.content, difficulty: item.difficulty, category: item.category, sequence: item.sequence, created_at: now }));
    const itemResponse = rows.length ? await this.client.from("communication_meaning_items").insert(rows).select("*") : { data: [], error: null };
    if (itemResponse.error) throw itemResponse.error;
    return { session, items: (itemResponse.data as MeaningItemRow[]).map(mapMeaningItem) };
  }

  async getMeaningSession(userId: string, sessionId: string) {
    const sessionResponse = await this.client.from("communication_meaning_sessions").select("*").eq("id", sessionId).eq("user_id", userId).single();
    if (sessionResponse.error) throw sessionResponse.error;
    const itemsResponse = await this.client.from("communication_meaning_items").select("*").eq("session_id", sessionId).eq("user_id", userId).order("sequence", { ascending: true });
    if (itemsResponse.error) throw itemsResponse.error;
    const items = itemsResponse.data as MeaningItemRow[];
    const attemptsResponse = await this.client.from("communication_meaning_attempts").select("*").eq("user_id", userId).in("item_id", items.map((item) => item.id)).order("created_at", { ascending: true });
    if (attemptsResponse.error) throw attemptsResponse.error;
    return { session: mapMeaningSession(sessionResponse.data as MeaningSessionRow), items: items.map(mapMeaningItem), attempts: (attemptsResponse.data as MeaningAttemptRow[]).map(mapMeaningAttempt) };
  }

  async getMeaningItem(userId: string, itemId: string) {
    const response = await this.client.from("communication_meaning_items").select("*").eq("id", itemId).eq("user_id", userId).single();
    if (response.error) throw response.error;
    return mapMeaningItem(response.data as MeaningItemRow);
  }

  async answerMeaningItem(userId: string, itemId: string, input: { response: string; responseMode: CommunicationMessageInputSource; correctness: CommunicationMeaningCorrectness; confidence?: "SURE" | "NOT_SURE"; usedHint: boolean; timeTakenMs?: number }, analysis: CommunicationMeaningAttempt["analysis"]) {
    const item = await this.getMeaningItem(userId, itemId);
    const now = new Date().toISOString();
    const response = await this.client.from("communication_meaning_attempts").insert({ id: crypto.randomUUID(), item_id: itemId, user_id: userId, response: input.response.trim(), response_mode: input.responseMode, correctness: input.correctness, confidence: input.confidence ?? null, used_hint: input.usedHint, time_taken_ms: input.timeTakenMs ?? null, analysis: analysis ?? null, created_at: now }).select("*").single();
    if (response.error) throw response.error;
    if (item.phraseId) await this.recordPhraseEvent(userId, item.phraseId, input.correctness === "INCORRECT" ? "REVIEW_FAILED" : "REVIEW_PASSED", undefined, { module: "UNDERSTAND_MEANING", questionType: item.questionType, confidence: input.confidence ?? null, usedHint: input.usedHint });
    return mapMeaningAttempt(response.data as MeaningAttemptRow);
  }

  async completeMeaningSession(userId: string, sessionId: string) {
    const current = await this.getMeaningSession(userId, sessionId);
    const completedItemCount = new Set(current.attempts.map((attempt) => attempt.itemId)).size;
    const response = await this.client.from("communication_meaning_sessions").update({ status: completedItemCount > 0 ? "COMPLETED" : "INCOMPLETE", ended_at: new Date().toISOString(), completed_item_count: completedItemCount }).eq("id", sessionId).eq("user_id", userId).select("*").single();
    if (response.error) throw response.error;
    return mapMeaningSession(response.data as MeaningSessionRow);
  }

  async recordSkillEvidence(userId: string, evidence: Omit<CommunicationSkillEvidence, "id" | "userId">) {
    const response = await this.client.from("communication_skill_evidence").upsert({ id: crypto.randomUUID(), user_id: userId, session_id: evidence.sessionId ?? null, source_module: evidence.sourceModule, dimension: evidence.dimension, value: Math.max(0, Math.min(100, evidence.value)), confidence: Math.max(0, Math.min(1, evidence.confidence)), difficulty: evidence.difficulty, evidence_type: evidence.evidenceType, assistance_level: evidence.assistanceLevel, evidence_key: evidence.evidenceKey ?? crypto.randomUUID(), metadata: evidence.metadata ?? null, occurred_at: evidence.occurredAt }, { onConflict: "user_id,evidence_key,dimension", ignoreDuplicates: true }).select("*").maybeSingle();
    if (response.error) throw response.error;
    return response.data ? mapSkillEvidence(response.data as SkillEvidenceRow) : undefined;
  }

  async getCommunicationProgressInputs(userId: string) {
    const evidenceResponse = await this.client.from("communication_skill_evidence").select("*").eq("user_id", userId).order("occurred_at", { ascending: true });
    if (evidenceResponse.error) throw evidenceResponse.error;
    const snapshotsResponse = await this.client.from("communication_skill_snapshots").select("*").eq("user_id", userId).order("captured_at", { ascending: true }).limit(180);
    if (snapshotsResponse.error) throw snapshotsResponse.error;
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const sessionsResponse = await this.client.from("communication_sessions").select("id, duration_seconds").eq("user_id", userId).gte("created_at", since).eq("status", "COMPLETED");
    if (sessionsResponse.error) throw sessionsResponse.error;
    const phrasesResponse = await this.client.from("communication_phrases").select("status, next_review_at").eq("user_id", userId).eq("is_archived", false);
    if (phrasesResponse.error) throw phrasesResponse.error;
    const mastered = (phrasesResponse.data as Array<{ status: string }>).filter((phrase) => phrase.status === "MASTERED").length;
    const due = (phrasesResponse.data as Array<{ next_review_at: string | null }>).filter((phrase) => phrase.next_review_at && Date.parse(phrase.next_review_at) <= Date.now()).length;
    return { evidence: (evidenceResponse.data as SkillEvidenceRow[]).map(mapSkillEvidence), snapshots: (snapshotsResponse.data as SkillSnapshotRow[]).map(mapSkillSnapshot), summary: { sessionsThisWeek: sessionsResponse.data.length, practiceMinutes: Math.round((sessionsResponse.data as Array<{ duration_seconds: number }>).reduce((sum, session) => sum + session.duration_seconds, 0) / 60), phrasesMastered: mastered, duePhrases: due } };
  }

  async saveCommunicationProfile(userId: string, dimensions: readonly CommunicationSkillDimensionState[], overallScore: number | null, overallBand: string) {
    const response = await this.client.from("communication_skill_profiles").upsert({ user_id: userId, dimensions, overall_score: overallScore, overall_band: overallBand, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("*").single();
    if (response.error) throw response.error;
    return response.data;
  }

  async saveCommunicationSnapshots(userId: string, snapshots: readonly CommunicationSkillSnapshot[]) {
    if (!snapshots.length) return;
    const rows = snapshots.map((snapshot) => ({ id: crypto.randomUUID(), user_id: userId, dimension: snapshot.dimension, score: snapshot.score, confidence: snapshot.confidence, evidence_count: snapshot.evidenceCount, captured_at: snapshot.capturedAt }));
    const response = await this.client.from("communication_skill_snapshots").insert(rows);
    if (response.error) throw response.error;
  }

  private async countMessages(userId: string, sessionId: string) {
    const response = await this.client.from("communication_messages").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("session_id", sessionId);
    if (response.error) throw response.error;
    return response.count ?? 0;
  }
}

function mapSession(row: SessionRow): CommunicationSession {
  return { id: row.id, userId: row.user_id, startedAt: row.started_at, endedAt: row.ended_at ?? undefined, durationSeconds: row.duration_seconds, targetDurationMinutes: row.target_duration_minutes, inputMode: row.input_mode, conversationStyle: row.conversation_style, difficulty: row.difficulty, status: row.status, messageCount: row.message_count, summary: typeof row.summary === "string" ? row.summary : undefined, skillObservations: isRecord(row.skill_observations) ? row.skill_observations as CommunicationSession["skillObservations"] : undefined, createdAt: row.created_at };
}

function mapMessage(row: MessageRow): CommunicationMessage {
  return { id: row.id, sessionId: row.session_id, role: row.role, content: row.content, inputSource: row.input_source, timestamp: row.timestamp };
}

function mapPhrase(row: PhraseRow): CommunicationPhrase {
  return { id: row.id, userId: row.user_id, phrase: row.phrase, normalizedPhrase: row.normalized_phrase, meaning: row.meaning, shortMeaning: row.short_meaning, example: row.example, contextNote: row.context_note ?? undefined, personalNote: row.personal_note ?? undefined, status: row.status, sourceType: row.source_type, sourceSessionId: row.source_session_id ?? undefined, createdAt: row.created_at, updatedAt: row.updated_at, lastPracticedAt: row.last_practiced_at ?? undefined, lastPracticed: row.last_practiced_at ?? "Not practiced yet", nextReviewAt: row.next_review_at ?? undefined, masteredAt: row.mastered_at ?? undefined, isArchived: row.is_archived, tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [] };
}

function mapPhraseEvent(row: PhraseEventRow): CommunicationPhraseEvent {
  return { id: row.id, userId: row.user_id, phraseId: row.phrase_id, eventType: row.event_type, sessionId: row.session_id ?? undefined, occurredAt: row.occurred_at, confidence: row.confidence ?? undefined, metadata: isRecord(row.metadata) ? row.metadata : undefined };
}

function mapPracticeSession(row: { id: string; phrase_ids: unknown; current_index: number; completed: boolean; created_at: string }): CommunicationPhrasePracticeSession {
  return { id: row.id, phraseIds: Array.isArray(row.phrase_ids) ? row.phrase_ids.filter((id): id is string => typeof id === "string") : [], currentIndex: row.current_index, completed: row.completed, createdAt: row.created_at };
}

function mapExplainSession(row: ExplainSessionRow): CommunicationExplainSession { return { id: row.id, userId: row.user_id, practiceType: row.practice_type, difficulty: row.difficulty, inputMode: row.input_mode, startedAt: row.started_at, endedAt: row.ended_at ?? undefined, status: row.status, taskCount: row.task_count, completedTaskCount: row.completed_task_count, createdAt: row.created_at }; }
function mapExplainTask(row: ExplainTaskRow): CommunicationExplainTask { return { id: row.id, sessionId: row.session_id, prompt: row.prompt, promptType: row.prompt_type, difficulty: row.difficulty, sequence: row.sequence, createdAt: row.created_at }; }
function mapExplainAttempt(row: ExplainAttemptRow): CommunicationExplainAttempt { return { id: row.id, taskId: row.task_id, userId: row.user_id, transcript: row.transcript, inputSource: row.input_source, attemptNumber: row.attempt_number, usedHints: Array.isArray(row.used_hints) ? row.used_hints.filter((hint): hint is string => typeof hint === "string") : [], submittedAt: row.submitted_at, analysis: isRecord(row.analysis) ? row.analysis as CommunicationExplainAttempt["analysis"] : undefined, createdAt: row.created_at }; }
function mapMeaningSession(row: MeaningSessionRow): CommunicationMeaningSession { return { id: row.id, userId: row.user_id, difficulty: row.difficulty, inputMode: row.input_mode, targetItemCount: row.target_item_count, startedAt: row.started_at, endedAt: row.ended_at ?? undefined, status: row.status, completedItemCount: row.completed_item_count, createdAt: row.created_at }; }
function mapMeaningItem(row: MeaningItemRow): CommunicationMeaningItem { return { id: row.id, sessionId: row.session_id, phraseId: row.phrase_id ?? undefined, questionType: row.question_type, content: isRecord(row.content) ? row.content as unknown as CommunicationMeaningContent : { context: "", prompt: "", correctAnswer: "", explanation: "", shortMeaning: "" }, difficulty: row.difficulty, category: row.category, sequence: row.sequence, createdAt: row.created_at }; }
function mapMeaningAttempt(row: MeaningAttemptRow): CommunicationMeaningAttempt { return { id: row.id, itemId: row.item_id, userId: row.user_id, response: row.response, responseMode: row.response_mode, correctness: row.correctness, confidence: row.confidence ?? undefined, usedHint: row.used_hint, timeTakenMs: row.time_taken_ms ?? undefined, analysis: isRecord(row.analysis) ? row.analysis as CommunicationMeaningAttempt["analysis"] : undefined, createdAt: row.created_at }; }
function mapSkillEvidence(row: SkillEvidenceRow): CommunicationSkillEvidence { return { id: row.id, userId: row.user_id, sessionId: row.session_id ?? undefined, sourceModule: row.source_module, dimension: row.dimension, value: row.value, confidence: row.confidence, difficulty: row.difficulty, evidenceType: row.evidence_type, assistanceLevel: row.assistance_level, evidenceKey: row.evidence_key, metadata: isRecord(row.metadata) ? row.metadata : undefined, occurredAt: row.occurred_at }; }
function mapSkillSnapshot(row: SkillSnapshotRow): CommunicationSkillSnapshot { return { id: row.id, dimension: row.dimension, score: row.score, confidence: row.confidence, evidenceCount: row.evidence_count, capturedAt: row.captured_at }; }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
