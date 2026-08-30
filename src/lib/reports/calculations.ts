export function calculateTotal(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function calculateAverage(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return calculateTotal(values) / values.length;
}

export function calculateVariance(actual: number, target: number) {
  return actual - target;
}

export function calculateVariancePercent(actual: number, target: number) {
  if (target === 0) {
    return null;
  }

  return (calculateVariance(actual, target) / target) * 100;
}

export function calculatePercentageChange(current: number, previous: number) {
  if (previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

export function calculateBookCompletionDays(startedAt: string, finishedAt?: string) {
  if (!finishedAt) {
    return null;
  }

  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();

  if (!Number.isFinite(started) || !Number.isFinite(finished)) {
    return null;
  }

  return Math.max(Math.round((finished - started) / 86_400_000), 0);
}

export function roundTo(value: number, decimals = 1) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}
