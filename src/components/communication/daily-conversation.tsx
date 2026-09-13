"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Clock3, MessageCircle, Mic, MicOff, Send, Sparkles, Square, WandSparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  CommunicationMessage,
  CommunicationSession,
  CommunicationSessionReview,
  CommunicationSessionSetup,
} from "@/types/communication";

type ConversationState = "SETUP" | "ACTIVE" | "SENDING" | "ENDING" | "REVIEW" | "ERROR";

const defaultSetup: CommunicationSessionSetup = {
  targetDurationMinutes: 10,
  inputMode: "VOICE_TEXT",
  difficulty: "ADAPTIVE",
  conversationStyle: "MIXED",
};

export function DailyConversation() {
  const [state, setState] = useState<ConversationState>("SETUP");
  const [setup, setSetup] = useState<CommunicationSessionSetup>(defaultSetup);
  const [session, setSession] = useState<CommunicationSession | null>(null);
  const [messages, setMessages] = useState<CommunicationMessage[]>([]);
  const [review, setReview] = useState<CommunicationSessionReview | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (state !== "ACTIVE" || !session) return;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - Date.parse(session.startedAt)) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [session, state]);

  async function startSession() {
    setError(null);
    setState("SENDING");
    const response = await fetch("/api/communication/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(setup) });
    const data = await response.json() as { session?: CommunicationSession; messages?: CommunicationMessage[]; error?: string };
    if (!response.ok || !data.session) {
      setError(data.error ?? "The session could not be started.");
      setState("ERROR");
      return;
    }
    setSession(data.session);
    setMessages(data.messages ?? []);
    setSeconds(0);
    setState("ACTIVE");
  }

  async function sendMessage(inputSource: "TEXT" | "VOICE_TRANSCRIPT" = "TEXT") {
    const content = draft.trim();
    if (!content || !session || state === "SENDING") return;
    setState("SENDING");
    setError(null);
    const response = await fetch(`/api/communication/sessions/${session.id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content, inputSource }) });
    const data = await response.json() as { userMessage?: CommunicationMessage; assistantMessage?: CommunicationMessage; error?: string };
    if (!response.ok || !data.userMessage || !data.assistantMessage) {
      setError(data.error ?? "The response could not be sent. Your text is still here to retry.");
      setState("ACTIVE");
      return;
    }
    setMessages((current) => [...current, data.userMessage!, data.assistantMessage!]);
    setDraft("");
    setState("ACTIVE");
  }

  async function finishSession() {
    if (!session || state === "ENDING") return;
    setState("ENDING");
    const response = await fetch(`/api/communication/sessions/${session.id}/complete`, { method: "POST" });
    const data = await response.json() as CommunicationSessionReview & { error?: string };
    if (!response.ok || !data.session) {
      setError(data.error ?? "The review could not be generated.");
      setState("ACTIVE");
      return;
    }
    setReview(data);
    setSession(data.session);
    setState("REVIEW");
  }

  if (state === "SETUP" || state === "ERROR") return <SetupPanel setup={setup} setSetup={setSetup} onStart={startSession} error={error} />;
  if (state === "REVIEW" && review) return <ReviewPanel review={review} />;
  return <ConversationPanel session={session} messages={messages} draft={draft} setDraft={setDraft} seconds={seconds} state={state} error={error} onSend={sendMessage} onEnd={finishSession} />;
}

function SetupPanel({ setup, setSetup, onStart, error }: { setup: CommunicationSessionSetup; setSetup: (setup: CommunicationSessionSetup) => void; onStart: () => void; error: string | null }) {
  return <div className="mx-auto w-full max-w-3xl space-y-5">
    <Link href="/communication/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><ArrowLeft aria-hidden="true" className="size-4" /> Practice</Link>
    <Card className="space-y-7">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Daily Conversation</p><h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Set up a natural conversation</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--foreground-muted)]">Keep it simple. You can type at any time, and useful feedback comes after the conversation.</p></div>
      <SetupChoice label="Duration"><div className="grid grid-cols-4 gap-2">{([5, 10, 15, 20] as const).map((value) => <ChoiceButton key={value} selected={setup.targetDurationMinutes === value} onClick={() => setSetup({ ...setup, targetDurationMinutes: value })}>{value} min</ChoiceButton>)}</div></SetupChoice>
      <SetupChoice label="Input mode"><div className="grid gap-2 sm:grid-cols-2">{([ ["VOICE_TEXT", "Voice + Text", "Use voice when available, with editable text always ready."], ["TEXT_ONLY", "Text Only", "A focused text conversation without microphone access."] ] as const).map(([value, label, description]) => <ChoiceButton key={value} selected={setup.inputMode === value} onClick={() => setSetup({ ...setup, inputMode: value })}>{label}<span className="block text-left text-xs font-normal text-[var(--foreground-muted)]">{description}</span></ChoiceButton>)}</div></SetupChoice>
      <SetupChoice label="Difficulty"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["ADAPTIVE", "EASY", "NORMAL", "CHALLENGING"] as const).map((value) => <ChoiceButton key={value} selected={setup.difficulty === value} onClick={() => setSetup({ ...setup, difficulty: value })}>{titleCase(value)}</ChoiceButton>)}</div></SetupChoice>
      <SetupChoice label="Conversation style"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(["EVERYDAY", "SOCIAL", "IDEAS_OPINIONS", "MIXED"] as const).map((value) => <ChoiceButton key={value} selected={setup.conversationStyle === value} onClick={() => setSetup({ ...setup, conversationStyle: value })}>{titleCase(value)}</ChoiceButton>)}</div></SetupChoice>
      {error ? <p role="alert" className="border-l-2 border-[var(--primary)] pl-3 text-sm text-[var(--foreground)]">{error}</p> : null}
      <Button onClick={onStart} className="w-full sm:w-auto"><MessageCircle aria-hidden="true" className="mr-2 size-4" /> Start Conversation</Button>
    </Card>
  </div>;
}

function ConversationPanel({ session, messages, draft, setDraft, seconds, state, error, onSend, onEnd }: { session: CommunicationSession | null; messages: CommunicationMessage[]; draft: string; setDraft: (value: string) => void; seconds: number; state: ConversationState; error: string | null; onSend: (inputSource?: "TEXT" | "VOICE_TRANSCRIPT") => void; onEnd: () => void }) {
  const [voiceState, setVoiceState] = useState<"IDLE" | "RECORDING" | "PROCESSING" | "ERROR">("IDLE");
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const canUseBrowserVoice = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function toggleVoice() {
    if (voiceState === "RECORDING") { recognitionRef.current?.stop(); setVoiceState("PROCESSING"); return; }
    if (!canUseBrowserVoice) { setVoiceState("ERROR"); return; }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) { setVoiceState("ERROR"); return; }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => { setDraft(event.results[0]?.[0]?.transcript ?? ""); setVoiceState("IDLE"); };
    recognition.onerror = () => setVoiceState("ERROR");
    recognition.onend = () => setVoiceState((current) => current === "PROCESSING" ? "IDLE" : current);
    recognitionRef.current = recognition;
    recognition.start();
    setVoiceState("RECORDING");
  }

  return <div className="mx-auto flex min-h-[min(720px,calc(100vh-8rem))] w-full max-w-4xl flex-col gap-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Daily Conversation</p><h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">{titleCase(session?.conversationStyle ?? "MIXED")} practice</h2></div><div className="flex items-center gap-3 text-sm text-[var(--foreground-muted)]"><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" className="size-4" /> {formatTime(seconds)}</span><button type="button" onClick={onEnd} disabled={state === "SENDING" || state === "ENDING"} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] px-3 font-semibold text-[var(--foreground)] hover:border-[var(--foreground)] disabled:opacity-50"><Square aria-hidden="true" className="size-3.5 fill-current" /> End Session</button></div></div>
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0"><div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">{messages.map((message) => <div key={message.id} className={message.role === "USER" ? "ml-auto max-w-[85%] rounded-lg bg-[var(--foreground)] px-4 py-3 text-sm leading-6 text-[var(--background)]" : "max-w-[85%] rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]"}><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-65">{message.role === "USER" ? "You" : "Evolve"}</p>{message.content}</div>)}</div><div className="border-t border-[var(--border)] p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSend(voiceState === "PROCESSING" ? "VOICE_TRANSCRIPT" : "TEXT"); } }} rows={2} placeholder="Type your response..." disabled={state === "SENDING" || state === "ENDING"} className="min-h-20 flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--foreground)]" aria-label="Your response" /><button type="button" onClick={toggleVoice} aria-label={voiceState === "RECORDING" ? "Stop voice input" : "Start voice input"} aria-pressed={voiceState === "RECORDING"} className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md border transition ${voiceState === "RECORDING" ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]"}`}><span className="sr-only">{voiceState === "RECORDING" ? "Recording" : "Voice input"}</span>{voiceState === "RECORDING" ? <MicOff aria-hidden="true" className="size-4" /> : <Mic aria-hidden="true" className="size-4" />}</button><button type="button" onClick={() => onSend(voiceState === "PROCESSING" ? "VOICE_TRANSCRIPT" : "TEXT")} disabled={!draft.trim() || state === "SENDING" || state === "ENDING"} aria-label="Send response" className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-105 disabled:opacity-50"><Send aria-hidden="true" className="size-4" /></button></div><div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--foreground-muted)]"><span>{state === "SENDING" ? "Evolve is responding..." : voiceState === "RECORDING" ? "Listening... tap the microphone to stop." : voiceState === "ERROR" ? "Voice input is unavailable. Continue by typing." : "Enter to send - Shift + Enter for a new line"}</span>{error ? <span role="alert" className="text-[var(--foreground)]">{error}</span> : null}</div></div></Card>
  </div>;
}

function ReviewPanel({ review }: { review: CommunicationSessionReview }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  async function savePhrase(phraseId: string) {
    setSaveError(null);
    const candidate = review.phraseCandidates.find((item) => item.id === phraseId);
    const response = await fetch(`/api/communication/sessions/${review.session.id}/phrase-events`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phrase: candidate?.phrase, meaning: candidate?.meaning, example: candidate?.example, eventType: "EXPOSED" }) });
    if (!response.ok) { setSaveError("The phrase could not be saved yet."); return; }
    setSaved((current) => [...current, phraseId]);
  }
  return <div className="mx-auto w-full max-w-4xl space-y-5"><Link href="/communication" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><ArrowLeft aria-hidden="true" className="size-4" /> Communication Today</Link><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Session review</p><h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">What this conversation showed</h2><p className="mt-2 text-sm text-[var(--foreground-muted)]">This is a provisional observation. The session is saved, and repeated sessions will make the evidence more reliable.</p></div><div className="grid gap-4 sm:grid-cols-3"><ReviewMetric label="Duration" value={`${Math.max(1, Math.round(review.session.durationSeconds / 60))} min`} /><ReviewMetric label="Exchanges" value={Math.floor(review.session.messageCount / 2)} /><ReviewMetric label="Status" value={review.session.status === "COMPLETED" ? "Complete" : "Limited data"} /></div><div className="grid gap-5 lg:grid-cols-2"><ReviewList icon={<Check aria-hidden="true" className="size-4" />} title="What went well" items={review.strengths} empty="Complete a few more turns to establish strengths." /><ReviewList icon={<WandSparkles aria-hidden="true" className="size-4" />} title="Improve next time" items={review.improvements} empty="No immediate improvement is required from this session." /></div><Card><div className="flex items-center gap-2"><Sparkles aria-hidden="true" className="size-4 text-[var(--primary)]" /><h3 className="font-semibold text-[var(--foreground)]">Skill observations</h3></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{Object.entries(review.skillObservations).map(([key, observation]) => <div key={key} className="rounded-md border border-[var(--border)] p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-[var(--foreground)]">{titleCase(key)}</span><span className="text-xs text-[var(--foreground-muted)]">{observation.score === null ? "Building history" : `${observation.score}% provisional`}</span></div><p className="mt-1 text-xs text-[var(--foreground-muted)]">{observation.evidenceCount} evidence points - {Math.round(observation.confidence * 100)}% confidence</p></div>)}</div></Card><Card><h3 className="font-semibold text-[var(--foreground)]">Phrases from this session</h3>{saveError ? <p role="alert" className="mt-2 text-sm text-[var(--foreground)]">{saveError}</p> : null}{review.phraseCandidates.length ? <div className="mt-4 space-y-3">{review.phraseCandidates.map((candidate) => <div key={candidate.id} className="flex flex-col gap-3 rounded-md border border-[var(--border)] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[var(--foreground)]">{candidate.phrase}</p><p className="mt-1 text-sm text-[var(--foreground-muted)]">{candidate.meaning}</p></div><button type="button" onClick={() => savePhrase(candidate.id)} disabled={saved.includes(candidate.id)} className="inline-flex min-h-9 items-center justify-center rounded-md border border-[var(--border)] px-3 text-xs font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:opacity-70">{saved.includes(candidate.id) ? "Saved for Phrase Bank" : "Save to Phrase Bank"}</button></div>)}</div> : <p className="mt-2 text-sm text-[var(--foreground-muted)]">No phrase candidates were identified in this session.</p>}</Card><Link href="/communication" className="inline-flex min-h-10 items-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]">Return to Communication</Link></div>;
}

function SetupChoice({ label, children }: { label: string; children: React.ReactNode }) { return <fieldset className="space-y-2"><legend className="text-sm font-semibold text-[var(--foreground)]">{label}</legend>{children}</fieldset>; }
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm font-semibold transition ${selected ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)]"}`}>{children}</button>; }
function ReviewMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"><p className="text-xs font-semibold uppercase text-[var(--foreground-muted)]">{label}</p><p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{value}</p></div>; }
function ReviewList({ icon, title, items, empty }: { icon: React.ReactNode; title: string; items: string[]; empty: string }) { return <Card><div className="flex items-center gap-2"><span className="text-[var(--primary)]">{icon}</span><h3 className="font-semibold text-[var(--foreground)]">{title}</h3></div>{items.length ? <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--foreground-muted)]">{items.map((item) => <li key={item} className="border-l-2 border-[var(--border)] pl-3">{item}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--foreground-muted)]">{empty}</p>}</Card>; }
function formatTime(seconds: number) { return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`; }
function titleCase(value: string) { return value.toLowerCase().split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}
