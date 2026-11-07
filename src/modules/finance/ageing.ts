/** Debt-ageing vocabulary and thresholds. Pure: the service, the debtors table and the report share it. */
export const AGE_BUCKET_KEYS = ["notDue", "days1to30", "days31to60", "days61to90", "over90"] as const;
export type AgeingBucket = (typeof AGE_BUCKET_KEYS)[number];
export type AgeingBuckets = Record<AgeingBucket, number>;

export function ageBucket(daysOverdue: number): AgeingBucket {
  if (daysOverdue <= 0) return "notDue";
  if (daysOverdue <= 30) return "days1to30";
  if (daysOverdue <= 60) return "days31to60";
  if (daysOverdue <= 90) return "days61to90";
  return "over90";
}
