"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";
import {IconBellPlus} from "@tabler/icons-react";
import {Button} from "@/components/ui/button";
import {useTranslations} from "next-intl";

export function AnnouncementCreateButton() {
  const t = useTranslations("announcements");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <IconBellPlus className="size-4" />
        {t("create")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("create")}</DialogTitle></DialogHeader>
          <AnnouncementForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
