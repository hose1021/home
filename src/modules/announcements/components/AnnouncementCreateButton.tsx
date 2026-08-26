"use client";

import {IconBellPlus} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {AnnouncementForm} from "@/modules/announcements/components/AnnouncementForm";

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
