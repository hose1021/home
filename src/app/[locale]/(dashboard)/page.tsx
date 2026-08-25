import {db} from "@/core/db";
import {charges} from "@/core/db/schema/charges";
import {owners, ownerships} from "@/core/db/schema/owners";
import {payments} from "@/core/db/schema/payments";
import {tickets} from "@/core/db/schema/tickets";
import {units} from "@/core/db/schema/units";
import {userRoles, users} from "@/core/db/schema/users";
import {requireTenantContext} from "@/core/auth/session";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {getDashboardAnnouncement} from "@/modules/announcements/announcement.service";
import {and, desc, eq, inArray, sql} from "drizzle-orm";
import {Badge} from "@/components/ui/badge";
import {hasAnyPermission, hasStaffRole} from "@/core/auth/permissions";
import {getTenantOutstandingDebt} from "@/modules/finance/services/payment.service";
import {getActiveCommandant} from "@/modules/commandants/commandant.service";
import {CommandantCard} from "./commandant-card";
import {getTranslations} from "next-intl/server";
import {Link as IntlLink} from "@/i18n/navigation";
import {
    type Icon,
    IconBell,
    IconCalendarEvent,
    IconCash,
    IconChevronRight,
    IconHome,
    IconReceipt,
    IconTicket,
    IconUsersGroup,
} from "@tabler/icons-react";

export default async function DashboardPage() {
    const t = await getTranslations();
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

    const outstandingDebt = await getTenantOutstandingDebt(tenantId);
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
        .orderBy(users.fullName);

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

    // Комендант — отдельная сущность, не обязательно собственник
    const commandant = await getActiveCommandant(tenantId);

    const now = new Date();
    const dateStr = now.toLocaleDateString("ru", {day: "numeric", month: "long", year: "numeric"});

    return (
        <div className="page-shell">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                    <p className="text-sm text-muted-foreground">{t("dashboard.houseOverview")}</p>
                    <h1 className="page-heading mt-1">{t("dashboard.welcome")}, {session.user.fullName.split(" ")[0]}</h1>
                    <p className="page-description">{t("dashboard.currentPicture")} {dateStr}</p>
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
                            <Badge variant="secondary">{t("dashboard.announcement")}</Badge>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{dashboardAnnouncement.content}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardCard title={t("dashboard.units")} value={String(unitCount?.count ?? 0)} caption={t("dashboard.unitsCaption")} icon={IconHome} tone="indigo" />
                <DashboardCard title={t("dashboard.owners")} value={String(ownerCount?.count ?? 0)} caption={t("dashboard.ownersCaption")} icon={IconUsersGroup} tone="cyan" />
                <DashboardCard title={t("dashboard.debt")} value={`${Number(outstandingDebt).toFixed(2)} ${t("common.currency")}`} caption={t("dashboard.debtCaption")} icon={IconCash} tone="amber" />
                <DashboardCard title={t("dashboard.activeTickets")} value={String(ticketCount?.count ?? 0)} caption={t("dashboard.activeTicketsCaption")} icon={IconTicket} tone="violet" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="surface-panel p-5 sm:p-6">
                    <SectionHeading icon={IconUsersGroup} title={t("dashboard.board")} description={t("dashboard.boardDescription")} />
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
                                            {canBrowseOwners && member.ownerId ? (
                                                <IntlLink href={`/owners/${member.ownerId}`} className="truncate font-medium hover:text-primary">{member.fullName}</IntlLink>
                                            ) : (
                                                <p className="truncate font-medium">{member.fullName}</p>
                                            )}
                                            {member.entrances && <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.block")} {member.entrances}</p>}
                                        </div>
                                    </div>
                                    <Badge
                                        className={
                                            member.role === "commandant"
                                                ? "border-0 bg-background text-foreground"
                                                : "border-0 bg-muted text-muted-foreground"
                                        }
                                    >
                                        {member.role === "commandant" ? t("dashboard.chairman") : t("dashboard.boardMember")}
                                    </Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState text={t("dashboard.noBoardMembers")} />
                    )}
                    <CommandantCard
                        commandant={commandant}
                        canBrowseOwners={canBrowseOwners}
                    />
                </section>

                <section className="surface-panel p-5 sm:p-6">
                    <SectionHeading icon={IconReceipt} title={t("dashboard.recentPayments")} description={t("dashboard.recentPaymentsDesc")} />
                    {recentPayments.length > 0 ? (
                        <div className="mt-4 divide-y divide-border/70">
                            {recentPayments.map((payment) => (
                                <div key={payment.id} className="flex items-center gap-3 py-3 text-sm">
                                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconCash className="size-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold tabular-nums">{Number(payment.amount).toFixed(2)} {t("common.currency")}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(payment.paymentDate).toLocaleDateString("ru", {day: "numeric", month: "short"})}</p>
                                    </div>
                                    <Badge variant="outline">{t("dashboard.confirmed")}</Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyState text={t("dashboard.noPayments")} />
                    )}
                </section>
            </div>

            <section className="surface-panel p-5 sm:p-6">
                <SectionHeading icon={IconReceipt} title={t("dashboard.recentCharges")} description={t("dashboard.recentChargesDesc")} />
                {recentCharges.length > 0 ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {recentCharges.map((charge) => (
                            <div key={charge.id} className="rounded-lg border border-border p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconReceipt className="size-4" /></span>
                                    <Badge variant="outline" className={charge.status === "paid" ? "text-emerald-600" : "text-amber-600"}>{charge.status === "paid" ? t("dashboard.paid") : t("dashboard.toPay")}</Badge>
                                </div>
                                <p className="mt-4 text-lg font-semibold tabular-nums">{Number(charge.amount).toFixed(2)} {t("common.currency")}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.dueBy")} {new Date(charge.dueDate).toLocaleDateString("ru")}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState text={t("dashboard.noCharges")} />
                )}
                {canViewFinance && (
                    <IntlLink href="/finance" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        {t("dashboard.openFinance")} <IconChevronRight className="size-4" />
                    </IntlLink>
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
