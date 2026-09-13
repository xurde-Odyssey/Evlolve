"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Check, Lightbulb, Mic, MicOff, RotateCcw, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CommunicationExplainAnalysis, CommunicationExplainAttempt, CommunicationExplainInputMode, CommunicationExplainPracticeType, CommunicationExplainSession, CommunicationExplainTask, CommunicationDifficulty, CommunicationMessageInputSource } from "@/types/communication";

type ExplainState = "SETUP" | "LOADING" | "ACTIVE" | "ANALYZING" | "REVIEW" | "DONE" | "ERROR";
const modes: Array<[CommunicationExplainPracticeType, string]> = [["MIXED", "Mixed"], ["SITUATION", "Situation"], ["IDEA", "Idea"], ["STORY", "Story"], ["OPINION", "Opinion"]];
const difficulties: CommunicationDifficulty[] = ["ADAPTIVE", "EASY", "NORMAL", "CHALLENGING"];

export function ExplainBetter() {
  const [state, setState] = useState<ExplainState>("SETUP");
  const [practiceType, setPracticeType] = useState<CommunicationExplainPracticeType>("MIXED");
  const [difficulty, setDifficulty] = useState<CommunicationDifficulty>("ADAPTIVE");
  const [inputMode, setInputMode] = useState<CommunicationExplainInputMode>("VOICE_TEXT");
  const [session, setSession] = useState<CommunicationExplainSession | null>(null);
  const [tasks, setTasks] = useState<CommunicationExplainTask[]>([]);
  const [taskIndex, setTaskIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [attempts, setAttempts] = useState<CommunicationExplainAttempt[]>([]);
  const [analysis, setAnalysis] = useState<CommunicationExplainAnalysis | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setState("LOADING"); setError(null);
    const response = await fetch("/api/communication/explain/sessions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ practiceType, difficulty, inputMode }) });
    const data = await response.json() as { session?: CommunicationExplainSession; tasks?: CommunicationExplainTask[]; error?: string };
    if (!response.ok || !data.session) { setError(data.error ?? "Explain Better could not start."); setState("ERROR"); return; }
    setSession(data.session); setTasks(data.tasks ?? []); setTaskIndex(0); setDraft(""); setAttempts([]); setAnalysis(null); setState("ACTIVE");
  }

  async function submit(source: CommunicationMessageInputSource = "TEXT") {
    const task = tasks[taskIndex];
    if (!task || !draft.trim() || state === "ANALYZING") return;
    setState("ANALYZING"); setError(null);
    const response = await fetch(`/api/communication/explain/tasks/${task.id}/attempts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ transcript: draft, inputSource: source, usedHints: hints }) });
    const data = await response.json() as { attempt?: CommunicationExplainAttempt; error?: string };
    if (!response.ok || !data.attempt) { setError(data.error ?? "Your explanation could not be analyzed. Try again."); setState("ACTIVE"); return; }
    setAttempts((current) => [...current, data.attempt!]); setAnalysis(data.attempt.analysis ?? null); setState("REVIEW");
  }

  async function finish() {
    if (!session) return;
    await fetch(`/api/communication/explain/sessions/${session.id}/complete`, { method: "POST" });
    setState("DONE");
  }

  function nextTask() { if (taskIndex + 1 >= tasks.length) { void finish(); return; } setTaskIndex((value) => value + 1); setDraft(""); setHints([]); setAnalysis(null); setState("ACTIVE"); }
  function retry() { setDraft(""); setAnalysis(null); setState("ACTIVE"); }

  if (state === "SETUP" || state === "ERROR") return <ExplainSetup practiceType={practiceType} setPracticeType={setPracticeType} difficulty={difficulty} setDifficulty={setDifficulty} inputMode={inputMode} setInputMode={setInputMode} onStart={() => void start()} error={error} />;
  if (state === "DONE") return <div className="mx-auto max-w-2xl space-y-5"><Link href="/communication" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Communication Today</Link><Card className="py-10 text-center"><Check className="mx-auto size-8" /><h1 className="mt-3 text-2xl font-semibold">Explain Better complete</h1><p className="mt-2 text-sm text-[var(--foreground-muted)]">{attempts.length} task{attempts.length === 1 ? "" : "s"} recorded. Your explanations remain available as evidence for future Communication progress.</p></Card></div>;
  const task = tasks[taskIndex];
  if (!task) return null;
  return <ExplainTaskView task={task} draft={draft} setDraft={setDraft} state={state} analysis={analysis} attempts={attempts.filter((attempt) => attempt.taskId === task.id)} hints={hints} setHints={setHints} onSubmit={(source) => void submit(source)} onRetry={retry} onNext={nextTask} error={error} />;
}

function ExplainSetup({ practiceType, setPracticeType, difficulty, setDifficulty, inputMode, setInputMode, onStart, error }: { practiceType: CommunicationExplainPracticeType; setPracticeType: (value: CommunicationExplainPracticeType) => void; difficulty: CommunicationDifficulty; setDifficulty: (value: CommunicationDifficulty) => void; inputMode: CommunicationExplainInputMode; setInputMode: (value: CommunicationExplainInputMode) => void; onStart: () => void; error: string | null }) {
  return <div className="mx-auto max-w-3xl space-y-5"><Link href="/communication/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Practice</Link><Card className="space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Explain Better</p><h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Take what you mean and make it easy to follow.</h1><p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">Give a natural explanation. Feedback comes after you submit, with a chance to try again.</p></div><ChoiceGroup label="Practice type">{modes.map(([value, label]) => <Choice key={value} active={practiceType === value} onClick={() => setPracticeType(value)}>{label}</Choice>)}</ChoiceGroup><ChoiceGroup label="Difficulty">{difficulties.map((value) => <Choice key={value} active={difficulty === value} onClick={() => setDifficulty(value)}>{titleCase(value)}</Choice>)}</ChoiceGroup><ChoiceGroup label="Input mode"><Choice active={inputMode === "VOICE_TEXT"} onClick={() => setInputMode("VOICE_TEXT")}>Voice + Text</Choice><Choice active={inputMode === "TEXT_ONLY"} onClick={() => setInputMode("TEXT_ONLY")}>Text Only</Choice></ChoiceGroup>{error ? <p role="alert" className="border-l-2 border-[var(--primary)] pl-3 text-sm">{error}</p> : null}<Button onClick={onStart}><Sparkles className="mr-2 size-4" /> Begin Explain Better</Button></Card></div>;
}

function ExplainTaskView({ task, draft, setDraft, state, analysis, attempts, hints, setHints, onSubmit, onRetry, onNext, error }: { task: CommunicationExplainTask; draft: string; setDraft: (value: string) => void; state: ExplainState; analysis: CommunicationExplainAnalysis | null; attempts: CommunicationExplainAttempt[]; hints: string[]; setHints: (value: string[]) => void; onSubmit: (source: CommunicationMessageInputSource) => void; onRetry: () => void; onNext: () => void; error: string | null }) {
  const [voice, setVoice] = useState(false); const recognitionRef = useRef<BrowserRecognition | null>(null);
  function toggleVoice() { if (voice) { recognitionRef.current?.stop(); setVoice(false); return; } const Recognition = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : undefined; if (!Recognition) return; const recognition = new Recognition(); recognition.lang = "en-US"; recognition.interimResults = false; recognition.onresult = (event) => { setDraft(event.results[0]?.[0]?.transcript ?? ""); setVoice(false); }; recognition.onend = () => setVoice(false); recognition.onerror = () => setVoice(false); recognitionRef.current = recognition; recognition.start(); setVoice(true); }
  const hintOptions = ["The main reason is...", "Give one example or result.", "What happened first, and what happened next?"];
  if (analysis) return <ReviewView analysis={analysis} attempts={attempts} onRetry={onRetry} onNext={onNext} />;
  function addHint() { const hint = hintOptions[hints.length % hintOptions.length]; if (hint) setHints([...hints, hint]); }
  return <div className="mx-auto flex min-h-[min(700px,calc(100vh-8rem))] max-w-3xl flex-col gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">{titleCase(task.promptType)} · Task {task.sequence}</p><h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Explain this naturally</h1></div><Card className="border-l-4 border-l-[var(--foreground)]"><p className="text-lg leading-8 text-[var(--foreground)]">{task.prompt}</p></Card><Card className="flex flex-1 flex-col gap-4"><label htmlFor="explanation" className="text-sm font-semibold text-[var(--foreground)]">Your explanation</label><textarea id="explanation" value={draft} onChange={(event) => setDraft(event.target.value)} rows={8} placeholder="Say what you mean in your own words..." disabled={state === "ANALYZING"} className="min-h-48 flex-1 resize-none rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-base leading-7 text-[var(--foreground)] outline-none focus:border-[var(--foreground)]" />{hints.length ? <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground-muted)]">{hints.map((hint) => <span key={hint} className="rounded-md border border-[var(--border)] px-2 py-1">{hint}</span>)}</div> : null}<div className="flex flex-wrap items-center justify-between gap-3"><button type="button" onClick={addHint} disabled={hints.length >= 3} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"><Lightbulb className="size-4" /> Need a hint?</button><div className="flex gap-2"><button type="button" onClick={toggleVoice} aria-label={voice ? "Stop voice input" : "Start voice input"} aria-pressed={voice} className={`inline-flex size-11 items-center justify-center rounded-md border ${voice ? "bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)]"}`}>{voice ? <MicOff className="size-4" /> : <Mic className="size-4" />}</button><Button onClick={() => onSubmit(voice ? "VOICE_TRANSCRIPT" : "TEXT")} disabled={!draft.trim() || state === "ANALYZING"}>{state === "ANALYZING" ? "Analyzing..." : <><Send className="mr-2 size-4" /> Submit explanation</>}</Button></div></div>{error ? <p role="alert" className="text-sm">{error}</p> : null}</Card></div>;
}

function ReviewView({ analysis, attempts, onRetry, onNext }: { analysis: CommunicationExplainAnalysis; attempts: CommunicationExplainAttempt[]; onRetry: () => void; onNext: () => void }) { const previous = attempts.length > 1 ? attempts[attempts.length - 2] : undefined; return <div className="mx-auto max-w-3xl space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Explanation review</p><h1 className="mt-2 text-2xl font-semibold">Make the idea easier to follow</h1></div><div className="grid gap-5 lg:grid-cols-2"><Card><h2 className="font-semibold">What was clear</h2>{analysis.strengths.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground-muted)]">{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--foreground-muted)]">This response needs a little more evidence before a strength is clear.</p>}</Card><Card><h2 className="font-semibold">Improve this</h2>{analysis.improvements.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--foreground-muted)]">{analysis.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="mt-3 text-sm text-[var(--foreground-muted)]">No high-priority improvement was detected.</p>}</Card></div>{analysis.corrections.length ? <Card><h2 className="font-semibold">Better wording</h2>{analysis.corrections.map((correction) => <div key={correction.id} className="mt-4 space-y-2 border-l-2 border-[var(--border)] pl-3 text-sm"><p><span className="font-semibold">What you said:</span> {correction.original}</p><p><span className="font-semibold">More natural:</span> {correction.naturalVersion}</p><p className="text-[var(--foreground-muted)]">{correction.why}</p></div>)}</Card> : null}{previous ? <Card><h2 className="font-semibold">Retry comparison</h2><p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">Your second attempt is kept beside the first so improvement can be judged by clarity and naturalness, not just a score.</p></Card> : null}<div className="flex flex-wrap gap-2"><button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold"><RotateCcw className="size-4" /> Try again</button><Button onClick={onNext}>Continue <ArrowLeft className="ml-2 size-4 rotate-180" /></Button></div></div>; }
function ChoiceGroup({ label, children }: { label: string; children: React.ReactNode }) { return <fieldset className="space-y-2"><legend className="text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-2">{children}</div></fieldset>; }
function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`min-h-10 rounded-md border px-3 text-sm font-semibold ${active ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] hover:border-[var(--foreground)]"}`}>{children}</button>; }
function titleCase(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
type BrowserRecognition = { lang: string; interimResults: boolean; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };
declare global { interface Window { SpeechRecognition?: new () => BrowserRecognition; webkitSpeechRecognition?: new () => BrowserRecognition; } }
