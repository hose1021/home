"use client";

import {useTranslations} from "next-intl";
import {useState} from "react";
import {toast} from "sonner";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import type {ProtocolStatus} from "@/core/db/schema/enums";
import {createProtocolAction, signProtocolAction} from "@/modules/protocol/protocol.actions";
import {PROTOCOL_TONE} from "@/modules/protocol/protocol.constants";

type Protocol = {
  id: string;
  protocolNumber: string;
  status: ProtocolStatus | null;
  content: string;
  meetingTitle: string | null;
  signatureCount: number;
};

export function ProtocolsBoard({ protocols, meetings, canManage, canSign }: {
  protocols: Protocol[];
  meetings: { id: string; title: string }[];
  canManage: boolean;
  canSign: boolean;
}) {
  const t = useTranslations("protocols");
  const [open, setOpen] = useState(false);

  async function sign(id: string) {
    try {
      await signProtocolAction(id);
      toast.success(t("signed"));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{protocols.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}>+ {t("create")}</Button>}
      </div>

      <div className="space-y-3">
        {protocols.length === 0 && (
          <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        )}
        {protocols.map((p) => (
          <div key={p.id} className="surface-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {t("number", { number: p.protocolNumber })}
                  {p.meetingTitle && <span className="ml-2 text-sm font-normal text-muted-foreground">{p.meetingTitle}</span>}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{p.content}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={PROTOCOL_TONE[p.status ?? "draft"]}>{t(`statuses.${p.status ?? "draft"}`)}</Badge>
                {canSign && p.status !== "signed" && p.status !== "archived" && (
                  <Button size="sm" variant="outline" onClick={() => sign(p.id)}>{t("sign")}</Button>
                )}
              </div>
            </div>
            {p.signatureCount > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">{t("signatures", { count: p.signatureCount })}</p>
            )}
          </div>
        ))}
      </div>

      {open && <ProtocolDialog meetings={meetings} onClose={() => setOpen(false)} />}
    </div>
  );
}

function ProtocolDialog({ meetings, onClose }: {
  meetings: { id: string; title: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("protocols");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [meetingId, setMeetingId] = useState("");
  const [protocolNumber, setProtocolNumber] = useState("");
  const [content, setContent] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingId || !protocolNumber.trim() || !content.trim()) { toast.error(t("required")); return; }
    setPending(true);
    try {
      await createProtocolAction({
        meetingId,
        protocolNumber: protocolNumber.trim(),
        content: content.trim(),
      });
      toast.success(t("created"));
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("createTitle")}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-meeting">{t("meeting")}</Label>
              <select id="p-meeting" value={meetingId} onChange={(e) => setMeetingId(e.target.value)} required className="mt-1 field">
                <option value="">—</option>
                {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="p-number">{t("numberLabel")}</Label>
              <Input id="p-number" value={protocolNumber} onChange={(e) => setProtocolNumber(e.target.value)} placeholder="001/2026" className="mt-1" required />
            </div>
          </div>
          <div>
            <Label htmlFor="p-content">{t("content")}</Label>
            <Textarea id="p-content" value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="mt-1" required />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>{tc("cancel")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("saving") : tc("create")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
