import {requireTenantPermission} from "@/core/auth/session";
import {IconTool} from "@tabler/icons-react";

export default async function ContractorsPage() {
  await requireTenantPermission("contractor:read");

  return (
    <div className="page-shell">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Исполнители и услуги</p>
          <h1 className="page-heading mt-1">Подрядчики</h1>
          <p className="page-description">Управление подрядчиками и договорами</p>
        </div>
      </div>
      <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><IconTool className="size-5" /></span>
        <p className="mt-4 font-medium">Подрядчиков пока нет</p>
        <p className="mt-1 text-sm text-muted-foreground">Модуль подрядчиков подготовлен в модели данных и будет открыт после добавления CRUD-сценария.</p>
      </div>
    </div>
  );
}
