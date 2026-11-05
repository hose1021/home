import {
    type Icon,
    IconBell,
    IconCalendarEvent,
    IconCash,
    IconChevronRight,
    IconHome,
    IconPhone,
    IconPlus,
    IconReceipt,
    IconTicket,
    IconUsersGroup,
} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";
import {ChargeStatusBadge, PaymentStatusBadge} from "@/components/status-badge";
import {Badge} from "@/components/ui/badge";
import {hasAnyPermission, hasStaffRole} from "@/core/auth/permissions";
import {requireTenantContext} from "@/core/auth/session";
import {Link as IntlLink} from "@/i18n/navigation";
import {getDashboardAnnouncement} from "@/modules/announcements/announcement.service";
import {getDashboardData, getResidentOverview} from "@/modules/dashboard/dashboard.service";
import {getTenantDebtSummary} from "@/modules/finance/services/debt.service";
import {getTenantById} from "@/modules/tenant/tenant.service";
import {CommandantCard} from "./commandant-card";
import {ResidentDashboard} from "./resident-dashboard";

export default async function DashboardPage() {
    const t = await getTranslations();
    const {session, tenantId} = await requireTenantContext();
    const tenant = await getTenantById(tenantId);
    const isStaff = hasStaffRole(session.user.roles);

    if (!isStaff) {
        const overview = await getResidentOverview(tenantId, session.user.id);
        return <ResidentDashboard overview={overview} userName={session.user.fullName} tenantName={tenant?.name ?? "MMMC"} />;
    }

    const canViewFinance = hasAnyPermission(session.user.roles, "finance:read");
    const dashboardAnnouncement = await getDashboardAnnouncement(tenantId);

    const {
        unitCount,
        ownerCount,
        ticketCount,
        recentPayments,
        recentCharges,
        boardMembers,
        commandant,
    } = await getDashboardData(tenantId);
    const {totalDebt} = await getTenantDebtSummary(tenantId);

    const now = new Date();
    const dateStr = now.toLocaleDateString("ru", {day: "numeric", month: "long", year: "numeric"});

    return (
        <div className="page-shell">
            {/* Storefront-style banner: blue light, giant wordmark */}
            <section className="banner px-6 py-8 md:px-9 md:py-10">
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="eyebrow">{t("dashboard.houseOverview")}</p>
                        <h1 className="mt-2 font-heading text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.02em] md:text-[2.5rem]">
                            {t("dashboard.welcome")}, {session.user.fullName.split(" ")[0]}
                        </h1>
                        <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
                            {t("dashboard.currentPicture")} {dateStr}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{tenant?.name ?? "MMMC"}</Badge>
                            <Badge variant="outline">
                                <IconCalendarEvent className="size-3" />
                                {t("nav.houseManagement")}
                            </Badge>
                        </div>
                    </div>
                    <div className="w-full shrink-0 rounded-[4px] border border-border bg-card/50 p-4 backdrop-blur-sm sm:w-72 sm:p-5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.6px] text-muted-foreground">{t("dashboard.commandant")}</p>
                        {commandant ? (
                            <>
                                <p className="mt-2 truncate font-heading text-base font-bold">{commandant.fullName}</p>
                                {commandant.phone ? (
                                    <a href={`tel:${commandant.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-brand-soft">
                                        <IconPhone className="size-4" /> {commandant.phone}
                                    </a>
                                ) : (
                                    <p className="mt-1 text-sm text-muted-foreground">—</p>
                                )}
                            </>
                        ) : (
                            <p className="mt-2 text-sm font-semibold">{t("dashboard.notAssigned")}</p>
                        )}
                        <IntlLink
                            href="/tickets"
                            className="btn-soft mt-4 inline-flex h-9 w-full items-center justify-center gap-2 text-sm font-bold"
                        >
                            <IconPlus className="size-4" /> {t("tickets.createTicket")}
                        </IntlLink>
                    </div>
                </div>
            </section>

            {dashboardAnnouncement && (
                <div className="surface-panel relative flex gap-4 overflow-hidden p-5 pl-6">
                    <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${
                        dashboardAnnouncement.priority === "urgent" ? "bg-danger" :
                        dashboardAnnouncement.priority === "high" ? "bg-warning" :
                        "bg-primary"
                    }`} />
                    <span className="chip size-9 shrink-0 text-primary">
                        <IconBell className="size-4" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-heading text-sm font-bold">{dashboardAnnouncement.title}</h2>
                            <Badge variant="secondary">{t("dashboard.announcement")}</Badge>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{dashboardAnnouncement.content}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard href="/units" title={t("dashboard.units")} value={String(unitCount)} caption={t("dashboard.unitsCaption")} icon={IconHome} tone="text-primary" />
                <StatCard href="/owners" title={t("dashboard.owners")} value={String(ownerCount)} caption={t("dashboard.ownersCaption")} icon={IconUsersGroup} tone="text-brand-soft" />
                <StatCard href="/finance" title={t("dashboard.debt")} value={`${totalDebt.toFixed(2)} ${t("common.currency")}`} caption={t("dashboard.debtCaption")} icon={IconCash} tone="text-gold" amount />
                <StatCard href="/tickets" title={t("dashboard.activeTickets")} value={String(ticketCount)} caption={t("dashboard.activeTicketsCaption")} icon={IconTicket} tone="text-danger" />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="surface-panel overflow-hidden">
                    <PanelHeading icon={IconUsersGroup} title={t("dashboard.board")} description={t("dashboard.boardDescription")} />
                    {boardMembers.length > 0 ? (
                        <ul>
                            {boardMembers.map((member) => (
                                <li
                                    key={member.userId}
                                    className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm transition-colors last:border-0 hover:bg-white/[0.04]"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="chip size-8 shrink-0 font-heading text-xs font-bold">
                                            {getInitials(member.fullName)}
                                        </span>
                                        <div className="min-w-0">
                                            {member.ownerId ? (
                                                <IntlLink href={`/owners/${member.ownerId}`} className="truncate font-semibold transition-colors hover:text-primary">{member.fullName}</IntlLink>
                                            ) : (
                                                <p className="truncate font-semibold">{member.fullName}</p>
                                            )}
                                            {member.entrances && <p className="mt-0.5 text-xs text-muted-foreground">{t("dashboard.block")} {member.entrances}</p>}
                                        </div>
                                    </div>
                                    <Badge variant="outline">{t("dashboard.boardMember")}</Badge>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-5 pb-5"><EmptyState text={t("dashboard.noBoardMembers")} /></div>
                    )}
                    <div className="px-5 pb-5">
                        <CommandantCard
                            commandant={commandant}
                            canBrowseOwners={true}
                        />
                    </div>
                </section>

                <section className="surface-panel overflow-hidden">
                    <PanelHeading icon={IconReceipt} title={t("dashboard.recentPayments")} description={t("dashboard.recentPaymentsDesc")} />
                    {recentPayments.length > 0 ? (
                        <div>
                            {recentPayments.map((payment) => (
                                <IntlLink key={payment.id} href={`/owners/${payment.ownerId}`} className="flex items-center gap-3 border-b border-border/70 px-5 py-3 text-sm transition-colors last:border-0 hover:bg-white/[0.04]">
                                    <span className="chip size-9 shrink-0 font-heading text-[11px] font-bold">
                                        {getInitials(payment.ownerName ?? "—")}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">
                                            {payment.ownerName ?? "—"}
                                            {payment.unitNumber && <span className="font-normal text-muted-foreground"> · {t("resident.unit", {unit: payment.unitNumber})}</span>}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                            {t("resident.period", {month: payment.periodMonth, year: payment.periodYear})} · {t(`finance.payments.paymentMethods.${payment.paymentMethod}`)} · {new Date(payment.paymentDate).toLocaleDateString("ru", {day: "numeric", month: "short"})}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <p className="amount text-[0.95rem] font-semibold">{Number(payment.amount).toFixed(2)} {t("common.currency")}</p>
                                        <PaymentStatusBadge status={payment.status} label={t(`finance.payments.status.${payment.status}`)} />
                                    </div>
                                </IntlLink>
                            ))}
                        </div>
                    ) : (
                        <div className="px-5 pb-5"><EmptyState text={t("dashboard.noPayments")} /></div>
                    )}
                </section>
            </div>

            <section className="surface-panel overflow-hidden">
                <PanelHeading icon={IconReceipt} title={t("dashboard.recentCharges")} description={t("dashboard.recentChargesDesc")} />
                {recentCharges.length > 0 ? (
                    <div className="grid gap-3 px-5 pt-4 pb-5 sm:grid-cols-2 xl:grid-cols-5">
                        {recentCharges.map((charge) => (
                            <div key={charge.id} className="rounded-[4px] border border-border bg-white/[0.02] p-4 transition-colors hover:border-primary/50 hover:bg-white/[0.05]">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="chip size-8 text-muted-foreground"><IconReceipt className="size-4" /></span>
                                    <ChargeStatusBadge status={charge.status} label={t(`finance.charges.status.${charge.status}`)} />
                                </div>
                                <p className="amount mt-4 text-lg font-semibold">{Number(charge.amount).toFixed(2)} {t("common.currency")}</p>
                                <p className="mt-1 truncate text-xs font-medium text-foreground">
                                    {charge.ownerName ?? "—"}
                                    {charge.unitNumber && <span className="font-normal text-muted-foreground"> · {t("resident.unit", {unit: charge.unitNumber})}</span>}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {t("finance.charges.apartmentCharge")} · {t("dashboard.dueBy")} {new Date(charge.dueDate).toLocaleDateString("ru")}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-5 pb-5"><EmptyState text={t("dashboard.noCharges")} /></div>
                )}
                {canViewFinance && (
                    <div className="border-t border-border px-5 py-3">
                        <IntlLink href="/finance" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-brand-soft">
                            {t("dashboard.openFinance")} <IconChevronRight className="size-4" />
                        </IntlLink>
                    </div>
                )}
            </section>
        </div>
    );
}

function StatCard({href, title, value, caption, icon: IconComponent, tone, amount}: {
    href: string;
    title: string;
    value: string;
    caption: string;
    icon: Icon;
    tone: string;
    amount?: boolean;
}) {
    return (
        <IntlLink href={href} className="surface-panel surface-panel--hover group p-5">
            <div className="flex items-start justify-between gap-3">
                <p className="micro-label">{title}</p>
                <span className={`chip size-8 shrink-0 ${tone}`}>
                    <IconComponent className="size-4" />
                </span>
            </div>
            <p className={`mt-4 text-[1.65rem] font-bold leading-none tabular-nums ${amount ? "amount" : "font-heading"}`}>{value}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xs leading-relaxed text-muted-foreground">{caption}</p>
                <IconChevronRight className="size-4 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-primary" />
            </div>
        </IntlLink>
    );
}

function PanelHeading({icon: IconComponent, title, description}: {icon: Icon; title: string; description: string}) {
    return (
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <span className="chip size-8 shrink-0 text-primary"><IconComponent className="size-4" /></span>
            <div className="min-w-0">
                <h2 className="truncate font-heading text-sm font-bold">{title}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function EmptyState({text}: {text: string}) {
    return <p className="empty-slot text-xs">{text}</p>;
}

function getInitials(name: string): string {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("az");
}
