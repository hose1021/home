"use client";

import {IconPlus} from "@tabler/icons-react";
import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {VOTING_TYPES, type VotingType} from "@/core/db/schema/enums";
import {createVotingAction} from "@/modules/voting/voting.actions";
import {VOTING_TYPE_KEYS} from "@/modules/voting/voting.constants";

export function VotingCreateButton() {
  const t = useTranslations("voting");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><IconPlus /> {t("create")}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("createTitle")}</DialogTitle></DialogHeader>
          <VotingForm onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function VotingForm({onDone}: {onDone: () => void}) {
  const t = useTranslations("voting");
  const tc = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const options = (fd.get("options") as string).split("\n").map((line) => line.trim()).filter(Boolean);
    if (options.length < 2) {
      setError(t("optionsRequired"));
      return;
    }
    setPending(true);
    try {
      await createVotingAction({
        title: fd.get("title") as string,
        votingType: fd.get("votingType") as VotingType,
        startDate: fd.get("startDate") as string,
        endDate: fd.get("endDate") as string,
        quorumRequired: (fd.get("quorumRequired") as string) || undefined,
        options,
      });
      toast.success(t("created"));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="v-title">{t("titleLabel")}</Label>
        <Input id="v-title" name="title" required maxLength={500} className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="v-type">{t("typeLabel")}</Label>
          <select id="v-type" name="votingType" className="mt-1 field" defaultValue="in_person">
            {VOTING_TYPES.map((type) => (
              <option key={type} value={type}>{t(`type.${VOTING_TYPE_KEYS[type]}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="v-quorum">{t("quorum")}</Label>
          <Input id="v-quorum" name="quorumRequired" type="number" step="0.01" min="0" max="100" defaultValue="50" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="v-start">{t("startDate")}</Label>
          <Input id="v-start" name="startDate" type="date" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="v-end">{t("endDate")}</Label>
          <Input id="v-end" name="endDate" type="date" required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="v-options">{t("options")}</Label>
        <Textarea id="v-options" name="options" rows={4} required className="mt-1" />
        <p className="mt-1 text-xs text-muted-foreground">{t("optionsHint")}</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>{tc("cancel")}</Button>
        <Button type="submit" disabled={pending}>{pending ? tc("save") : tc("create")}</Button>
      </div>
    </form>
  );
}
