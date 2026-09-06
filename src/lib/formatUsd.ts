/** Parse a backend USD amount (number or decimal string). */
export function parseUsd(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

const usdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

/** Format a USD amount, keeping small model costs visible. */
export function formatUsd(value: unknown): string | null {
  const amount = parseUsd(value);
  if (amount === null) return null;
  return usdFormat.format(amount);
}
