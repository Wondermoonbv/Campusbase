import { useMemo } from "react";
import { mockContracts, mockSchools } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

function getExpiryColor(endDate: string) {
  const now = new Date();
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "bg-destructive/10 border-l-4 border-l-destructive";
  if (days <= 90) return "bg-warning/5 border-l-4 border-l-accent";
  return "border-l-4 border-l-success";
}

export default function ContractenPage() {
  const sorted = useMemo(() => {
    return [...mockContracts].sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    );
  }, []);

  const exportCSV = () => {
    const headers = ["School", "Type", "Start", "Einde", "Vernieuwing", "Status", "Waarde"];
    const rows = sorted.map((c) => {
      const school = mockSchools.find((s) => s.id === c.school_id);
      return [school?.name ?? "", c.contract_type, c.start_date, c.end_date, c.renewal_date, c.status, c.value ?? ""];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contracten_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Contracten</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Einde</TableHead>
              <TableHead className="hidden md:table-cell">Vernieuwingsdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Waarde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => {
              const school = mockSchools.find((s) => s.id === c.school_id);
              return (
                <TableRow key={c.id} className={`hover:bg-muted/30 ${getExpiryColor(c.end_date)}`}>
                  <TableCell className="font-medium">{school?.name ?? "—"}</TableCell>
                  <TableCell className="capitalize">{c.contract_type}</TableCell>
                  <TableCell>{new Date(c.start_date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell>{new Date(c.end_date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell className="hidden md:table-cell">{new Date(c.renewal_date).toLocaleDateString("nl-BE")}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-border text-xs text-muted-foreground flex gap-4">
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success" /> Meer dan 90 dagen</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent" /> Binnen 90 dagen</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive" /> Verlopen</span>
        </div>
      </div>
    </div>
  );
}
