import {
    IconBell,
    IconBuilding,
    IconCash,
    IconChevronRight,
    IconHome,
    IconReceipt,
    IconTicket,
    IconUsersGroup,
} from "@tabler/icons-react";
import {getTranslations} from "next-intl/server";
import {ChargeStatusBadge, PaymentStatusBadge} from "@/components/status-badge";
import {Link} from "@/i18n/navigation";
import type {ResidentOverview} from "@/modules/dashboard/dashboard.service";

const dateFmt = new Intl.DateTimeFormat("ru", {day: "numeric", month: "long", year: "numeric"});
const shortDateFmt = new Intl.DateTimeFormat("ru", {day: "numeric", month: "short"});

function money(value: number | string, currency: string) {
    return `${Number(value).toFixed(2)} ${currency}`;
}

export async function ResidentDashboard({overview, userName, tenantName}: {
    overview: ResidentOverview;
    userName: string;
    tenantName: string;
}) {
    const t = await getTranslations();
    const currency = t("common.currency");
    const {owner, units, grandDebt, totalMonthlyFee, payments, charges, boardMembers, commandant, announcements} = overview;
    const firstName = userName.split(" ")[0] ?? userName;
    const ownerHref = owner ? `/owners/${owner.id}` : "/settings";

    return (
        <div className="page-shell">
            <section className="banner px-6 py-8 md:px-9 md:py-10">
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <p className="eyebrow">{t("resident.houseOverview")} · {dateFmt.format(new Date())}</p>
                        <h1 className="mt-2 font-heading text-[1.9rem] font-extrabold leading-[1.1] tracking-[-0.02em] md:text-[2.5rem]">
                            {t("resident.greeting", {name: firstName})}
                        </h1>
                        <p className="mt-2.5 max-w-lg text-sm leading-6 text-muted-foreground">
                            {t("resident.subtitle")}
                        </p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            <Link href={ownerHref} className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[var(--action)] px-6 text-base font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.24)] transition-shadow hover:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.36)]">
                                {t("resident.myCharges")} <IconChevronRight className="size-4" />
                            </Link>
                            <Link href="/tickets" className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-white/[0.12] px-6 text-base font-bold transition-colors hover:bg-white/[0.18] dark:bg-white/[0.12]">
                                {t("resident.createTicket")}
                            </Link>
                        </div>
                    </div>
                    <div className="shrink-0 rounded-[4px] border border-border bg-white/[0.04] px-5 py-4 backdrop-blur-sm sm:px-7 sm:py-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.6px] text-muted-foreground">{t("resident.debt")}</p>
                        <p className={`amount mt-1 text-[2rem] font-bold leading-none ${grandDebt > 0 ? "text-danger" : "text-success"}`}>
                            {money(grandDebt, currency)}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t("resident.monthlyFee")}: <span className="amount font-semibold text-foreground">{money(totalMonthlyFee, currency)}</span>
                        </p>
                    </div>
                </div>
            </section>

            {!owner && (
                <div className="surface-panel px-5 py-4 text-sm text-muted-foreground">
                    {t("resident.noProfile")}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="surface-panel p-5">
                    <div className="flex items-start justify-between gap-3">
                        <p className="micro-label">{t("resident.myUnits")}</p>
                        <span className="chip size-8 shrink-0 text-primary"><IconHome className="size-4" /></span>
                    </div>
                    <p className="mt-4 font-heading text-[1.65rem] font-bold leading-none">{units.length}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{tenantName}</p>
                </div>
                <div className="surface-panel p-5">
                    <div className="flex items-start justify-between gap-3">
                        <p className="micro-label">{t("resident.monthlyFee")}</p>
                        <span className="chip size-8 shrink-0 text-gold"><IconCash className="size-4" /></span>
                    </div>
                    <p className="amount mt-4 text-[1.65rem] font-bold leading-none">{money(totalMonthlyFee, currency)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{t("resident.totalArea", {area: units.reduce((sum, u) => sum + Number(u.area), 0).toFixed(1)})}</p>
                </div>
                <div className="surface-panel p-5">
                    <div className="flex items-start justify-between gap-3">
                        <p className="micro-label">{t("resident.myCharges")}</p>
                        <span className="chip size-8 shrink-0 text-success"><IconReceipt className="size-4" /></span>
                    </div>
                    <p className="mt-4 font-heading text-[1.65rem] font-bold leading-none">{charges.length}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{t("resident.openCharges")}</p>
                </div>
            </div>

            {units.length > 0 && (
                <div className="surface-panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                        <span className="chip size-8 shrink-0 text-primary"><IconBuilding className="size-4" /></span>
                        <h2 className="font-heading text-sm font-bold">{t("resident.myUnits")}</h2>
                    </div>
                    <ul>
                        {units.map((unit) => (
                            <li key={unit.id} className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                <div className="min-w-0">
                                    <p className="font-semibold">{t("resident.unit", {unit: unit.unitNumber})}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {t("resident.entrance", {entrance: unit.entrance, floor: unit.floor})} · {unit.area} м²
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="amount text-sm font-semibold">{money(unit.monthlyFee, currency)}</p>
                                    {unit.totalDebt > 0 && (
                                        <p className="mt-0.5 text-xs font-semibold text-danger">{t("resident.debtShort")}: {money(unit.totalDebt, currency)}</p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="grid gap-5 xl:grid-cols-2">
                <section className="surface-panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                        <span className="chip size-8 shrink-0 text-success"><IconCash className="size-4" /></span>
                        <h2 className="font-heading text-sm font-bold">{t("resident.myPayments")}</h2>
                        <Link href={ownerHref} className="ml-auto text-xs font-bold text-primary hover:text-brand-soft">{t("resident.openAll")}</Link>
                    </div>
                    {payments.length > 0 ? (
                        <ul>
                            {payments.map((payment) => (
                                <li key={payment.id} className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <div className="min-w-0">
                                        <p className="amount font-semibold">{money(payment.amount, currency)}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {t("resident.period", {month: payment.periodMonth, year: payment.periodYear})} · {t(`finance.payments.paymentMethods.${payment.paymentMethod}`)} · {shortDateFmt.format(payment.paymentDate)}
                                        </p>
                                    </div>
                                    <PaymentStatusBadge status={payment.status} label={t(`finance.payments.status.${payment.status}`)} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="m-5 empty-slot text-xs">{t("resident.noPayments")}</p>
                    )}
                </section>

                <section className="surface-panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                        <span className="chip size-8 shrink-0 text-primary"><IconReceipt className="size-4" /></span>
                        <h2 className="font-heading text-sm font-bold">{t("resident.myCharges")}</h2>
                        <Link href={ownerHref} className="ml-auto text-xs font-bold text-primary hover:text-brand-soft">{t("resident.openAll")}</Link>
                    </div>
                    {charges.length > 0 ? (
                        <ul>
                            {charges.map((charge) => (
                                <li key={charge.id} className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <div className="min-w-0">
                                        <p className="amount font-semibold">{money(charge.amount, currency)}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {charge.unitNumber ? `${t("resident.unit", {unit: charge.unitNumber})} · ` : ""}
                                            {t("finance.charges.apartmentCharge")} · {t("resident.dueBy")} {new Date(charge.dueDate).toLocaleDateString("ru")}
                                        </p>
                                    </div>
                                    <ChargeStatusBadge status={charge.status} label={t(`finance.charges.status.${charge.status}`)} />
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="m-5 empty-slot text-xs">{t("resident.noCharges")}</p>
                    )}
                </section>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="surface-panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                        <span className="chip size-8 shrink-0 text-gold"><IconBell className="size-4" /></span>
                        <h2 className="font-heading text-sm font-bold">{t("resident.news")}</h2>
                        <Link href="/announcements" className="ml-auto text-xs font-bold text-primary hover:text-brand-soft">{t("resident.openAll")}</Link>
                    </div>
                    {announcements.length > 0 ? (
                        <ul>
                            {announcements.map((announcement) => (
                                <li key={announcement.id} className="border-b border-border/70 px-5 py-3 last:border-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="truncate text-sm font-semibold">{announcement.title}</h3>
                                        <span className="shrink-0 text-xs text-muted-foreground">{shortDateFmt.format(announcement.createdAt)}</span>
                                    </div>
                                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{announcement.content}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="m-5 empty-slot text-xs">{t("resident.noNews")}</p>
                    )}
                </section>

                <section className="surface-panel overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                        <span className="chip size-8 shrink-0 text-primary"><IconUsersGroup className="size-4" /></span>
                        <h2 className="font-heading text-sm font-bold">{t("resident.board")}</h2>
                    </div>
                    {boardMembers.length > 0 ? (
                        <ul>
                            {boardMembers.map((member) => (
                                <li key={member.userId} className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-3 text-sm last:border-0">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="chip size-8 shrink-0 font-heading text-xs font-bold">{member.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("az")}</span>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{member.fullName}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{member.entrances ? `${t("dashboard.block")} ${member.entrances}` : t("dashboard.boardMember")}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="m-5 empty-slot text-xs">{t("dashboard.noBoardMembers")}</p>
                    )}
                    <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> {t("dashboard.commandant")}</span>
                        <span className="truncate font-medium">
                            {commandant ? `${commandant.fullName}${commandant.phone ? ` · ${commandant.phone}` : ""}` : t("dashboard.notAssigned")}
                        </span>
                    </div>
                    <div className="border-t border-border px-5 py-3">
                        <Link href="/tickets" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary transition-colors hover:text-brand-soft">
                            {t("resident.createTicket")} <IconTicket className="size-4" />
                        </Link>
                    </div>
                </section>
            </div>
        </div>
    );
}
