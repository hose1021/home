export default function TicketsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Заявки</h1>
          <p className="text-sm text-zinc-500">Заявки жильцов и обслуживание</p>
        </div>
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900">
          + Создать заявку
        </button>
      </div>
      <p className="text-sm text-zinc-400">Нет активных заявок</p>
    </div>
  );
}
