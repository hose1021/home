function formatLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Local calendar date as `YYYY-MM-DD`; never the UTC day from `toISOString`. */
export function todayIso(): string {
  return formatLocal(new Date());
}

/** A stored timestamp as the value a `<input type="date">` expects, in local time. */
export function toDateInput(value: Date | string): string {
  return formatLocal(new Date(value));
}
