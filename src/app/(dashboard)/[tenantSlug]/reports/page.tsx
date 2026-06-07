export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Отчёты</h1>
      <p className="text-sm text-zinc-500">Финансовые и управленческие отчёты</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ReportCard title="Отчёт по задолженности" />
        <ReportCard title="Доходы и расходы" />
        <ReportCard title="Бюджет vs Факт" />
        <ReportCard title="Движение средств по фондам" />
        <ReportCard title="Анализ дебиторской задолженности" />
        <ReportCard title="Аудит изменений" />
      </div>
    </div>
  );
}

function ReportCard({ title }: { title: string }) {
  return (
    <button className="rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-zinc-400">Будет доступно после добавления данных</p>
    </button>
  );
}
