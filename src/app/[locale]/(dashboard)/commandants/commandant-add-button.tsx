"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {CommandantDialog, type OwnerOption} from "./commandant-dialog";

export function CommandantAddButton({ owners }: { owners: OwnerOption[] }) {
  const t = useTranslations("commandants");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ {t("add")}</Button>
      <CommandantDialog open={open} onOpenChange={setOpen} owners={owners} initial={null} onSaved={() => setOpen(false)} />
    </>
  );
}
