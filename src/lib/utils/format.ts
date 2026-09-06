export function formatPercent(value: number, signed = false) {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}
