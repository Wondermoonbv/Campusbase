import { toast } from "sonner";

/**
 * Handles delete errors, showing a user-friendly message for FK violations.
 */
export function handleDeleteError(error: any, entityLabel: string) {
  const code = error?.code ?? error?.details?.code;
  if (code === "23503") {
    toast.error(`Kan ${entityLabel} niet verwijderen. Er zijn nog gekoppelde records. Verwijder deze eerst.`);
  } else {
    toast.error(`Fout bij verwijderen van ${entityLabel}.`);
  }
}
