import { supabase } from "@/integrations/supabase/client";

// Helper for tables not yet in auto-generated types
export function db(table: string) {
  return (supabase as any).from(table);
}
