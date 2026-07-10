"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";
import {IconBellPlus} from "@tabler/icons-react";

export function AnnouncementCreateButton({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        <IconBellPlus className="size-4" />
        Добавить объявление
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое объявление</DialogTitle></DialogHeader>
          <AnnouncementForm slug={slug} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
