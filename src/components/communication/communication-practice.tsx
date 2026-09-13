import { ArrowRight, Brain, MessageCircle, PenLine } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { communicationModules } from "./communication-fixtures";

const icons = { conversation: MessageCircle, explain: PenLine, meaning: Brain };

export function CommunicationPractice() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {communicationModules.map((module) => {
        const Icon = icons[module.id];
        return (
          <Card key={module.id} className="flex min-h-64 flex-col">
            <div className="flex size-10 items-center justify-center rounded-md bg-[var(--foreground)] text-[var(--background)]"><Icon aria-hidden="true" className="size-5" /></div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--foreground)]">{module.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--foreground-muted)]">{module.description}</p>
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold text-[var(--foreground-muted)]">{module.support}</p>
              {module.id === "conversation" ? <Link href="/communication/practice/conversation" className="mt-3 inline-flex min-h-10 w-full items-center justify-between rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]">{module.actionLabel} <ArrowRight aria-hidden="true" className="size-4" /></Link> : module.id === "explain" ? <Link href="/communication/practice/explain" className="mt-3 inline-flex min-h-10 w-full items-center justify-between rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]">{module.actionLabel} <ArrowRight aria-hidden="true" className="size-4" /></Link> : <Link href="/communication/practice/meaning" className="mt-3 inline-flex min-h-10 w-full items-center justify-between rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]">{module.actionLabel} <ArrowRight aria-hidden="true" className="size-4" /></Link>}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
