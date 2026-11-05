import {and, desc, eq} from "drizzle-orm";
import {writeAuditLog} from "@/core/audit/audit.service";
import {db} from "@/core/db";
import {adjustments} from "@/core/db/schema/adjustments";
import {charges} from "@/core/db/schema/charges";
import {syncChargeStatus} from "./allocation.service";

export type Adjustment = typeof adjustments.$inferSelect;

export type AdjustmentInput = {
    kind: "credit" | "debit";
    amount: string;
    reason: string;
};

export function validateAdjustmentInput(input: AdjustmentInput): void {
    if (input.kind !== "credit" && input.kind !== "debit") throw new Error("Invalid adjustment kind");
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Adjustment amount must be positive");
    if (!input.reason.trim()) throw new Error("Adjustment reason is required");
}

export async function createAdjustment(
    tenantId: string,
    chargeId: string,
    input: AdjustmentInput,
    userId: string,
): Promise<Adjustment> {
    validateAdjustmentInput(input);

    return db.transaction(async (tx) => {
        const [charge] = await tx
            .select({id: charges.id})
            .from(charges)
            .where(and(eq(charges.id, chargeId), eq(charges.tenantId, tenantId)))
            .limit(1);
        if (!charge) throw new Error("Charge not found");

        const [created] = await tx
            .insert(adjustments)
            .values({
                tenantId,
                chargeId,
                kind: input.kind,
                amount: input.amount,
                reason: input.reason.trim(),
                createdBy: userId,
            })
            .returning();
        if (!created) throw new Error("Failed to create adjustment");

        await syncChargeStatus(tx as unknown as typeof db, tenantId, chargeId);
        await writeAuditLog({
            tenantId,
            userId,
            action: "create",
            entityType: "adjustment",
            entityId: created.id,
            newValues: {chargeId, kind: input.kind, amount: input.amount, reason: input.reason},
        }, tx as unknown as typeof db);

        return created;
    });
}

export async function deleteAdjustment(tenantId: string, adjustmentId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
        const [existing] = await tx
            .select()
            .from(adjustments)
            .where(and(eq(adjustments.id, adjustmentId), eq(adjustments.tenantId, tenantId)))
            .limit(1);
        if (!existing) throw new Error("Adjustment not found");

        await tx.delete(adjustments).where(eq(adjustments.id, adjustmentId));
        await syncChargeStatus(tx as unknown as typeof db, tenantId, existing.chargeId);
        await writeAuditLog({
            tenantId,
            userId,
            action: "delete",
            entityType: "adjustment",
            entityId: adjustmentId,
            oldValues: {chargeId: existing.chargeId, kind: existing.kind, amount: existing.amount},
        }, tx as unknown as typeof db);
    });
}

export async function listAdjustments(tenantId: string, chargeId: string): Promise<Adjustment[]> {
    return db
        .select()
        .from(adjustments)
        .where(and(eq(adjustments.tenantId, tenantId), eq(adjustments.chargeId, chargeId)))
        .orderBy(desc(adjustments.createdAt));
}
