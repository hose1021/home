import {NextResponse} from "next/server";
import {sessionAllows} from "@/core/auth/permissions";

import {getSession} from "@/core/auth/session";
import {listChargeViews, listDebtors, listPaymentViews} from "@/modules/finance/services/finance-analytics.service";
import {filterChargeViews, filterPaymentViews} from "@/modules/finance/services/ledger-filters";

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(headers: readonly string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}`;
}

const HEADERS = {
  payments: ["Дата", "Квартира", "Собственник", "Период", "Сумма", "Способ", "Референс", "Статус"],
  debtors: ["Собственник", "Квартиры", "Долг", "Старейший срок", "Дней просрочки"],
  charges: ["Срок", "Период", "Квартира", "Собственник", "Начисление", "Сумма", "Оплачено", "Долг", "Статус"],
} as const;

const CSV_HEADERS = {
  "Content-Type": "text/csv; charset=utf-8",
} as const;

/** Finance CSV export. Query: type=charges|payments|debtors plus optional q/status/from/to. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({error: "unauthorized"}, {status: 401});
  if (!sessionAllows(session, "finance:read")) {
    return NextResponse.json({error: "forbidden"}, {status: 403});
  }

  const tenantId = session.user.tenantId;
  const params = new URL(request.url).searchParams;
  const type = params.get("type") ?? "charges";
  const query = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const period = {from, to};

  if (type === "payments") {
    const rows = await listPaymentViews(tenantId);
    const filtered = filterPaymentViews(rows, {query, status, period});
    return new NextResponse(toCsv(
      HEADERS.payments,
      filtered.map((row) => [
        row.paymentDate,
        row.unitNumber ?? "",
        row.ownerName ?? "",
        `${row.periodMonth}.${row.periodYear}`,
        row.amount.toFixed(2),
        row.method,
        row.referenceNo ?? "",
        row.status,
      ]),
    ), {
      headers: {...CSV_HEADERS, "Content-Disposition": "attachment; filename=\"payments.csv\""},
    });
  }

  if (type === "debtors") {
    const debtors = await listDebtors(tenantId);
    return new NextResponse(toCsv(
      HEADERS.debtors,
      debtors.map((row) => [
        row.ownerName,
        row.unitNumbers.join(" / "),
        row.outstanding.toFixed(2),
        row.oldestDueDate ?? "",
        row.daysOverdue,
      ]),
    ), {
      headers: {...CSV_HEADERS, "Content-Disposition": "attachment; filename=\"debtors.csv\""},
    });
  }

  const rows = await listChargeViews(tenantId);
  const filtered = filterChargeViews(rows, {query, status, period});
  return new NextResponse(toCsv(
    HEADERS.charges,
    filtered.map((row) => [
      row.dueDate,
      `${row.periodMonth}.${row.periodYear}`,
      row.unitNumber ?? "",
      row.ownerName ?? "",
      "Квартплата",
      row.amount.toFixed(2),
      row.paid.toFixed(2),
      row.outstanding.toFixed(2),
      row.status,
    ]),
  ), {
    headers: {...CSV_HEADERS, "Content-Disposition": "attachment; filename=\"charges.csv\""},
  });
}
