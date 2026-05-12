import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAttachments, type Attachment } from "@/hooks/useAttachments";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { toast } from "sonner";
import { FileText, Image as ImageIcon, FileSpreadsheet, FileType2, Upload, Trash2, Loader2, Download, Paperclip } from "lucide-react";

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_COUNT = 10;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.docx,.xlsx,application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx", "xlsx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isAllowedFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = (file.type || "").toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.includes(ext);
  const mimeOk = mime === "" || ALLOWED_MIME_TYPES.includes(mime);
  return extOk && mimeOk;
}

function fileIcon(type: string | null, name: string) {
  const t = (type || "").toLowerCase();
  const n = name.toLowerCase();
  if (t.startsWith("image/") || /\.(jpe?g|png|gif|webp)$/i.test(n)) return ImageIcon;
  if (t.includes("pdf") || n.endsWith(".pdf")) return FileText;
  if (t.includes("sheet") || /\.(xlsx?|csv)$/i.test(n)) return FileSpreadsheet;
  if (t.includes("word") || /\.docx?$/i.test(n)) return FileType2;
  return Paperclip;
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString("nl-BE", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  entityType: "event" | "contract";
  entityId: string | undefined;
  readOnly?: boolean;
}

export function AttachmentsSection({ entityType, entityId, readOnly = false }: Props) {
  const { canEdit } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const { attachments, isLoading, uploadAttachment, deleteAttachment, getDownloadUrl } = useAttachments(entityType, entityId);
  const allowEdit = !readOnly && canEdit;
  const limitReached = attachments.length >= MAX_COUNT;

  if (!entityId) {
    return <p className="text-sm text-muted-foreground italic">Sla eerst op om bijlagen te kunnen toevoegen.</p>;
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!isAllowedFile(file)) {
      toast.error("Bestandstype niet toegestaan. Alleen PDF, JPG, PNG, DOCX en XLSX zijn toegestaan.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error(`Bestand is te groot (max ${MAX_SIZE / 1024 / 1024} MB).`);
      return;
    }
    if (limitReached) {
      toast.error(`Maximum ${MAX_COUNT} bijlagen bereikt.`);
      return;
    }
    try {
      await uploadAttachment.mutateAsync(file);
      toast.success("Bestand geüpload.");
    } catch (e: any) {
      toast.error(`Upload mislukt: ${e?.message ?? "onbekende fout"}`);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDownload = async (a: Attachment) => {
    try {
      const url = await getDownloadUrl(a.file_path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Download mislukt.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAttachment.mutateAsync({ id: deleteTarget.id, filePath: deleteTarget.file_path });
      toast.success("Bestand verwijderd.");
    } catch {
      toast.error("Verwijderen mislukt.");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nog geen bijlagen.</p>
      ) : (
        <ul className="space-y-1.5">
          {attachments.map((a) => {
            const Icon = fileIcon(a.file_type, a.file_name);
            return (
              <li key={a.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card/30">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <button
                  type="button"
                  onClick={() => handleDownload(a)}
                  className="flex-1 min-w-0 text-left text-sm font-medium text-primary hover:underline truncate"
                  title={a.file_name}
                >
                  {a.file_name}
                </button>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0 hidden sm:inline">{formatSize(a.file_size)}</span>
                <span className="text-xs text-muted-foreground shrink-0 hidden md:inline">{formatDate(a.uploaded_at)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDownload(a)} aria-label="Download">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {allowEdit && (
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setDeleteTarget(a)} aria-label="Verwijderen">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {allowEdit && (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ACCEPT}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploadAttachment.isPending || limitReached}
            onClick={() => inputRef.current?.click()}
          >
            {uploadAttachment.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Bestand uploaden
          </Button>
          <span className="text-xs text-muted-foreground">
            {attachments.length}/{MAX_COUNT} · max 10 MB · PDF, JPG, PNG, DOCX, XLSX
          </span>
        </div>
      )}
      {allowEdit && limitReached && (
        <p className="text-xs text-amber-700">Maximum aantal bijlagen bereikt.</p>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.file_name ?? ""}
        isLoading={deleteAttachment.isPending}
      />
    </div>
  );
}
