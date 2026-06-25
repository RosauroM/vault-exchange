export function formatUSD(cents: number | bigint): string {
  const n = typeof cents === "bigint" ? Number(cents) : cents;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n / 100);
}

export function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatShares(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
