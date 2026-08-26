import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";

export type BoardMember = {
    userId: string;
    ownerId: string | null;
    fullName: string;
    role: "management_member" | "commandant";
    entrances: string;
};

export type RecentPayment = {
    id: string;
    amount: string;
    paymentDate: Date;
    status: "confirmed" | "rejected" | "refunded";
};

export type RecentCharge = {
    id: string;
    amount: string;
    dueDate: string;
    status: "pending" | "paid" | "partially_paid" | "overdue" | "cancelled";
};

export type DashboardData = {
    unitCount: number;
    ownerCount: number;
    ticketCount: number;
    recentPayments: RecentPayment[];
    recentCharges: RecentCharge[];
    boardMembers: BoardMember[];
};

/** Dedupe users (commandant-role row wins) and rank commandant first. Pure, no DB. */
export function rankBoardMembers(rows: BoardMember[]): BoardMember[] {
    const boardMap = new Map<string, BoardMember>();
    for (const row of rows) {
        const existing = boardMap.get(row.userId);
        if (!existing || row.role === "commandant") {
            boardMap.set(row.userId, row);
        }
    }
    return [...boardMap.values()].sort((a, b) =>
        (b.role === "commandant" ? 1 : 0) - (a.role === "commandant" ? 1 : 0),
    );
}

export async function getDashboardData(tenantId: string): Promise<DashboardData> {
    const [unitCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(units)
        .where(eq(units.tenantId, tenantId));

    const [ownerCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(owners)
        .where(eq(owners.tenantId, tenantId));

    const [ticketCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(tickets)
        .where(and(eq(tickets.tenantId, tenantId), eq(tickets.status, "pending")));

    const recentPayments = await db
        .select({
            id: payments.id,
            amount: payments.amount,
            paymentDate: payments.paymentDate,
            status: payments.status,
        })
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.paymentDate))
        .limit(5);

    const recentCharges = await db
        .select({
            id: charges.id,
            amount: charges.amount,
            dueDate: charges.dueDate,
            status: charges.status,
        })
        .from(charges)
        .where(eq(charges.tenantId, tenantId))
        .orderBy(desc(charges.createdAt))
        .limit(5);

    const boardRows = (await db
        .select({
            userId: users.id,
            ownerId: owners.id,
            fullName: users.fullName,
            role: userRoles.role,
            entrances: sql<string>`coalesce(string_agg(distinct ${units.entrance}::text, ', '), '')`,
        })
        .from(users)
        .innerJoin(
            userRoles,
            and(
                eq(userRoles.userId, users.id),
                eq(userRoles.scopeTenantId, tenantId),
            ),
        )
        .leftJoin(
            owners,
            and(eq(owners.userId, users.id), eq(owners.tenantId, tenantId)),
        )
        .leftJoin(
            ownerships,
            and(eq(ownerships.ownerId, owners.id), eq(ownerships.tenantId, tenantId)),
        )
        .leftJoin(
            units,
            and(eq(units.id, ownerships.unitId), eq(units.tenantId, tenantId)),
        )
        .where(and(
            eq(users.tenantId, tenantId),
            eq(users.isActive, true),
            inArray(userRoles.role, ["management_member", "commandant"]),
        ))
        .groupBy(users.id, owners.id, userRoles.role)
        .orderBy(users.fullName)) as unknown as BoardMember[];

    return {
        unitCount: unitCount?.count ?? 0,
        ownerCount: ownerCount?.count ?? 0,
        ticketCount: ticketCount?.count ?? 0,
        recentPayments,
        recentCharges,
        boardMembers: rankBoardMembers(boardRows),
    };
}
