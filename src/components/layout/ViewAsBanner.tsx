import { useViewAs } from "@/contexts/ViewAsContext";
import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
  standenbouwer: "Standenbouwer",
};

export function ViewAsBanner() {
  const { isSimulating, effectiveRole, simulatedUserName, resetSimulation } = useViewAs();
  const navigate = useNavigate();

  if (!isSimulating) return null;

  const displayName = simulatedUserName ?? ROLE_LABELS[effectiveRole] ?? effectiveRole;
  const roleLabel = ROLE_LABELS[effectiveRole] ?? effectiveRole;

  const handleReset = () => {
    resetSimulation();
    navigate("/gebruikers");
  };

  return (
    <div className="bg-[hsl(30,88%,50%)] text-white px-4 py-2 flex items-center justify-between gap-3 text-sm font-medium shrink-0">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          Je bekijkt de app als <strong>{displayName}</strong> ({roleLabel})
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleReset}
        className="h-7 gap-1.5 bg-white/20 hover:bg-white/30 text-white border-0"
      >
        <X className="h-3.5 w-3.5" />
        Terug naar admin
      </Button>
    </div>
  );
}
