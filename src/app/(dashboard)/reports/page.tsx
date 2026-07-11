import {requireTenantPermission} from "@/core/auth/session";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {IconArrowUpRight, IconChartBar} from "@tabler/icons-react";

const reports = [
  "Отчёт по задолженности",
  "Доходы и расходы",
  "Бюджет vs Факт",
  "Движение средств по фондам",
  "Анализ дебиторской задолженности",
  "Аудит изменений",
];

export default async function ReportsPage() {
  await requireTenantPermission("report:read");

  return (
    <div className="page-shell">
      <div>
        <p className="text-sm text-muted-foreground">Аналитический центр</p>
        <h1 className="page-heading mt-1">Отчёты</h1>
        <p className="page-description">Финансовые и управленческие отчёты</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reports.map((title) => (
          <Card key={title} className="group gap-4 py-5 transition-colors hover:bg-muted/30">
            <CardHeader className="px-5">
              <div className="flex items-start justify-between gap-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconChartBar className="size-4" /></span>
                <IconArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <CardTitle className="mt-4 text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <Badge variant="secondary">Скоро</Badge>
              <p className="mt-3 text-sm text-muted-foreground">Будет доступно после добавления данных</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
