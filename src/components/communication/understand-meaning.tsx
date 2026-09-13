"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, Lightbulb, Mic, MicOff, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CommunicationDifficulty, CommunicationInputMode, CommunicationMeaningAttempt, CommunicationMeaningItem, CommunicationMeaningSession, CommunicationMessageInputSource } from "@/types/communication";

type State = "SETUP" | "LOADING" | "ACTIVE" | "ANSWERED" | "DONE" | "ERROR";
type Result = { correctness: "CORRECT" | "PARTIAL" | "INCORRECT"; analysis: { explanation: string; correctAnswer: string; shortMeaning: string; relatedPhrase?: string } };

export function UnderstandMeaning() {
  const [state, setState] = useState<State>("SETUP");
  const [difficulty, setDifficulty] = useState<CommunicationDifficulty>("ADAPTIVE");
  const [inputMode, setInputMode] = useState<CommunicationInputMode>("VOICE_TEXT");
  const [count, setCount] = useState<5 | 8 | 12>(8);
  const [session, setSession] = useState<CommunicationMeaningSession | null>(null);
  const [items, setItems] = useState<CommunicationMeaningItem[]>([]);
  const [attempts, setAttempts] = useState<CommunicationMeaningAttempt[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [confidence, setConfidence] = useState<"SURE" | "NOT_SURE">("SURE");
  const [hint, setHint] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setState("LOADING"); setError(null);
    const response = await fetch("/api/communication/meaning/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ difficulty, inputMode, targetItemCount: count }) });
    const data = await response.json() as { session?: CommunicationMeaningSession; items?: CommunicationMeaningItem[]; error?: string };
    if (!response.ok || !data.session) { setError(data.error ?? "Understand Meaning could not start."); setState("ERROR"); return; }
    setSession(data.session); setItems(data.items ?? []); setAttempts([]); setIndex(0); setDraft(""); setResult(null); setState("ACTIVE");
  }

  async function answer(responseMode: CommunicationMessageInputSource = "TEXT") {
    const item = items[index];
    if (!item || !draft.trim() || result) return;
    const response = await fetch(`/api/communication/meaning/items/${item.id}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: draft, responseMode, confidence, usedHint: Boolean(hint) }) });
    const data = await response.json() as { attempt?: CommunicationMeaningAttempt; result?: Result; error?: string };
    if (!response.ok || !data.attempt || !data.result) { setError(data.error ?? "Your answer could not be recorded."); return; }
    setAttempts((current) => [...current, data.attempt!]); setResult(data.result); setState("ANSWERED");
  }

  async function next() {
    if (index + 1 >= items.length) {
      if (session) await fetch(`/api/communication/meaning/sessions/${session.id}/complete`, { method: "POST" });
      setState("DONE"); return;
    }
    setIndex((value) => value + 1); setDraft(""); setHint(null); setResult(null); setSaved(false); setConfidence("SURE"); setState("ACTIVE");
  }

  if (state === "SETUP" || state === "ERROR" || state === "LOADING") return <Setup difficulty={difficulty} setDifficulty={setDifficulty} inputMode={inputMode} setInputMode={setInputMode} count={count} setCount={setCount} onStart={() => void start()} error={error} loading={state === "LOADING"} />;
  if (state === "DONE") return <div className="mx-auto max-w-2xl space-y-5"><Link href="/communication/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Practice</Link><Card className="py-10 text-center"><Check className="mx-auto size-8" /><h1 className="mt-3 text-2xl font-semibold">Understand Meaning complete</h1><p className="mt-2 text-sm text-[var(--foreground-muted)]">{attempts.length} conversational item{attempts.length === 1 ? "" : "s"} recorded. Missed phrases can be revisited as Phrase Bank evidence.</p></Card></div>;
  const item = items[index];
  if (!item) return null;
  const currentItem = item;
  async function savePhrase() {
    if (!currentItem.content.phrase || saved) return;
    const response = await fetch("/api/communication/phrases", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phrase: currentItem.content.phrase, meaning: currentItem.content.shortMeaning, example: currentItem.content.context, sourceType: "UNDERSTAND_MEANING" }) });
    if (response.ok) setSaved(true);
  }
  return <MeaningItemView item={currentItem} draft={draft} setDraft={setDraft} confidence={confidence} setConfidence={setConfidence} hint={hint} setHint={setHint} result={result} state={state} saved={saved} onSavePhrase={() => void savePhrase()} onAnswer={(source) => void answer(source)} onNext={() => void next()} error={error} />;
}

function Setup({ difficulty, setDifficulty, inputMode, setInputMode, count, setCount, onStart, error, loading }: { difficulty: CommunicationDifficulty; setDifficulty: (value: CommunicationDifficulty) => void; inputMode: CommunicationInputMode; setInputMode: (value: CommunicationInputMode) => void; count: 5 | 8 | 12; setCount: (value: 5 | 8 | 12) => void; onStart: () => void; error: string | null; loading: boolean }) {
  return <div className="mx-auto max-w-3xl space-y-5"><Link href="/communication/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Practice</Link><Card className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Understand Meaning</p><h1 className="mt-2 text-2xl font-semibold">Understand what people actually mean.</h1><p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">Read the situation, infer the intention, and respond naturally. The context matters more than a literal translation.</p></div><ChoiceGroup label="Difficulty">{(["ADAPTIVE", "EASY", "NORMAL", "CHALLENGING"] as CommunicationDifficulty[]).map((value) => <Choice key={value} active={difficulty === value} onClick={() => setDifficulty(value)}>{titleCase(value)}</Choice>)}</ChoiceGroup><ChoiceGroup label="Input mode"><Choice active={inputMode === "VOICE_TEXT"} onClick={() => setInputMode("VOICE_TEXT")}>Voice + Text</Choice><Choice active={inputMode === "TEXT_ONLY"} onClick={() => setInputMode("TEXT_ONLY")}>Text Only</Choice></ChoiceGroup><ChoiceGroup label="Session length">{([5, 8, 12] as const).map((value) => <Choice key={value} active={count === value} onClick={() => setCount(value)}>{value} items</Choice>)}</ChoiceGroup>{error ? <p role="alert" className="border-l-2 border-[var(--primary)] pl-3 text-sm">{error}</p> : null}<Button onClick={onStart} disabled={loading}><Sparkles className="mr-2 size-4" /> {loading ? "Preparing..." : "Begin practice"}</Button></Card></div>;
}

function MeaningItemView({ item, draft, setDraft, confidence, setConfidence, hint, setHint, result, state, saved, onSavePhrase, onAnswer, onNext, error }: { item: CommunicationMeaningItem; draft: string; setDraft: (value: string) => void; confidence: "SURE" | "NOT_SURE"; setConfidence: (value: "SURE" | "NOT_SURE") => void; hint: string | null; setHint: (value: string | null) => void; result: Result | null; state: State; saved: boolean; onSavePhrase: () => void; onAnswer: (source: CommunicationMessageInputSource) => void; onNext: () => void; error: string | null }) {
  const [voice, setVoice] = useState(false); const recognitionRef = useRef<BrowserRecognition | null>(null);
  function toggleVoice() { if (voice) { recognitionRef.current?.stop(); setVoice(false); return; } const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined; if (!Recognition) { setHint("Voice input is unavailable in this browser. Text remains available."); return; } const recognition = new Recognition(); recognition.lang = "en-US"; recognition.interimResults = false; recognition.onresult = (event) => { setDraft(event.results[0]?.[0]?.transcript ?? ""); setVoice(false); }; recognition.onend = () => setVoice(false); recognition.onerror = () => { setVoice(false); setHint("Voice input failed. You can continue in text mode."); }; recognitionRef.current = recognition; recognition.start(); setVoice(true); }
  const isChoice = Boolean(item.content.options?.length);
  return <div className="mx-auto max-w-3xl space-y-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">{titleCase(item.questionType)} · {item.category}</p><h1 className="mt-2 text-2xl font-semibold">What does this mean here?</h1></div><span className="text-sm text-[var(--foreground-muted)]">Item {item.sequence}</span></div><Card className="whitespace-pre-line border-l-4 border-l-[var(--foreground)]"><p className="text-lg leading-8">{item.content.context}</p></Card><Card className="space-y-4"><p className="text-sm font-semibold">{item.content.prompt}</p>{isChoice ? <div className="grid gap-2">{item.content.options?.map((option) => <button key={option} type="button" onClick={() => setDraft(option)} className={`min-h-11 rounded-md border px-3 text-left text-sm transition ${draft === option ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] hover:border-[var(--foreground)]"}`}>{option}</button>)}</div> : <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} placeholder="Explain what they mean or respond naturally..." disabled={Boolean(result)} className="min-h-32 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-base leading-7 outline-none focus:border-[var(--foreground)]" />}{hint ? <p className="border-l-2 border-[var(--border)] pl-3 text-sm text-[var(--foreground-muted)]"><span className="font-semibold">Hint:</span> {hint}</p> : null}<div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setHint(item.content.shortMeaning)} disabled={Boolean(result)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><Lightbulb className="size-4" /> Need a hint?</button><button type="button" onClick={toggleVoice} disabled={Boolean(result)} aria-label={voice ? "Stop voice input" : "Start voice input"} aria-pressed={voice} className={`inline-flex size-11 items-center justify-center rounded-md border ${voice ? "bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)]"}`}>{voice ? <MicOff className="size-4" /> : <Mic className="size-4" />}</button><span className="ml-auto text-xs text-[var(--foreground-muted)]">How confident are you?</span><button type="button" onClick={() => setConfidence("SURE")} className={`rounded-md border px-3 py-2 text-xs font-semibold ${confidence === "SURE" ? "border-[var(--foreground)]" : "border-[var(--border)]"}`}>Sure</button><button type="button" onClick={() => setConfidence("NOT_SURE")} className={`rounded-md border px-3 py-2 text-xs font-semibold ${confidence === "NOT_SURE" ? "border-[var(--foreground)]" : "border-[var(--border)]"}`}>Not sure</button></div>{result ? <div role="status" className="space-y-3 border-t border-[var(--border)] pt-4"><p className="font-semibold">{titleCase(result.correctness)}</p><p className="text-sm leading-6">{result.analysis.explanation}</p><p className="text-sm text-[var(--foreground-muted)]"><span className="font-semibold">Best interpretation:</span> {result.analysis.correctAnswer}</p>{result.analysis.relatedPhrase ? <p className="text-sm text-[var(--foreground-muted)]">Related phrase: {result.analysis.relatedPhrase}</p> : null}<div className="flex flex-wrap gap-2">{item.content.phrase ? <button type="button" onClick={onSavePhrase} disabled={saved} className="min-h-10 rounded-md border border-[var(--border)] px-3 text-sm font-semibold">{saved ? "Saved to Phrase Bank" : "Save phrase"}</button> : null}<Button onClick={onNext}>Next item <ArrowLeft className="ml-2 size-4 rotate-180" /></Button></div></div> : <Button onClick={() => onAnswer(voice ? "VOICE_TRANSCRIPT" : "TEXT")} disabled={!draft.trim() || state === "LOADING"}><Send className="mr-2 size-4" /> Check answer</Button>}{error ? <p role="alert" className="text-sm">{error}</p> : null}</Card></div>;
}

function ChoiceGroup({ label, children }: { label: string; children: React.ReactNode }) { return <fieldset className="space-y-2"><legend className="text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>; }
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${active ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] hover:border-[var(--foreground)]"}`}>{children}</button>; }
function titleCase(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
type BrowserRecognition = { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };
declare global { interface Window { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition; } }
