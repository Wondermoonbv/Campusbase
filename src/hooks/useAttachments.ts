import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

const BUCKET = "attachments";

export function useAttachments(entityType: "event" | "contract", entityId: string | undefined) {
  const qc = useQueryClient();
  const enabled = !!entityId;
  const queryKey = ["attachments", entityType, entityId] as const;

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .order("uploaded_at", { ascending: false });
      if (error) { console.error("Error fetching attachments:", error); return []; }
      return data as Attachment[];
    },
  });

  const uploadAttachment = useMutation({
    mutationFn: async (file: File) => {
      if (!entityId) throw new Error("Entity ID ontbreekt");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uuid = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const path = `${entityType}s/${entityId}/${uuid}-${safeName}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const user = (await supabase.auth.getUser()).data.user;
      const { data, error } = await supabase.from("attachments").insert({
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        file_type: file.type || null,
        uploaded_by: user?.id ?? null,
      }).select().single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data as Attachment;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteAttachment = useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from(BUCKET).remove([filePath]);
      const { error } = await supabase.from("attachments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const getDownloadUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600);
    if (error) throw error;
    return data.signedUrl;
  };

  return { attachments, isLoading, uploadAttachment, deleteAttachment, getDownloadUrl };
}
