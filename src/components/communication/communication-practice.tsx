import { ArrowRight, BookOpen, Brain, MessageCircle, PenLine } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { communicationModules } from "./communication-fixtures";

const icons = { conversation: MessageCircle, explain: PenLine, meaning: Brain, "phrase-practice": BookOpen };

export function CommunicationPractice() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {communicationModules.map((module) => {
        const Icon = icons[module.id];
        return (
          <Card key={module.id} className="flex min-h-64 flex-col">
            <div className="flex size-10 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-[var(--shadow-soft)]"><Icon aria-hidden="true" className="size-5 text-[var(--foreground)]" strokeWidth={2.2} /></div>
            <h2 className="mt-5 text-lg font-semibold text-[var(--foreground)]">{module.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--foreground-muted)]">{module.description}</p>
            <div className="mt-5 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold text-[var(--foreground-muted)]">{module.support}</p>
              <Link href={module.id === "conversation" ? "/communication/practice/conversation" : module.id === "explain" ? "/communication/practice/explain" : module.id === "meaning" ? "/communication/practice/meaning" : "/communication/phrases/practice"} className="mt-3 inline-flex min-h-10 w-full items-center justify-between rounded-md border border-[var(--border)] px-3 text-sm font-semibold text-[var(--foreground)] transition-[box-shadow,border-color] hover:border-[var(--foreground-muted)] hover:shadow-[var(--shadow-soft)]">{module.actionLabel} <ArrowRight aria-hidden="true" className="size-4" /></Link>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
