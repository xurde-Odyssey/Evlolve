export function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 3) {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

export function sum(values: readonly number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: readonly number[]) {
  return values.length === 0 ? null : sum(values) / values.length;
}

export function median(values: readonly number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[midpoint] ?? null;
  }

  return ((sorted[midpoint - 1] ?? 0) + (sorted[midpoint] ?? 0)) / 2;
}

export function trimmedMean(values: readonly number[]) {
  if (values.length === 0) {
    return null;
  }

  if (values.length < 5) {
    return average(values);
  }

  const sorted = [...values].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length * 0.1));
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);

  return average(trimmed.length > 0 ? trimmed : sorted);
}

export function winsorizedValues(values: readonly number[]) {
  if (values.length < 5) {
    return [...values];
  }

  const sorted = [...values].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.1)] ?? sorted[0] ?? 0;
  const high = sorted[Math.ceil(sorted.length * 0.9) - 1] ?? sorted.at(-1) ?? 0;

  return values.map((value) => Math.min(Math.max(value, low), high));
}

export function robustCenter(values: readonly number[]) {
  if (values.length === 0) {
    return null;
  }

  const center = median(values);
  const trimmed = trimmedMean(winsorizedValues(values));

  if (center === null) {
    return trimmed;
  }

  if (trimmed === null) {
    return center;
  }

  return (center * 0.65) + (trimmed * 0.35);
}

export function robustVolatility(values: readonly number[]) {
  if (values.length < 2) {
    return null;
  }

  const center = median(values);

  if (center === null || center === 0) {
    return null;
  }

  const deviations = values.map((value) => Math.abs(value - center));
  const medianDeviation = median(deviations);

  if (medianDeviation === null) {
    return null;
  }

  return round(medianDeviation / Math.abs(center), 3);
}

export function splitHalfComparison(values: readonly number[]) {
  if (values.length < 4) {
    return null;
  }

  const midpoint = Math.floor(values.length / 2);
  const previous = robustCenter(values.slice(0, midpoint));
  const current = robustCenter(values.slice(midpoint));

  if (previous === null || current === null || previous === 0) {
    return null;
  }

  return {
    previous,
    current,
    relativeChange: (current - previous) / Math.abs(previous),
  };
}
