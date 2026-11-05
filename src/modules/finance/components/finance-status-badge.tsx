"use client";

import {useTranslations} from "next-intl";
import {ChargeStatusBadge, PaymentStatusBadge} from "@/components/status-badge";

export function FinanceStatusBadge({kind, status}: {kind: "charge" | "payment"; status: string}) {
    const t = useTranslations("finance");

    if (kind === "payment") {
        return <PaymentStatusBadge status={status} label={t(`payments.status.${status}` as Parameters<typeof t>[0])} />;
    }
    return <ChargeStatusBadge status={status} label={t(`charges.status.${status}` as Parameters<typeof t>[0])} />;
}
