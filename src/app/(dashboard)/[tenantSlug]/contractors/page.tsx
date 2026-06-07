export default function ContractorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Подрядчики</h1>
          <p className="text-sm text-zinc-500">Управление подрядчиками и договорами</p>
        </div>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          + Добавить подрядчика
        </button>
      </div>
      <p className="text-sm text-zinc-400">Нет добавленных подрядчиков</p>
    </div>
  );
}
