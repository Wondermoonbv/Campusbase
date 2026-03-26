import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mockPrograms, mockSchools, mockEvents, mockEventPrograms } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Download, Plus, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { FIELDS_OF_STUDY } from "@/types/crm";
import { ProgramFormDialog } from "@/components/programs/ProgramFormDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

export default function OpleidingenPage() {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterField, setFilterField] = useState("all");
  const [filterSchool, setFilterSchool] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProgram, setEditProgram] = useState<typeof mockPrograms[0] | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");

  const enriched = useMemo(() => {
    return mockPrograms.map((p) => ({
      ...p,
      school: mockSchools.find((s) => s.id === p.school_id),
      linkedEvents: mockEventPrograms
        .filter((ep) => ep.program_id === p.id)
        .map((ep) => mockEvents.find((e) => e.id === ep.event_id))
        .filter(Boolean),
    }));
  }, []);

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.school?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === "all" || p.study_level === filterLevel;
      const matchField = filterField === "all" || p.field_of_study === filterField;
      const matchSchool = filterSchool === "all" || p.school_id === filterSchool;
      return matchSearch && matchLevel && matchField && matchSchool;
    });
  }, [enriched, search, filterLevel, filterField, filterSchool]);

  const sorted = useMemo(() => {
    return sortItems(filtered, sort, (p, key) => {
      switch (key) {
        case "name": return p.name;
        case "school": return p.school?.name ?? "";
        case "faculty": return p.faculty;
        case "level": return p.study_level;
        case "field": return p.field_of_study;
        case "students": return p.student_count ?? 0;
        default: return p.name;
      }
    });
  }, [filtered, sort]);

  const exportCSV = () => {
    const headers = ["Opleiding", "School", "Faculteit", "Niveau", "Studierichting", "Studenten"];
    const rows = sorted.map((p) => [p.name, p.school?.name ?? "", p.faculty, p.study_level, p.field_of_study, p.student_count ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "opleidingen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Opleidingen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          {canEdit && (
            <Button size="sm" className="h-10 sm:h-8" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nieuwe opleiding
            </Button>
          )}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="School" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle scholen</SelectItem>
                {mockSchools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-9"><SelectValue placeholder="Niveau" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle niveaus</SelectItem>
                <SelectItem value="bachelor">Bachelor</SelectItem>
                <SelectItem value="master">Master</SelectItem>
                <SelectItem value="graduaat">Graduaat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterField} onValueChange={setFilterField}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9 col-span-2 sm:col-span-1"><SelectValue placeholder="Studierichting" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle richtingen</SelectItem>
                {FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-2">
        {sorted.length === 0 ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen opleidingen gevonden.</div>
        ) : (
          sorted.map((p) => (
            <div key={p.id} className="surface-card overflow-hidden">
              <div
                className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{p.name}</p>
                    <Link to={`/scholen/${p.school_id}`} className="text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{p.school?.name}</Link>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{p.study_level} · {p.field_of_study}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{p.student_count ?? "—"}</span>
                </div>
              </div>
              {expandedId === p.id && p.linkedEvents.length > 0 && (
                <div className="px-4 pb-3 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Gekoppelde evenementen</p>
                  <div className="flex flex-wrap gap-1.5">
                    {p.linkedEvents.map((ev) => ev && (
                      <Link key={ev.id} to={`/evenementen/${ev.id}`} className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/70">
                        {ev.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div className="text-xs text-muted-foreground px-1 pt-2">
          {sorted.length} opleiding{sorted.length !== 1 ? "en" : ""} gevonden
        </div>
      </div>

      {/* Desktop table view */}
      <div className="surface-card overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Opleiding</SortableTableHead>
              <SortableTableHead sortKey="school" currentSort={sort} onSort={toggleSort}>School</SortableTableHead>
              <SortableTableHead sortKey="faculty" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Faculteit</SortableTableHead>
              <SortableTableHead sortKey="level" currentSort={sort} onSort={toggleSort}>Niveau</SortableTableHead>
              <SortableTableHead sortKey="field" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Studierichting</SortableTableHead>
              <SortableTableHead sortKey="students" currentSort={sort} onSort={toggleSort} className="text-right">Studenten</SortableTableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen opleidingen gevonden.</TableCell>
              </TableRow>
            ) : (
              sorted.map((p) => (
                <>
                  <TableRow key={p.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <TableCell className="px-2">
                      {p.linkedEvents.length > 0 && (
                        expandedId === p.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Link to={`/scholen/${p.school_id}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{p.school?.name}</Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{p.faculty}</TableCell>
                    <TableCell className="capitalize">{p.study_level}</TableCell>
                    <TableCell className="hidden lg:table-cell">{p.field_of_study}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.student_count ?? "—"}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditProgram(p); setDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === p.id && p.linkedEvents.length > 0 && (
                    <TableRow key={`${p.id}-events`}>
                      <TableCell colSpan={8} className="bg-muted/20 px-6 py-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Gekoppelde evenementen</p>
                        <div className="flex flex-wrap gap-2">
                          {p.linkedEvents.map((ev) => ev && (
                            <Link key={ev.id} to={`/evenementen/${ev.id}`} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors">
                              <span className="font-medium">{ev.name}</span>
                              <span className="text-muted-foreground">{new Date(ev.date).toLocaleDateString("nl-BE")}</span>
                              <StatusBadge status={ev.status} />
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {sorted.length} opleiding{sorted.length !== 1 ? "en" : ""} gevonden
        </div>
      </div>

      <ProgramFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditProgram(undefined); }} program={editProgram} />
    </div>
  );
}
