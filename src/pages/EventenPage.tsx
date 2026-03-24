import { useState, useMemo } from "react";
import { mockEvents, mockSchools } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Download, CalendarDays, List } from "lucide-react";
import { toast } from "sonner";

export default function EventenPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    return mockEvents.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.type === filterType;
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [search, filterType, filterStatus]);

  // Group by month for calendar view
  const byMonth = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    filtered.forEach((e) => {
      const key = new Date(e.date).toLocaleDateString("nl-BE", { year: "numeric", month: "long" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const exportCSV = () => {
    const headers = ["Naam", "Type", "Datum", "Locatie", "Status", "Verantwoordelijke", "Budget"];
    const rows = filtered.map((e) => [e.name, e.type, e.date, e.location, e.status, e.responsible, e.budget ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "evenementen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Evenementen</h1>
        <div className="flex gap-2">
          <div className="flex border border-border rounded overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 text-sm ${view === "calendar" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Evenement toevoegen
          </Button>
        </div>
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
              <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
              <SelectItem value="workshop">Workshop</SelectItem>
              <SelectItem value="hackathon">Hackathon</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="gepland">Gepland</SelectItem>
              <SelectItem value="bevestigd">Bevestigd</SelectItem>
              <SelectItem value="afgelopen">Afgelopen</SelectItem>
              <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === "list" ? (
        <div className="surface-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evenement</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="hidden md:table-cell">Locatie</TableHead>
                <TableHead className="hidden lg:table-cell">School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Verantwoordelijke</TableHead>
                <TableHead className="hidden md:table-cell text-right">Budget</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ev) => {
                const school = ev.school_id ? mockSchools.find((s) => s.id === ev.school_id) : null;
                return (
                  <TableRow key={ev.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium">{ev.name}</TableCell>
                    <TableCell className="capitalize">{ev.type}</TableCell>
                    <TableCell>{new Date(ev.date).toLocaleDateString("nl-BE")}</TableCell>
                    <TableCell className="hidden md:table-cell">{ev.location}</TableCell>
                    <TableCell className="hidden lg:table-cell">{school?.name ?? "Multi-school"}</TableCell>
                    <TableCell><StatusBadge status={ev.status} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{ev.responsible}</TableCell>
                    <TableCell className="hidden md:table-cell text-right tabular-nums">
                      {ev.budget ? `€${ev.budget.toLocaleString("nl-BE")}` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="p-3 border-t border-border text-xs text-muted-foreground">
            {filtered.length} evenement{filtered.length !== 1 ? "en" : ""} gevonden
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {byMonth.map(([month, events]) => (
            <div key={month}>
              <h2 className="mb-3 capitalize">{month}</h2>
              <div className="space-y-2">
                {events.map((ev) => (
                  <div key={ev.id} className="surface-card p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[48px]">
                        <div className="text-2xl font-semibold tabular-nums">{new Date(ev.date).getDate()}</div>
                        <div className="text-xs text-muted-foreground uppercase">
                          {new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "short" })}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{ev.name}</p>
                        <p className="text-xs text-muted-foreground">{ev.location} · {ev.responsible}</p>
                      </div>
                    </div>
                    <StatusBadge status={ev.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <EventFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

function EventFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Evenement toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuw evenement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select defaultValue="jobbeurs">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
                  <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="andere">Andere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input type="date" required />
            </div>
          </div>
          <div>
            <Label>Locatie</Label>
            <Input />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>School</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
                  {mockSchools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Verantwoordelijke</Label>
              <Input />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget (€)</Label>
              <Input type="number" />
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue="gepland">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="bevestigd">Bevestigd</SelectItem>
                  <SelectItem value="afgelopen">Afgelopen</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit">Toevoegen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
