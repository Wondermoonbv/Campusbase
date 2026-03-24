import { useState, useMemo } from "react";
import { mockPrograms, mockSchools } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, Download } from "lucide-react";
import { FIELDS_OF_STUDY } from "@/types/crm";

export default function OpleidingenPage() {
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterField, setFilterField] = useState("all");

  const enriched = useMemo(() => {
    return mockPrograms.map((p) => ({
      ...p,
      school: mockSchools.find((s) => s.id === p.school_id),
    }));
  }, []);

  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.school?.name ?? "").toLowerCase().includes(search.toLowerCase());
      const matchLevel = filterLevel === "all" || p.study_level === filterLevel;
      const matchField = filterField === "all" || p.field_of_study === filterField;
      return matchSearch && matchLevel && matchField;
    });
  }, [enriched, search, filterLevel, filterField]);

  const exportCSV = () => {
    const headers = ["Opleiding", "School", "Faculteit", "Niveau", "Studierichting", "Studenten"];
    const rows = filtered.map((p) => [p.name, p.school?.name ?? "", p.faculty, p.study_level, p.field_of_study, p.student_count ?? ""]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "opleidingen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Opleidingen</h1>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="surface-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle niveaus</SelectItem>
              <SelectItem value="bachelor">Bachelor</SelectItem>
              <SelectItem value="master">Master</SelectItem>
              <SelectItem value="graduaat">Graduaat</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterField} onValueChange={setFilterField}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Studierichting" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle richtingen</SelectItem>
              {FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opleiding</TableHead>
              <TableHead>School</TableHead>
              <TableHead className="hidden md:table-cell">Faculteit</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead className="hidden md:table-cell">Studierichting</TableHead>
              <TableHead className="text-right">Studenten</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Geen opleidingen gevonden.</TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.school?.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.faculty}</TableCell>
                  <TableCell className="capitalize">{p.study_level}</TableCell>
                  <TableCell className="hidden md:table-cell">{p.field_of_study}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.student_count ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} opleiding{filtered.length !== 1 ? "en" : ""} gevonden
        </div>
      </div>
    </div>
  );
}
