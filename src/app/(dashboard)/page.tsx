import Link from "next/link";
import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {managementMembers} from "@/core/db/schema/management-members";
import {requireTenantContext} from "@/core/auth/session";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {getDashboardAnnouncement} from "@/modules/announcements/announcement.service";
import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {Badge} from "@/components/ui/badge";
import {hasAnyPermission, hasStaffRole} from "@/core/auth/permissions";
import {
    type Icon,
    IconBell,
    IconBuilding,
    IconCalendarEvent,
    IconCash,
    IconChevronRight,
    IconHome,
    IconReceipt,
    IconTicket,
    IconUsersGroup,
} from "@tabler/icons-react";

export default async function DashboardPage() {
    const {session, tenantId} = await requireTenantContext();
    const canBrowseOwners = hasStaffRole(session.user.roles);
    const canViewFinance = hasAnyPermission(session.user.roles, "finance:read");
    const tenant = await getTenantById(tenantId);
    const dashboardAnnouncement = await getDashboardAnnouncement(tenantId);

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
        <div className="page-shell">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-muted-foreground">Обзор дома</p>
                    <h1 className="page-heading mt-1">Добро пожаловать, {session.user.fullName.split(" ")[0]}</h1>
                    <p className="page-description">Актуальная картина по дому на {new Date().toLocaleDateString("ru", {day: "numeric", month: "long", year: "numeric"})}</p>
                </div>
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground shadow-xs">
                    <IconCalendarEvent className="size-4" />
                    {tenant?.name ?? "MMMC"}
                </div>
            </div>

            {dashboardAnnouncement && (
                <div className={`surface-panel flex gap-4 p-5 ${
                    dashboardAnnouncement.priority === "urgent" ? "border-red-300/70 bg-red-50/80 dark:border-red-900 dark:bg-red-950/20" :
                    dashboardAnnouncement.priority === "high" ? "border-amber-300/70 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/20" :
                    "border-primary/20 bg-primary/5"
                }`}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                        <IconBell className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold">{dashboardAnnouncement.title}</h2>
                            <Badge variant="secondary">Объявление</Badge>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{dashboardAnnouncement.content}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard title="Квартиры" value={String(unitCount?.count ?? 0)} caption="Всего помещений" icon={IconHome} tone="indigo" />
                <DashboardCard title="Собственники" value={String(ownerCount?.count ?? 0)} caption="Активных профилей" icon={IconUsersGroup} tone="cyan" />
                <DashboardCard title="Задолженность" value={`${Number(debtResult?.total ?? 0).toFixed(2)} ₼`} caption="Ожидает оплаты" icon={IconCash} tone="amber" />
                <DashboardCard title="Активные заявки" value={String(ticketCount?.count ?? 0)} caption="На обсуждении" icon={IconTicket} tone="violet" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="surface-panel p-5 sm:p-6">
                    <SectionHeading icon={IconUsersGroup} title="Правление" description="Команда управления домом" />
                    {boardMembers.length > 0 ? (
                        <ul className="mt-5 divide-y divide-border/70">
                            {boardMembers.map((member) => (
                                <li
                                    key={member.userId}
                                    className={
                                        member.role === "commandant"
                                            ? "my-2 flex items-center justify-between gap-4 rounded-lg bg-muted/70 px-3 py-3 text-sm"
                                            : "flex items-center justify-between gap-4 px-3 py-3 text-sm"
                                    }
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-foreground">{getInitials(member.fullName)}</span>
                                        <div className="min-w-0">
                                            {canBrowseOwners ? (
                                                <Link href={`/owners/${member.ownerId}`} className="truncate font-medium hover:text-primary">{member.fullName}</Link>
                                            ) : (
                                                <p className="truncate font-medium">{member.fullName}</p>
                                            )}
                                            {member.entrances && <p className="mt-0.5 text-xs text-muted-foreground">Блок {member.entrances}</p>}
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            member.role === "commandant"
                                                ? "border-0 bg-background text-foreground"
                                                : "border-0 bg-muted text-muted-foreground"
                                        }
                                    >
                                        {member.role === "commandant" ? "Председатель" : "Член правления"}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState text="Состав правления не указан" />
                    )}
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> Комендант</span>
                        <span className="font-medium">{commandant?.fullName ?? "Не назначен"}</span>
                    </div>
                </section>

                <section className="surface-panel p-5 sm:p-6">
                    <SectionHeading icon={IconReceipt} title="Последние платежи" description="Недавние поступления" />
                    {recentPayments.length > 0 ? (
                        <div className="mt-4 divide-y divide-border/70">
                            {recentPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center gap-3 py-3 text-sm">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconCash className="size-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold tabular-nums">{Number(payment.amount).toFixed(2)} ₼</p>
                                        <p className="text-xs text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString("ru", {day: "numeric", month: "short"})}</p>
                                    </div>
                                    <Badge variant="outline">Подтверждён</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState text="Платежей пока нет" />
                    )}
                </section>
            </div>

            <section className="surface-panel p-5 sm:p-6">
                <SectionHeading icon={IconReceipt} title="Последние начисления" description="Недавно выставленные счета" />
                {recentCharges.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {recentCharges.map((charge) => (
                            <div key={charge.id} className="rounded-lg border border-border p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconReceipt className="size-4" /></span>
                                    <Badge variant="outline" className={charge.status === "paid" ? "text-emerald-600" : "text-amber-600"}>{charge.status === "paid" ? "Оплачено" : "К оплате"}</Badge>
                                </div>
                                <p className="mt-4 text-lg font-semibold tabular-nums">{Number(charge.amount).toFixed(2)} ₼</p>
                                <p className="mt-1 text-xs text-muted-foreground">до {new Date(charge.dueDate).toLocaleDateString("ru")}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState text="Начислений пока нет" />
                )}
                {canViewFinance && (
                    <Link href={`/finance`} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        Открыть финансы <IconChevronRight className="size-4" />
                    </Link>
                )}
            </section>
        </div>
    );
}

const toneClasses = {
    indigo: "bg-muted text-foreground",
    cyan: "bg-muted text-foreground",
    amber: "bg-muted text-foreground",
    violet: "bg-muted text-foreground",
};

function DashboardCard({title, value, caption, icon: IconComponent, tone}: {
    title: string;
    value: string;
    caption: string;
    icon: Icon;
    tone: keyof typeof toneClasses;
}) {
    return (
        <div className="surface-panel @container/card bg-gradient-to-t from-primary/5 to-card p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">{value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
                </div>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
                    <IconComponent className="size-5" />
                </span>
            </div>
        </div>
    );
}

function SectionHeading({icon: IconComponent, title, description}: {icon: Icon; title: string; description: string}) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconComponent className="size-4" /></span>
            <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function EmptyState({text}: {text: string}) {
    return <p className="mt-5 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{text}</p>;
}

function getInitials(name: string): string {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("az");
}
