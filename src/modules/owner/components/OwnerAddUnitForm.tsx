"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {assignExistingUnitAction, addNewUnitToOwnerAction, listUnassignedUnitsAction} from "../owner.actions";

type UnassignedUnit = {
  id: string;
  unitNumber: string;
  entrance: number;
  floor: number;
  type: string;
  area: string;
};

export function OwnerAddUnitForm({
  ownerId,
  onDone,
}: {
  ownerId: string;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [units, setUnits] = useState<UnassignedUnit[]>([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState("");

  useEffect(() => {
    listUnassignedUnitsAction(ownerId)
      .then(setUnits)
      .catch(() => setError("Не удалось загрузить список квартир"))
      .finally(() => setUnitsLoaded(true));
  }, [ownerId]);

  async function handleAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedUnitId) return;
    setPending(true);
    setError(null);
    try {
      await assignExistingUnitAction(ownerId, selectedUnitId);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await addNewUnitToOwnerAction(ownerId, {
        unitNumber: fd.get("unitNumber") as string,
        entrance: Number(fd.get("entrance")),
        floor: Number(fd.get("floor")),
        type: fd.get("type") as "residential" | "commercial" | "parking" | "storage" | "other",
        area: fd.get("area") as string,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex rounded-[4px] border border-border p-0.5 dark:border-border">
        <button
          type="button"
          onClick={() => setMode("existing")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "existing"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground dark:text-muted-foreground/70 dark:hover:text-foreground"
          }`}
        >
          Выбрать существующую
        </button>
        <button
          type="button"
          onClick={() => setMode("new")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "new"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground dark:text-muted-foreground/70 dark:hover:text-foreground"
          }`}
        >
          Создать новую
        </button>
      </div>

      {mode === "existing" ? (
        <form onSubmit={handleAssign} className="space-y-4">
          {!unitsLoaded ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : units.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных квартир. Создайте новую.</p>
          ) : (
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              required
              className="field"
            >
              <option value="">— Выберите квартиру —</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  Кв. {u.unitNumber} — под. {u.entrance}, эт. {u.floor}, {Number(u.area).toFixed(1)} м²
                </option>
              ))}
            </select>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
            <Button type="submit" disabled={pending || !selectedUnitId}>
              {pending ? "Привязка..." : "Привязать"}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <fieldset className="rounded-[4px] border border-border p-3 dark:border-border">
            <legend className="px-1 text-sm font-medium">Новая квартира</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">№ квартиры</label>
                <input name="unitNumber" required className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">Этаж</label>
                <input name="floor" type="number" required className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">Подъезд</label>
                <input name="entrance" type="number" defaultValue={1} className="mt-1 field" />
              </div>
              <div>
                <label className="block text-sm font-medium">Тип</label>
                <select name="type" className="mt-1 field">
                  <option value="residential">Жилая</option>
                  <option value="commercial">Коммерческая</option>
                  <option value="parking">Парковка</option>
                  <option value="storage">Склад</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Площадь (м²)</label>
                <input name="area" type="number" step="0.01" required className="mt-1 field" />
              </div>
            </div>
          </fieldset>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onDone}>Отмена</Button>
            <Button type="submit" disabled={pending}>{pending ? "Создание..." : "Создать"}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
