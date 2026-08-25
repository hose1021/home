"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {CommandantDialog, type OwnerOption} from "./commandant-dialog";

export function CommandantAddButton({ owners }: { owners: OwnerOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ Добавить коменданта</Button>
      <CommandantDialog open={open} onOpenChange={setOpen} owners={owners} initial={null} onSaved={() => setOpen(false)} />
    </>
  );
}
