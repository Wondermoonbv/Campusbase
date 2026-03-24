import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mockContracts, mockSchools, mockEvents } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Download, Plus, ChevronDown, ChevronUp, ExternalLink, Calendar, Pencil } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";

function getExpiryColor(endDate: string) {
  const now = new Date();
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - now.getTime()) / 86400000);
  if (days < 0) return "bg-destructive/10 border-l-4 border-l-destructive";
  if (days <= 90) return "bg-warning/5 border-l-4 border-l-accent";
  return "border-l-4 border-l-success";
}

export default function ContractenPage() {
  const [searchParams] = useSearchParams();
  const filterExpiring = searchParams.get("expiring") === "90";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContract, setEditContract] = useState<typeof mockContracts[0] | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const sorted = useMemo(() => {
    let list = [...mockContracts];
    if (filterExpiring) {
      const now = new Date();
      const in90 = new Date(now.getTime() + 90 * 86400000);
      list = list.filter((c) => {
        const d = new Date(c.end_date);
        return d >= now && d <= in90 && c.status === "actief";
      });
    }
    return list.sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
    );
  }, [filterExpiring]);

  const exportCSV = () => {
    const headers = ["School", "Type", "Start", "Einde", "Vernieuwing", "Status", "Waarde", "Beschrijving"];
    const rows = sorted.map((c) => {
      const school = mockSchools.find((s) => s.id === c.school_id);
      return [school?.name ?? "", c.contract_type, c.start_date, c.end_date, c.renewal_date, c.status, c.value ?? "", c.description ?? ""];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contracten_export.csv"; a.click();
  };

  const openEdit = (contract: typeof mockContracts[0]) => {
    setEditContract(contract);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditContract(undefined);
    setDialogOpen(true);
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Contracten</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Contract toevoegen
            </Button>
          )}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>School</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Einde</TableHead>
              <TableHead className="hidden md:table-cell">Vernieuwingsdatum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Waarde</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((c) => {
              const school = mockSchools.find((s) => s.id === c.school_id);
              const isExpanded = expandedId === c.id;
              const linkedEvents = (c.linked_event_ids || [])
                .map((eid) => mockEvents.find((e) => e.id === eid))
                .filter(Boolean);

              return (
                <>
                  <TableRow
                    key={c.id}
                    className={`hover:bg-muted/30 cursor-pointer ${getExpiryColor(c.end_date)}`}
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <TableCell className="px-2">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{school?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{c.contract_type}</TableCell>
                    <TableCell>{new Date(c.start_date).toLocaleDateString("nl-BE")}</TableCell>
                    <TableCell>{new Date(c.end_date).toLocaleDateString("nl-BE")}</TableCell>
                    <TableCell className="hidden md:table-cell">{new Date(c.renewal_date).toLocaleDateString("nl-BE")}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell className="text-right tabular-nums">{c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${c.id}-detail`} className="bg-muted/10 hover:bg-muted/10">
                      <TableCell colSpan={8} className="p-4">
                        <div className="space-y-3">
                          {c.description && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Beschrijving</p>
                              <p className="text-sm">{c.description}</p>
                            </div>
                          )}
                          {c.notes && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Notities</p>
                              <p className="text-sm">{c.notes}</p>
                            </div>
                          )}
                          {c.document_url && (
                            <div>
                              <a href={c.document_url} target="_blank" rel="noopener" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> Document bekijken
                              </a>
                            </div>
                          )}
                          {linkedEvents.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Gekoppelde evenementen</p>
                              <div className="flex flex-wrap gap-2">
                                {linkedEvents.map((event) => (
                                  <span
                                    key={event!.id}
                                    className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md"
                                  >
                                    <Calendar className="h-3 w-3" />
                                    {event!.name} — {new Date(event!.date).toLocaleDateString("nl-BE")}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="pt-1">
                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                              Bewerken
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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

      <ContractFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditContract(undefined); }}
        contract={editContract}
      />
    </div>
  );
}
