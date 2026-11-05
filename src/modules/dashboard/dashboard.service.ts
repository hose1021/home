import {and, desc, eq, sql} from "drizzle-orm";
import type {CommandantInfo} from "@/app/[locale]/(dashboard)/commandant-card";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {listAnnouncements, type Announcement} from "@/modules/announcements/announcement.service";
import {getActiveCommandant} from "@/modules/commandants/commandant.service";
import {listChargesForOwner, type OwnerCharge} from "@/modules/finance/services/charge.service";
import {getOwnerDetail, type OwnerDetail} from "@/modules/owner/owner.service";

export type BoardMember = {
    userId: string;
    ownerId: string | null;
    fullName: string;
    entrances: string;
};

export type RecentPayment = {
    id: string;
    ownerId: string;
    ownerName: string | null;
    unitNumber: string | null;
    amount: string;
    paymentDate: Date;
    paymentMethod: string;
    periodYear: number;
    periodMonth: number;
    status: "confirmed" | "rejected" | "refunded";
};

export type RecentCharge = {
    id: string;
    amount: string;
    dueDate: string;
    status: "pending" | "paid" | "partially_paid" | "overdue" | "cancelled";
    ownerName: string | null;
    unitNumber: string | null;
};

export type ResidentOverview = {
    owner: {id: string; fullName: string} | null;
    units: OwnerDetail["units"];
    grandDebt: number;
    totalMonthlyFee: number;
    payments: OwnerDetail["payments"];
    charges: OwnerCharge[];
    boardMembers: BoardMember[];
    commandant: CommandantInfo | null;
    announcements: Announcement[];
};

export type DashboardData = {
    unitCount: number;
    ownerCount: number;
    ticketCount: number;
    recentPayments: RecentPayment[];
    recentCharges: RecentCharge[];
    boardMembers: BoardMember[];
    commandant: CommandantInfo | null;
};

/** Dedupe board members — one row per user, first row wins. Pure, no DB. */
export function rankBoardMembers(rows: BoardMember[]): BoardMember[] {
    const seen = new Map<string, BoardMember>();
    for (const row of rows) {
        if (!seen.has(row.userId)) seen.set(row.userId, row);
    }
    return [...seen.values()];
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
            ownerId: payments.ownerId,
            ownerName: owners.fullName,
            unitNumber: units.unitNumber,
            amount: payments.amount,
            paymentDate: payments.paymentDate,
            paymentMethod: payments.paymentMethod,
            periodYear: payments.periodYear,
            periodMonth: payments.periodMonth,
            status: payments.status,
        })
        .from(payments)
        .leftJoin(owners, and(eq(owners.id, payments.ownerId), eq(owners.tenantId, tenantId)))
        .leftJoin(units, and(eq(units.id, payments.unitId), eq(units.tenantId, tenantId)))
        .where(eq(payments.tenantId, tenantId))
        .orderBy(desc(payments.paymentDate))
        .limit(6);

    const recentChargeRows = await db
        .select({
            id: charges.id,
            amount: charges.amount,
            dueDate: charges.dueDate,
            status: charges.status,
            periodYear: charges.periodYear,
            periodMonth: charges.periodMonth,
            ownerName: owners.fullName,
            unitNumber: units.unitNumber,
        })
        .from(charges)
        .leftJoin(owners, and(eq(owners.id, charges.ownerId), eq(owners.tenantId, tenantId)))
        .leftJoin(units, and(eq(units.id, charges.unitId), eq(units.tenantId, tenantId)))
        .where(eq(charges.tenantId, tenantId))
        .orderBy(desc(charges.createdAt))
        .limit(40);

    const chargeGroups = new Map<string, RecentCharge>();
    for (const row of recentChargeRows) {
        if (row.status === "cancelled") continue;
        const key = `${row.unitNumber ?? ""}|${row.periodYear}-${row.periodMonth}`;
        const group = chargeGroups.get(key);
        if (!group) {
            chargeGroups.set(key, {...row});
            continue;
        }
        group.amount = (Number(group.amount) + Number(row.amount)).toFixed(2);
        if (row.dueDate < group.dueDate) group.dueDate = row.dueDate;
        if (row.status === "overdue") group.status = "overdue";
    }
    const recentCharges = [...chargeGroups.values()].slice(0, 5);

    return {
        unitCount: unitCount?.count ?? 0,
        ownerCount: ownerCount?.count ?? 0,
        ticketCount: ticketCount?.count ?? 0,
        recentPayments,
        recentCharges,
        boardMembers: await getBoardMembers(tenantId),
        commandant: await getActiveCommandant(tenantId),
    };
}

async function getBoardMembers(tenantId: string): Promise<BoardMember[]> {
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
            eq(userRoles.role, "management_member"),
        ))
        .groupBy(users.id, owners.id, userRoles.role)
        .orderBy(users.fullName)) as unknown as BoardMember[];
    return rankBoardMembers(boardRows);
}

/** Resident read-model: own debt, units, payments, charges, house news and board contacts. */
export async function getResidentOverview(tenantId: string, userId: string): Promise<ResidentOverview> {
    const [ownerRow] = await db
        .select({id: owners.id, fullName: users.fullName})
        .from(owners)
        .innerJoin(users, eq(users.id, owners.userId))
        .where(and(eq(owners.tenantId, tenantId), eq(owners.userId, userId)))
        .limit(1);

    const [detail, ownerCharges, boardMembers, commandant, announcements] = await Promise.all([
        ownerRow ? getOwnerDetail(tenantId, ownerRow.id) : Promise.resolve(null),
        ownerRow ? listChargesForOwner(tenantId, ownerRow.id) : Promise.resolve([]),
        getBoardMembers(tenantId),
        getActiveCommandant(tenantId),
        listAnnouncements(tenantId),
    ]);

    return {
        owner: ownerRow ?? null,
        units: detail?.units ?? [],
        grandDebt: detail?.grandDebt ?? 0,
        totalMonthlyFee: detail?.totalMonthlyFee ?? 0,
        payments: detail?.payments.slice(0, 6) ?? [],
        charges: ownerCharges,
        boardMembers,
        commandant,
        announcements: announcements.slice(0, 4),
    };
}
