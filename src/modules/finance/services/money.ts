/** Parse a monetary string/number into whole cents. Throws on non-finite input (NaN, Infinity). */
export function moneyToCents(amount: string | number): number {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents)) throw new Error("Invalid monetary amount");
  return cents;
}

/** Whole cents as the decimal number that aggregates and screens use. */
export function centsToMoney(cents: number): number {
  return cents / 100;
}

/** Whole cents as a decimal string for a `numeric(12,2)` column. */
export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** One apartment's monthly charge: area × tariff, in whole cents. */
export function monthlyFeeCents(area: string | number, tariffPerSqm: string | number): number {
  return moneyToCents(Number(area) * Number(tariffPerSqm));
}
