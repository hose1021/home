import {Badge} from "@/components/ui/badge";

export function PaymentStatusBadge({status, label}: {status: string; label: string}) {
  const variant = status === "confirmed" ? "default" : status === "rejected" ? "destructive" : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

export function ChargeStatusBadge({status, label}: {status: string; label: string}) {
  const tone =
    status === "paid" ? "border-success/40 bg-success/15 text-success" :
    status === "overdue" ? "border-danger/40 bg-danger/15 text-danger" :
    status === "cancelled" ? "border-border bg-transparent text-muted-foreground" :
    "border-warning/40 bg-warning/15 text-warning";
  return <Badge variant="outline" className={tone}>{label}</Badge>;
}
