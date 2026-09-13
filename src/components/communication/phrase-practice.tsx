"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { CommunicationPhrase, CommunicationPhrasePracticeSession, CommunicationPracticeActivityType } from "@/types/communication";

export function PhrasePractice() {
  const [session, setSession] = useState<CommunicationPhrasePracticeSession | null>(null);
  const [phrases, setPhrases] = useState<CommunicationPhrase[]>([]);
  const [activity, setActivity] = useState<CommunicationPracticeActivityType>("MEANING_RECOGNITION");
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetch("/api/communication/phrase-practice/start", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ limit: 5 }) }).then(async (response) => {
      const data = await response.json() as { session?: CommunicationPhrasePracticeSession; phrases?: CommunicationPhrase[]; error?: string };
      if (!response.ok || !data.session) { setMessage(data.error ?? "Practice could not start."); return; }
      setSession(data.session); setPhrases(data.phrases ?? []); setStarted(true);
    }).catch(() => setMessage("Practice could not start."));
  }, []);
  const current = session ? phrases[session.currentIndex] : undefined;
  async function answerPractice(result: "PASS" | "PARTIAL" | "FAIL") { if (!session || !current) return; const response = await fetch(`/api/communication/phrase-practice/${session.id}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ phraseId: current.id, activityType: activity, result, response: answer }) }); const data = await response.json() as { session?: CommunicationPhrasePracticeSession; error?: string }; if (!response.ok || !data.session) { setMessage(data.error ?? "Answer could not be recorded."); return; } setSession(data.session); setAnswer(""); setMessage(data.session.completed ? "Practice set complete. Your evidence has been recorded." : null); }

  if (!started || message && !session) return <div className="mx-auto max-w-2xl"><Link href="/communication/phrases" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Phrase Bank</Link><Card className="mt-5"><p className="text-sm text-[var(--foreground-muted)]">{message ?? "Loading practice..."}</p></Card></div>;
  if (!current || session?.completed) return <div className="mx-auto max-w-2xl space-y-5"><Link href="/communication/phrases" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Phrase Bank</Link><Card className="py-10 text-center"><Check className="mx-auto size-7" /><h2 className="mt-3 text-xl font-semibold">Nothing due right now</h2><p className="mt-2 text-sm text-[var(--foreground-muted)]">You are caught up. New phrases will return as your evidence develops.</p></Card></div>;
  const activeSession = session!;
  return <div className="mx-auto max-w-2xl space-y-5"><Link href="/communication/phrases" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground-muted)]"><ArrowLeft className="size-4" /> Phrase Bank</Link><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">Phrase practice</p><h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Use the phrase, not just the definition</h1><p className="mt-2 text-sm text-[var(--foreground-muted)]">Phrase {activeSession.currentIndex + 1} of {phrases.length}</p></div><Card className="space-y-6"><div><p className="text-sm font-semibold text-[var(--foreground-muted)]">{activity === "RECALL" ? "Write the phrase that fits this idea" : activity === "NATURAL_USAGE" ? "Use this phrase naturally" : "What does this phrase mean in conversation?"}</p><h2 className="mt-3 text-3xl font-semibold text-[var(--foreground)]">&ldquo;{current.phrase}&rdquo;</h2></div><p className="text-sm leading-6 text-[var(--foreground-muted)]">{current.meaning || "Explain what you think this phrase means."}</p><div className="flex flex-wrap gap-2">{(["MEANING_RECOGNITION", "RECALL", "NATURAL_USAGE"] as const).map((type) => <button type="button" key={type} onClick={() => setActivity(type)} className={`rounded-md border px-3 py-2 text-xs font-semibold ${activity === type ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--border)] text-[var(--foreground)]"}`}>{type === "MEANING_RECOGNITION" ? "Meaning" : type === "RECALL" ? "Recall" : "Natural use"}</button>)}</div>{activity !== "MEANING_RECOGNITION" ? <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={activity === "RECALL" ? "Type the phrase..." : "Write a natural response..."} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm outline-none focus:border-[var(--foreground)]" /> : null}<div className="flex flex-wrap gap-2"><button type="button" onClick={() => void answerPractice("PASS")} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]"><Check className="size-4" /> I understood it</button><button type="button" onClick={() => void answerPractice("PARTIAL")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold">Almost</button><button type="button" onClick={() => void answerPractice("FAIL")} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--border)] px-4 text-sm font-semibold">Need to revisit</button></div>{message ? <p role="status" className="text-sm text-[var(--foreground-muted)]">{message}</p> : null}</Card><p className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]"><RotateCcw className="size-3.5" /> One review is evidence, not mastery.</p></div>;
}
