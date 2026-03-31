import { useViewAs } from "@/contexts/ViewAsContext";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  standenbouwer: "Standenbouwer",
};

export function ViewAsBanner() {
  const { isSimulating, effectiveRole, resetSimulation } = useViewAs();

  if (!isSimulating) return null;

  return (
    <div className="bg-[hsl(30,88%,50%)] text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Je bekijkt de app als <strong>{ROLE_LABELS[effectiveRole] ?? effectiveRole}</strong>
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={resetSimulation}
        className="h-7 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
      >
        <X className="h-3.5 w-3.5" />
        Terug naar admin
      </Button>
    </div>
  );
}
