"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {OwnerAddUnitForm} from "@/modules/owner/components/OwnerAddUnitForm";

type UnitSummary = {
  id: string;
  unitNumber: string;
  area: string;
  entrance: number;
  floor: number;
  type: string;
  buildingName: string | null;
};

export function OwnerUnitsSection({
  ownerId,
  units,
  children,
  canManage,
}: {
  ownerId: string;
  units: UnitSummary[];
  children: React.ReactNode;
  canManage: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500">
          Квартиры ({units.length})
        </h2>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            + Добавить квартиру
          </Button>
        )}
      </div>

      {children}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Добавить квартиру</DialogTitle></DialogHeader>
          <OwnerAddUnitForm ownerId={ownerId} onDone={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
