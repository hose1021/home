"use client";

import {IconBuilding} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {Badge} from "@/components/ui/badge";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Link} from "@/i18n/navigation";
import type {CommandantInfo} from "@/modules/commandants/commandant.service";

export function CommandantCard({commandant}: {commandant: CommandantInfo | null}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tOwners = useTranslations("owners");
  const [open, setOpen] = useState(false);

  if (!commandant) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-[4px] bg-muted/60 px-4 py-3 text-sm">
        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> {t("commandant")}</span>
        <span className="font-medium">{t("notAssigned")}</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-between rounded-[4px] bg-muted/60 px-4 py-3 text-sm transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-2 text-muted-foreground"><IconBuilding className="size-4" /> {t("commandant")}</span>
        <span className="font-medium">{commandant.fullName}</span>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("commandant")}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{tOwners("fullName")}</p>
              <p className="font-medium">{commandant.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tOwners("phone")}</p>
              <p>{commandant.phone ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tCommon("period")}</p>
              <p>{commandant.startDate} — {commandant.endDate ?? t("present")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tCommon("status")}</p>
              <Badge className="bg-success/12 border-success/35 text-success">{tOwners("active")}</Badge>
            </div>
            {commandant.ownerId && (
              <Link href={`/owners/${commandant.ownerId}`} className="inline-block text-primary hover:underline">
                {t("ownerProfile")}
              </Link>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
