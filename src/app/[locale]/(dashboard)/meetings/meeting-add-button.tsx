"use client";

import {IconPlus} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {MeetingForm} from "@/modules/meeting/components/MeetingForm";

export function MeetingAddButton() {
  const t = useTranslations("meetings");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><IconPlus /> {t("createMeeting")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("createMeeting")}</DialogTitle></DialogHeader>
          <MeetingForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
