import {Badge} from "@/components/ui/badge";
import type {ChargeStatus, PaymentStatus} from "@/core/db/schema/enums";

/** One tone per closed status value; the payment and charge unions are disjoint. */
const STATUS_TONE: Record<PaymentStatus | ChargeStatus, string> = {
  confirmed: "border-success/40 bg-success/15 text-success",
  rejected: "border-danger/40 bg-danger/15 text-danger",
  refunded: "border-border bg-transparent text-muted-foreground",
  pending: "border-warning/40 bg-warning/15 text-warning",
  paid: "border-success/40 bg-success/15 text-success",
  partially_paid: "border-warning/40 bg-warning/15 text-warning",
  overdue: "border-danger/40 bg-danger/15 text-danger",
  cancelled: "border-border bg-transparent text-muted-foreground",
};

function StatusBadge({tone, children}: {tone: string; children: React.ReactNode}) {
  return <Badge variant="outline" className={tone}>{children}</Badge>;
}

export function PaymentStatusBadge({status, label}: {status: string; label: string}) {
  return <StatusBadge tone={STATUS_TONE[status as PaymentStatus] ?? ""}>{label}</StatusBadge>;
}

export function ChargeStatusBadge({status, label}: {status: string; label: string}) {
  return <StatusBadge tone={STATUS_TONE[status as ChargeStatus] ?? ""}>{label}</StatusBadge>;
}
