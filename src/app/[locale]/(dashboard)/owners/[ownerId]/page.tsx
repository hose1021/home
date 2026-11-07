import {IconBuilding, IconCash, IconHome, IconRulerMeasure} from "@tabler/icons-react";
import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {Card, CardContent} from "@/components/ui/card";
import {hasStaffRole, sessionAllows} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {Link} from "@/i18n/navigation";
import {formatAmount, formatNumber} from "@/modules/finance/money-format";
import {periodKey} from "@/modules/finance/period";
import {getOwnerDetail} from "@/modules/owner/owner.service";
import {MonthRow} from "./month-row";
import {OwnerUnitsSection} from "./owner-units-section";
import {OwnerUnitCard} from "./OwnerUnitCard";
import {PaymentHistory} from "./payment-history";


export default async function OwnerDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; ownerId: string }>;
}) {
  const { locale, ownerId } = await params;
  const t = await getTranslations("owners");
  const tp = await getTranslations("payments");
  const tc = await getTranslations("common");
  const { session, tenantId } = await requireTenantPermission("owner:read");
  const canPay = sessionAllows(session, "payment:write");
  const canManageUnits = sessionAllows(session, "owner:write");

  const detail = await getOwnerDetail(tenantId, ownerId);
  if (!detail) notFound();
  const {owner, paymentByUnitPeriod, payments} = detail;
  const ownerUnits = detail.units;
  const restrictToCurrentOwner = !hasStaffRole(session.user.roles);
  if (restrictToCurrentOwner && owner.userId !== session.user.id) notFound();

  const initials = owner.fullName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="page-shell">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/owners" />}>{t("title")}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{owner.fullName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="surface-panel flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar size="lg" className="size-12">
            <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="page-heading truncate">{owner.fullName}</h1>
              <Badge variant={owner.status === "active" ? "secondary" : "outline"}>
                {owner.status === "active" ? t("active") : t("inactive")}
              </Badge>
            </div>
            <p className="page-description truncate">{owner.phone ?? t("noPhone")} · {owner.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[4px] border bg-muted/30 px-4 py-3 sm:text-right">
          <IconCash className={detail.grandDebt > 0 ? "size-5 text-destructive" : "size-5 text-success"} />
          <div>
            <p className="text-xs text-muted-foreground">{t("totalDebt")}</p>
            <p className={`text-xl font-semibold tabular-nums ${detail.grandDebt > 0 ? "text-destructive" : "text-success"}`}>{formatAmount(detail.grandDebt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OwnerMetric icon={IconHome} label={t("units")} value={String(detail.units.length)} />
        <OwnerMetric icon={IconRulerMeasure} label={t("totalArea")} value={`${formatNumber(detail.totalArea)} ${tc("squareMeters")}`} />
        <OwnerMetric icon={IconBuilding} label={t("monthlyTariff")} value={formatAmount(detail.totalMonthlyFee)} />
      </div>

      <OwnerUnitsSection ownerId={ownerId} units={ownerUnits} canManage={canManageUnits}>
        {ownerUnits.length > 0 ? (
        <div className="space-y-4">
          {ownerUnits.map((unit) => {
            const area = Number(unit.area);
            const monthlyFee = unit.monthlyFee;
            const totalDebt = unit.totalDebt;

            const periodsByYear = new Map<number, { year: number; month: number }[]>();
            for (const p of detail.periods) {
              const arr = periodsByYear.get(p.year) ?? [];
              arr.push(p);
              periodsByYear.set(p.year, arr);
            }

            return (
              <OwnerUnitCard key={unit.id} ownerId={owner.id} unit={unit} canManage={canManageUnits}>
                <div className="bg-muted/20 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[4px] bg-background shadow-xs"><IconHome className="size-4" /></span><h2 className="text-lg font-semibold">{t("unitNumber", {unit: unit.unitNumber})}</h2></div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("blockFloor", {entrance: unit.entrance, floor: unit.floor})}, {formatNumber(area)} {tc("squareMeters")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("feeFormula", {area: formatNumber(area), tariff: formatNumber(detail.tariffPerSqm), fee: formatNumber(monthlyFee)})}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t("unitDebt")}</p>
                      <p className={`mt-1 text-xl font-semibold tabular-nums ${totalDebt > 0 ? "text-destructive" : "text-success"}`}>
                        {formatAmount(totalDebt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t">
                  {[...periodsByYear.entries()].reverse().map(([year, yearPeriods]) => (
                    <div key={year}>
                      <div className="border-b bg-muted/40 px-5 py-2 text-xs font-semibold text-muted-foreground sm:px-6">
                        {year}
                      </div>
                      <div className="divide-y divide-border/70">
                        {yearPeriods.map(({ year, month }) => {
                          const paid = detail.paidByUnit.get(unit.id)?.get(periodKey(year, month)) ?? 0;
                          const isPaid = paid >= monthlyFee;
                          const payment = paymentByUnitPeriod.get(`${unit.id}-${periodKey(year, month)}`) ?? null;
                          return (
                            <MonthRow
                              key={`${year}-${month}`}
                              locale={locale}
                              ownerId={owner.id}
                              unitId={unit.id}
                              unitNumber={unit.unitNumber}
                              entrance={unit.entrance}
                              floor={unit.floor}
                              monthlyFee={monthlyFee}
                              tariff={detail.tariffPerSqm}
                              year={year}
                              month={month}
                              isPaid={isPaid}
                              alreadyPaid={paid}
                              payment={payment}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </OwnerUnitCard>
            );
          })}
        </div>
      ) : (
        <div className="surface-panel border-dashed p-10 text-center">
          <p className="text-muted-foreground">{t("noUnits")}</p>
        </div>
      )}
      </OwnerUnitsSection>

      {payments.length > 0 && (
        <div className="space-y-3">
          <div><h2 className="text-base font-semibold">{t("paymentHistory")}</h2><p className="mt-1 text-sm text-muted-foreground">{tp("recentOperations")}</p></div>
          <PaymentHistory
            ownerId={owner.id}
            canEdit={canPay}
            payments={payments}
          />
        </div>
      )}
    </div>
  );
}

function OwnerMetric({icon: Icon, label, value}: {icon: typeof IconHome; label: string; value: string}) {
  return (
    <Card className="bg-gradient-to-t from-primary/5 to-card py-5">
      <CardContent className="flex items-center justify-between gap-4 px-5">
        <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{value}</p></div>
        <span className="flex size-9 items-center justify-center rounded-[4px] bg-muted text-muted-foreground"><Icon className="size-4" /></span>
      </CardContent>
    </Card>
  );
}
