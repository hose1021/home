"use client";

import {useState} from "react";
import Link from "next/link";
import {IconBuilding} from "@tabler/icons-react";
import {Badge} from "@/components/ui/badge";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";

export type CommandantInfo = {
  id: string;
  ownerId: string | null;
  fullName: string;
  phone: string | null;
  startDate: string;
  endDate: string | null;
};

export function CommandantCard({
  commandant,
  canBrowseOwners,
}: {
  commandant: CommandantInfo | null;
  canBrowseOwners: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!commandant) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> Комендант</span>
        <span className="font-medium">Не назначен</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-between rounded-lg bg-muted/60 px-4 py-3 text-sm transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> Комендант</span>
        <span className="font-medium">{commandant.fullName}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Комендант</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Имя</p>
              <p className="font-medium">{commandant.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Телефон</p>
              <p>{commandant.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Период</p>
              <p>{commandant.startDate} — {commandant.endDate ?? "по настоящее время"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Статус</p>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Активен</Badge>
            </div>
            {canBrowseOwners && commandant.ownerId && (
              <Link href={`/owners/${commandant.ownerId}`} className="inline-block text-primary hover:underline">
                Профиль собственника
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
