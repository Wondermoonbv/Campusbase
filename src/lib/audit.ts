import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntityType =
  | "school"
  | "contact"
  | "opleiding"
  | "evenement"
  | "contract"
  | "taak"
  | "ambassadeur"
  | "inschrijving";

interface AuditEntry {
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name: string;
  changes?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_log").insert([{
      user_id: user.id,
      user_email: user.email ?? null,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      entity_name: entry.entity_name,
      changes: entry.changes ?? {},
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
