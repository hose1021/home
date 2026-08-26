import {getTranslations} from "next-intl/server";
import {requireTenantPermission} from "@/core/auth/session";
import {
  getAuditReport,
  getBudgetVsActualReport,
  getDebtAgingReport,
  getDebtByOwnerReport,
  getFundsReport,
  getIncomeExpenseReport,
} from "@/modules/reports/report.service";
import {ReportsView} from "./reports-view";

export default async function ReportsPage() {
  const t = await getTranslations("reports");
  const {tenantId} = await requireTenantPermission("report:read");

  const [debtByOwner, incomeExpense, budgetVsActual, funds, debtAging, audit] = await Promise.all([
    getDebtByOwnerReport(tenantId),
    getIncomeExpenseReport(tenantId),
    getBudgetVsActualReport(tenantId),
    getFundsReport(tenantId),
    getDebtAgingReport(tenantId),
    getAuditReport(tenantId),
  ]);

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="page-heading mt-1">{t("title")}</h1>
        <p className="page-description">{t("description")}</p>
      </div>
      <ReportsView
        debtByOwner={debtByOwner}
        incomeExpense={incomeExpense}
        budgetVsActual={budgetVsActual}
        funds={funds}
        debtAging={debtAging}
        audit={audit}
      />
    </div>
  );
}
