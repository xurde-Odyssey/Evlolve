import { getCalendarMonth, getSundayToSaturdayWeek, isEvidenceInWindow } from "../aggregation/date-windows";
import type { LifetimeXpSummary, XpTransaction } from "../types";

export function appendXpTransactions(
  ledger: readonly XpTransaction[],
  transactions: readonly (XpTransaction | null)[],
) {
  const existingKeys = new Set(ledger.map((transaction) => transaction.id));
  const existingSources = new Set(
    ledger.map((transaction) => `${transaction.sourceType}:${transaction.sourceId}:${transaction.category}:${transaction.policyVersion}`),
  );
  const next = [...ledger];

  for (const transaction of transactions) {
    if (!transaction || transaction.amount < 0) {
      continue;
    }

    const sourceKey = `${transaction.sourceType}:${transaction.sourceId}:${transaction.category}:${transaction.policyVersion}`;
    if (existingKeys.has(transaction.id) || existingSources.has(sourceKey)) {
      continue;
    }

    existingKeys.add(transaction.id);
    existingSources.add(sourceKey);
    next.push(transaction);
  }

  return next;
}

export function summarizeLifetimeXp(
  ledger: readonly XpTransaction[],
  anchorDate: string | Date,
): LifetimeXpSummary {
  const week = getSundayToSaturdayWeek(anchorDate);
  const month = getCalendarMonth(anchorDate);
  const totalLifetimeXp = sumXp(ledger);
  const xpThisWeek = sumXp(ledger.filter((transaction) => isEvidenceInWindow(transaction.occurredAt, week)));
  const xpThisMonth = sumXp(ledger.filter((transaction) => isEvidenceInWindow(transaction.occurredAt, month)));

  return {
    totalLifetimeXp,
    xpThisWeek,
    xpThisMonth,
    executionXp: sumByCategory(ledger, "EXECUTION"),
    consistencyXp: sumByCategory(ledger, "CONSISTENCY"),
    bossXp: sumByCategory(ledger, "BOSS"),
    progressionXp: sumByCategory(ledger, "PROGRESSION") + sumByCategory(ledger, "RECOVERY_MILESTONE"),
    achievementXp: sumByCategory(ledger, "ACHIEVEMENT"),
    monthlyCommitmentXp: sumByCategory(ledger, "MONTHLY_COMMITMENT"),
  };
}

function sumByCategory(ledger: readonly XpTransaction[], category: XpTransaction["category"]) {
  return sumXp(ledger.filter((transaction) => transaction.category === category));
}

function sumXp(ledger: readonly XpTransaction[]) {
  return ledger.reduce((total, transaction) => total + Math.max(0, transaction.amount), 0);
}
