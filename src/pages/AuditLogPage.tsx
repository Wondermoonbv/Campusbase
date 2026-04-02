import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Plus, Pencil, Trash2, Search, Filter, Eye, Calendar,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";

interface AuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  changes: Record<string, unknown> | null;
  created_at: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "Aangemaakt", icon: Plus, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  update: { label: "Gewijzigd", icon: Pencil, color: "bg-blue-100 text-blue-700 border-blue-200" },
  delete: { label: "Verwijderd", icon: Trash2, color: "bg-red-100 text-red-700 border-red-200" },
};

const ENTITY_LABELS: Record<string, string> = {
  school: "School",
  contact: "Contact",
  opleiding: "Opleiding",
  evenement: "Evenement",
  contract: "Contract",
  taak: "Taak",
  ambassadeur: "Ambassadeur",
  inschrijving: "Inschrijving",
};

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit_log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, user_id, user_email, action, entity_type, entity_id, entity_name, changes, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) { console.error(error); return []; }
      return data as AuditEntry[];
    },
    refetchInterval: 30_000,
  });

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => { if (e.user_email) set.add(e.user_email); });
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (entityFilter !== "all" && e.entity_type !== entityFilter) return false;
      if (userFilter !== "all" && e.user_email !== userFilter) return false;
      if (dateFrom && e.created_at && new Date(e.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (e.created_at && new Date(e.created_at) > end) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const match =
          (e.entity_name ?? "").toLowerCase().includes(q) ||
          (e.user_email ?? "").toLowerCase().includes(q) ||
          (e.entity_type ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [entries, actionFilter, entityFilter, userFilter, dateFrom, dateTo, search]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "–";
    return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: nl });
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Activiteitenlog</h1>
        <p className="text-sm text-muted-foreground mt-1">Overzicht van alle wijzigingen in het systeem</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoeken..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Actie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle acties</SelectItem>
            <SelectItem value="create">Aangemaakt</SelectItem>
            <SelectItem value="update">Gewijzigd</SelectItem>
            <SelectItem value="delete">Verwijderd</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle types</SelectItem>
            {Object.entries(ENTITY_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Gebruiker" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle gebruikers</SelectItem>
            {uniqueUsers.map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateFrom ? format(dateFrom, "d MMM", { locale: nl }) : "Van"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateFrom} onSelect={setDateFrom} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateTo ? format(dateTo, "d MMM", { locale: nl }) : "Tot"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarPicker mode="single" selected={dateTo} onSelect={setDateTo} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo || actionFilter !== "all" || entityFilter !== "all" || userFilter !== "all" || search) && (
          <Button variant="ghost" size="sm" onClick={() => {
            setSearch(""); setActionFilter("all"); setEntityFilter("all"); setUserFilter("all"); setDateFrom(undefined); setDateTo(undefined);
          }}>
            Wis filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="surface-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Geen activiteiten gevonden.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">Datum/tijd</TableHead>
                <TableHead>Gebruiker</TableHead>
                <TableHead className="w-[120px]">Actie</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Record</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => {
                const cfg = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.update;
                const Icon = cfg.icon;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">{entry.user_email ?? "–"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {ENTITY_LABELS[entry.entity_type] ?? entry.entity_type}
                    </TableCell>
                    <TableCell className="text-sm font-medium truncate max-w-[200px]">
                      {entry.entity_name ?? "–"}
                    </TableCell>
                    <TableCell>
                      {entry.changes && Object.keys(entry.changes).length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setDetailEntry(entry)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailEntry} onOpenChange={() => setDetailEntry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Wijzigingsdetails</DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Datum</span>
                <span>{formatDate(detailEntry.created_at)}</span>
                <span className="text-muted-foreground">Gebruiker</span>
                <span>{detailEntry.user_email ?? "–"}</span>
                <span className="text-muted-foreground">Actie</span>
                <span>{ACTION_CONFIG[detailEntry.action]?.label ?? detailEntry.action}</span>
                <span className="text-muted-foreground">Type</span>
                <span>{ENTITY_LABELS[detailEntry.entity_type] ?? detailEntry.entity_type}</span>
                <span className="text-muted-foreground">Record</span>
                <span>{detailEntry.entity_name ?? "–"}</span>
              </div>
              {detailEntry.changes && Object.keys(detailEntry.changes).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Gewijzigde velden</p>
                  <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1 max-h-[300px] overflow-auto">
                    {Object.entries(detailEntry.changes).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground font-mono text-xs min-w-[120px]">{key}</span>
                        <span className="text-xs break-all">{typeof val === "object" ? JSON.stringify(val) : String(val ?? "–")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
