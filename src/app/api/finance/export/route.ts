import {NextResponse} from "next/server";
import {hasAnyPermission} from "@/core/auth/permissions";
import {getSession} from "@/core/auth/session";
import {listChargeViews, listDebtors} from "@/modules/finance/services/finance-analytics.service";
import {listPaymentsWithDetails} from "@/modules/finance/services/payment.service";

function csvCell(value: unknown): string {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(csvCell).join(","));
    return `\uFEFF${lines.join("\r\n")}`;
}

/** Finance CSV export. Query: type=charges|payments|debtors plus optional q/status/from/to. */
export async function GET(request: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({error: "unauthorized"}, {status: 401});
    if (!hasAnyPermission(session.user.roles, "finance:read")) {
        return NextResponse.json({error: "forbidden"}, {status: 403});
    }

    const tenantId = session.user.tenantId;
    const params = new URL(request.url).searchParams;
    const type = params.get("type") ?? "charges";
    const query = (params.get("q") ?? "").trim().toLowerCase();
    const status = params.get("status") ?? "";
    const from = params.get("from") ?? "";
    const to = params.get("to") ?? "";

    const matches = (fields: (string | null | undefined)[]) =>
        (!query || fields.some((field) => field?.toLowerCase().includes(query)));
    const inRange = (date: string) => (!from || date >= from) && (!to || date <= to);

    if (type === "payments") {
        const rows = await listPaymentsWithDetails(tenantId, 500);
        const filtered = rows.filter((row) => {
            const date = new Date(row.paymentDate).toISOString().slice(0, 10);
            return (!status || row.status === status) && inRange(date) &&
                matches([row.ownerName, row.unitNumber, row.referenceNo]);
        });
        return new NextResponse(toCsv(
            ["Дата", "Квартира", "Собственник", "Период", "Сумма", "Способ", "Референс", "Статус"],
            filtered.map((row) => [
                new Date(row.paymentDate).toISOString().slice(0, 10),
                row.unitNumber ?? "",
                row.ownerName ?? "",
                `${row.periodMonth}.${row.periodYear}`,
                row.amount,
                row.paymentMethod,
                row.referenceNo ?? "",
                row.status,
            ]),
        ), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"payments.csv\"",
            },
        });
    }

    if (type === "debtors") {
        const debtors = await listDebtors(tenantId);
        return new NextResponse(toCsv(
            ["Собственник", "Квартиры", "Долг", "Старейший срок", "Дней просрочки"],
            debtors.map((row) => [
                row.ownerName,
                row.unitNumbers.join(" / "),
                row.outstanding.toFixed(2),
                row.oldestDueDate ?? "",
                row.daysOverdue,
            ]),
        ), {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": "attachment; filename=\"debtors.csv\"",
            },
        });
    }

    const rows = await listChargeViews(tenantId);
    const filtered = rows.filter((row) =>
        (!status || row.status === status) && inRange(row.dueDate) && matches([row.ownerName, row.unitNumber]),
    );
    return new NextResponse(toCsv(
        ["Срок", "Период", "Квартира", "Собственник", "Начисление", "Сумма", "Оплачено", "Долг", "Статус"],
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
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": "attachment; filename=\"charges.csv\"",
        },
    });
}
