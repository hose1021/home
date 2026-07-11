"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";
import {IconBellPlus} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";

export function AnnouncementCreateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconBellPlus className="size-4" />
        Добавить объявление
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новое объявление</DialogTitle></DialogHeader>
          <AnnouncementForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
