import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "export";
export type AuditEntityType =
  | "school"
  | "contact"
  | "opleiding"
  | "evenement"
  | "contract"
  | "taak"
  | "ambassadeur"
  | "inschrijving"
  | "user"
  | "user_role"
  | "user_password"
  | "export";

interface AuditEntry {
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name: string;
  changes?: Record<string, unknown> | null;
}

export async function writeAuditLog(entry: AuditEntry) {
  try {
    await supabase.rpc("log_audit", {
      p_action: entry.action,
      p_entity_type: entry.entity_type,
      p_entity_id: entry.entity_id,
      p_entity_name: entry.entity_name,
      p_changes: (entry.changes ?? {}) as any,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
