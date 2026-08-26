/** Parse a monetary string/number into whole cents. Throws on non-finite input (NaN, Infinity). */
export function moneyToCents(amount: string | number): number {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents)) throw new Error("Invalid monetary amount");
  return cents;
}

/** Sum monetary row amounts into whole cents. */
export function sumMoneyCents(rows: ReadonlyArray<{amount: string}>): number {
  let total = 0;
  for (const row of rows) {
    total += moneyToCents(row.amount);
  }
  return total;
}

/** Format whole cents as a fixed two-decimal string. */
export function formatMoney(cents: number): string {
  return (cents / 100).toFixed(2);
}
