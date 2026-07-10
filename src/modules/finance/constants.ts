export const INCOME_ACCOUNT_CODES = ["4010", "4020", "4030", "4040", "4050", "4090"] as const;

export const EXPENSE_ACCOUNT_CODES = [
  "5010", "5011", "5012", "5020", "5030", "5040",
  "5050", "5060", "5070", "5080", "5090", "5100",
  "5990", "5991", "3020",
] as const;

export function isIncomeCode(code: string): boolean {
  return (INCOME_ACCOUNT_CODES as readonly string[]).includes(code);
}

export function isExpenseCode(code: string): boolean {
  return (EXPENSE_ACCOUNT_CODES as readonly string[]).includes(code);
}
