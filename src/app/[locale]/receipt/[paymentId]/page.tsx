import {notFound} from "next/navigation";
import {getTranslations} from "next-intl/server";
import {hasStaffRole} from "@/core/auth/permissions";
import {requireTenantPermission} from "@/core/auth/session";
import {getPaymentReceipt, requireOwnerPaymentAccess} from "@/modules/finance/services/payment.service";
import {PrintButton} from "./print-button";
import "./receipt.css";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{locale: string; paymentId: string}>;
}) {
  const { locale, paymentId } = await params;
  const t = await getTranslations("finance.payments");
  const tr = await getTranslations("finance.payments.receipt");
  const { session, tenantId } = await requireTenantPermission("payment:read");

  const receipt = await getPaymentReceipt(tenantId, paymentId);
  if (!receipt) notFound();

  if (!hasStaffRole(session.user.roles)) {
    await requireOwnerPaymentAccess(tenantId, receipt.ownerId, session.user.id, session.user.roles);
  }

  const period = new Date(receipt.periodYear, receipt.periodMonth - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const paidDate = receipt.paymentDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const number = receipt.referenceNo ?? receipt.id.slice(0, 8).toUpperCase();

  return (
    <main className="receipt-screen">
      <div className="receipt">
        <header className="receipt__header">
          <div>
            <h1 className="receipt__org">{receipt.tenantName}</h1>
            {receipt.tenantAddress && <p className="receipt__muted">{receipt.tenantAddress}</p>}
            {receipt.tenantPhone && <p className="receipt__muted">{receipt.tenantPhone}</p>}
          </div>
          <p className="receipt__docno">{tr("number", { number })}</p>
        </header>

        <h2 className="receipt__title">{tr("title")}</h2>

        <dl className="receipt__rows">
          <div className="receipt__row">
            <dt>{tr("payer")}</dt>
            <dd>{receipt.ownerFullName}</dd>
          </div>
          <div className="receipt__row">
            <dt>{tr("unit")}</dt>
            <dd>
              {receipt.unitNumber} · {tr("entrance")} {receipt.entrance} · {tr("floor")} {receipt.floor} ·{" "}
              {tr("area")} {Number(receipt.area).toFixed(2)} м²
            </dd>
          </div>
          <div className="receipt__row">
            <dt>{tr("period")}</dt>
            <dd>{period}</dd>
          </div>
          <div className="receipt__row">
            <dt>{tr("tariff")}</dt>
            <dd>{Number(receipt.tariffPerSqm).toFixed(2)} ₼/м²</dd>
          </div>
          <div className="receipt__row">
            <dt>{tr("date")}</dt>
            <dd>{paidDate}</dd>
          </div>
          <div className="receipt__row">
            <dt>{tr("method")}</dt>
            <dd>{t(`paymentMethods.${receipt.paymentMethod}`)}</dd>
          </div>
        </dl>

        <div className="receipt__amount">
          <span>{tr("amount")}</span>
          <strong>{Number(receipt.amount).toFixed(2)} ₼</strong>
        </div>

        {receipt.status === "refunded" && <p className="receipt__refunded">{tr("refunded")}</p>}

        <footer className="receipt__footer">{tr("footer")}</footer>

        <div className="receipt__actions no-print">
          <PrintButton label={tr("print")} />
        </div>
      </div>
    </main>
  );
}
