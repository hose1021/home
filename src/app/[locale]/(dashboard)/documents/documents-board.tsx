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
import {uploadDocumentAction} from "@/modules/document/document.actions";
import {DOCUMENT_CATEGORIES, MAX_DOCUMENT_BYTES} from "@/modules/document/document.constants";

type DocumentItem = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: "active" | "archived" | null;
  createdAt: Date | string;
  uploadedByName: string | null;
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function DocumentsBoard({documents, canManage}: {
  documents: DocumentItem[];
  canManage: boolean;
}) {
  const t = useTranslations("documents");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{documents.length} {t("count")}</p>
        {canManage && <Button size="sm" onClick={() => setOpen(true)}>+ {t("create")}</Button>}
      </div>

      <div className="space-y-3">
        {documents.length === 0 && (
          <div className="surface-panel flex flex-col items-center border-dashed px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
          </div>
        )}
        {documents.map((d) => (
          <div key={d.id} className="surface-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{d.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {d.originalFileName} · {formatSize(d.sizeBytes)}
                </p>
                {d.description && (
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{d.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.uploadedByName}
                  {d.uploadedByName && " · "}
                  {new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="outline">{t(`categories.${d.category}`)}</Badge>
                {d.status === "archived" && <Badge variant="secondary">{t("statuses.archived")}</Badge>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && <UploadDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function UploadDialog({onClose}: {onClose: () => void}) {
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category || !file) {
      toast.error(t("required"));
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(t("errors.too_large"));
      return;
    }
    setPending(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      await uploadDocumentAction({
        title: title.trim(),
        category: category as (typeof DOCUMENT_CATEGORIES)[number],
        description: description.trim() || undefined,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        bytes,
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
              <Label htmlFor="d-title">{t("titleLabel")}</Label>
              <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="d-category">{t("categoryLabel")}</Label>
              <select id="d-category" value={category} onChange={(e) => setCategory(e.target.value)} required className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                <option value="">—</option>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="d-file">{t("fileLabel")}</Label>
            <Input
              id="d-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.odt,.ods"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="d-description">{t("descriptionLabel")}</Label>
            <Textarea id="d-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1" />
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
