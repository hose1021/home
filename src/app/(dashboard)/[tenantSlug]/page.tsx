import Link from "next/link";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {managementMembers} from "@/core/db/schema/management-members";
import {ensureTenantExists} from "@/core/multi-tenant";
import {and, eq, inArray, sql} from "drizzle-orm";
import {Badge} from "@/components/ui/badge";

export default async function DashboardPage({
                                                params,
                                            }: {
    params: Promise<{ tenantSlug: string }>;
}) {
    const {tenantSlug} = await params;
    const tenantId = await ensureTenantExists(tenantSlug);

    const [unitCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(units)
        .where(eq(units.tenantId, tenantId));

    const [ownerCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(owners)
        .where(eq(owners.tenantId, tenantId));

    const [debtResult] = await db
        .select({ total: sql<string>`coalesce(sum(${charges.amount}::numeric), 0)` })
        .from(charges)
        .where(and(eq(charges.tenantId, tenantId), eq(charges.status, "pending")));

    const [ticketCount] = await db
        .select({count: sql<number>`count(*)`})
        .from(tickets)
        .where(and(eq(tickets.tenantId, tenantId), eq(tickets.status, "open")));

    const recentPayments = await db
        .select({
            id: payments.id,
            amount: payments.amount,
            paymentDate: payments.paymentDate,
            status: payments.status,
        })
        .from(payments)
        .where(eq(payments.tenantId, tenantId))
        .orderBy(payments.paymentDate)
        .limit(5);

    // Board members (management_member + commandant), chairman marked separately
    const boardRows = await db
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
        .innerJoin(
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
        .orderBy(users.fullName);

    // Deduplicate: if a user has both roles, prefer commandant
    const boardMap = new Map<string, typeof boardRows[0]>();
    for (const row of boardRows) {
        const existing = boardMap.get(row.userId);
        if (!existing || row.role === "commandant") {
            boardMap.set(row.userId, row);
        }
    }
    const boardMembers = [...boardMap.values()].sort((a, b) =>
        (b.role === "commandant" ? 1 : 0) - (a.role === "commandant" ? 1 : 0),
    );

    // Комендант (строительный менеджер, не собственник)
    const [commandant] = await db
        .select({fullName: managementMembers.fullName})
        .from(managementMembers)
        .where(and(
            eq(managementMembers.tenantId, tenantId),
            eq(managementMembers.isActive, true),
        ))
        .limit(1);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Дашборд</h1>
                <p className="text-sm text-zinc-500">Pilot Residence</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard title="Всего квартир" value={String(unitCount?.count ?? 0)}/>
                <DashboardCard title="Собственников" value={String(ownerCount?.count ?? 0)}/>
                <DashboardCard title="Задолженность" value={`${Number(debtResult?.total ?? 0).toFixed(2)} ₼`}/>
                <DashboardCard title="Активные заявки" value={String(ticketCount?.count ?? 0)}/>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="mb-3 text-sm font-semibold">Правление</h2>
                    {boardMembers.length > 0 ? (
                        <ul className="space-y-2">
                            {boardMembers.map((member) => (
                                <li
                                    key={member.userId}
                                    className={
                                        member.role === "commandant"
                                            ? "flex items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-700 dark:bg-amber-950/30"
                                            : "flex items-center justify-between gap-4 px-3 py-2 text-sm"
                                    }
                                >
                                    <Link href={`/${tenantSlug}/owners/${member.ownerId}`} className="hover:underline">
                                        <span className="font-medium">{member.fullName}</span>
                                        {member.entrances &&
                                            <span className="text-zinc-500"> (Блок {member.entrances})</span>}
                                    </Link>
                                    <Badge
                                        className={
                                            member.role === "commandant"
                                                ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
                                                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                        }
                                    >
                                        {member.role === "commandant" ? "Председатель" : "Член правления"}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-zinc-400">Состав правления не указан</p>
                    )}
                </div>

                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="mb-3 text-sm font-semibold">Комендант</h2>
                    {commandant ? (
                        <div className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="font-medium">{commandant.fullName}</span>
                            <span
                                className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                Комендант
                            </span>
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-400">Не назначен</p>
                    )}
                </div>

                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="mb-3 text-sm font-semibold">Последние платежи</h2>
                    {recentPayments.length > 0 ? (
                        <div className="space-y-2">
                            {recentPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center justify-between text-sm">
                                    <span
                                        className="text-zinc-500">{new Date(payment.paymentDate).toLocaleDateString("ru")}</span>
                                    <span className="font-medium">{payment.amount} ₼</span>
                                    <span className="text-xs text-green-600">{payment.status}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-zinc-400">Нет данных</p>
                    )}
                </div>

                <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <h2 className="mb-3 text-sm font-semibold">Последние начисления</h2>
                    <p className="text-sm text-zinc-400">Нет данных</p>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({title, value}: { title: string; value: string }) {
    return (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-sm text-zinc-500">{title}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
    );
}
