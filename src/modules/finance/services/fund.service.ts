import {and, eq, sql} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {funds} from "@/core/db/schema/funds";

export type FundType = "reserve" | "repair" | "improvement" | "emergency" | "other";

export async function createFund(
  tenantId: string,
  input: { name: string; type: FundType; description?: string; targetAmount?: string },
  userId: string,
) {
  const name = input.name.trim();
  if (!name) throw new Error("Fund name is required");
  if (input.targetAmount !== undefined) {
    const targetAmount = Number(input.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount < 0) throw new Error("Invalid target amount");
  }

  const [fund] = await db.insert(funds).values({
    tenantId,
    name,
    type: input.type,
    description: input.description ?? null,
    targetAmount: input.targetAmount ?? null,
  }).returning();
  if (!fund) throw new Error("Failed to create fund");

  await writeAuditLog({
    tenantId,
    userId,
    action: "create",
    entityType: "fund",
    entityId: fund.id,
    newValues: input as unknown as Record<string, unknown>,
  });

  return fund;
}

/** Single mutation path for a fund balance: adds a positive amount, audited atomically. */
export async function topUpFund(tenantId: string, fundId: string, amount: string, userId: string) {
  const delta = Number(amount);
  if (!Number.isFinite(delta) || delta <= 0) throw new Error("Сумма должна быть положительной");

  return await db.transaction(async (tx) => {
    const [fund] = await tx
      .select({ id: funds.id })
      .from(funds)
      .where(and(eq(funds.id, fundId), eq(funds.tenantId, tenantId)))
      .limit(1);
    if (!fund) throw new Error("Фонд не найден");

    // SQL arithmetic keeps concurrent top-ups atomic (no read-modify-write race).
    const [updated] = await tx
      .update(funds)
      .set({ currentBalance: sql`${funds.currentBalance} + ${delta}` })
      .where(and(eq(funds.id, fundId), eq(funds.tenantId, tenantId)))
      .returning();
    if (!updated) throw new Error("Failed to update fund");

    const newBalance = Number(updated.currentBalance);
    await writeAuditLog({
      tenantId,
      userId,
      action: "update",
      entityType: "fund",
      entityId: fundId,
      oldValues: { currentBalance: (newBalance - delta).toFixed(2) },
      newValues: { currentBalance: updated.currentBalance },
    }, tx as unknown as typeof db);

    return updated;
  });
}
