/** Parse a monetary string/number into whole cents. Throws on non-finite input (NaN, Infinity). */
export function moneyToCents(amount: string | number): number {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents)) throw new Error("Invalid monetary amount");
  return cents;
}
