"use client";

import {useState} from "react";
import {IconPlus} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {MeetingForm} from "@/modules/meeting/components/MeetingForm";

export function MeetingAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><IconPlus /> Создать собрание</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать собрание</DialogTitle></DialogHeader>
          <MeetingForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
