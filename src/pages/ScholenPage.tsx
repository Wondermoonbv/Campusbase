import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mockSchools, mockContacts } from "@/data/mockData";
import { School, SchoolType, SchoolStatus, Language, PROVINCES } from "@/types/crm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Download, ExternalLink, Pencil, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";
import { CsvImportDialog, CsvColumn } from "@/components/import/CsvImportDialog";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

const SCHOOL_CSV_COLUMNS: CsvColumn[] = [
  { key: "name", label: "Naam", required: true },
  { key: "type", label: "Type", required: true, validate: (v) => ["universiteit", "hogeschool", "secundair"].includes(v.toLowerCase()) ? null : "Moet universiteit, hogeschool of secundair zijn" },
  { key: "city", label: "Stad", required: true },
  { key: "province", label: "Provincie", required: true, validate: (v) => PROVINCES.includes(v) ? null : "Ongeldige provincie" },
  { key: "language", label: "Taal", required: true, validate: (v) => ["NL", "FR", "EN"].includes(v.toUpperCase()) ? null : "Moet NL, FR of EN zijn" },
  { key: "status", label: "Status", validate: (v) => ["actief", "inactief", "prospect"].includes(v.toLowerCase()) ? null : "Moet actief, inactief of prospect zijn" },
  { key: "website", label: "Website" },
  { key: "notes", label: "Notities" },
];

export default function ScholenPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") ?? "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editSchool, setEditSchool] = useState<School | undefined>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { sort, toggleSort } = useSort("name");

  const filtered = useMemo(() => {
    return mockSchools.filter((s) => {
      const contacts = mockContacts.filter(c => c.school_id === s.id);
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase()) ||
        contacts.some(c => c.name.toLowerCase().includes(search.toLowerCase()));
      const matchesType = filterType === "all" || s.type === filterType;
      const matchesProvince = filterProvince === "all" || s.province === filterProvince;
      const matchesLanguage = filterLanguage === "all" || s.language === filterLanguage;
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      return matchesSearch && matchesType && matchesProvince && matchesLanguage && matchesStatus;
    });
  }, [search, filterType, filterProvince, filterLanguage, filterStatus]);

  const sorted = useMemo(() => {
    return sortItems(filtered, sort, (s, key) => {
      switch (key) {
        case "name": return s.name;
        case "type": return s.type;
        case "city": return s.city;
        case "province": return s.province;
        case "language": return s.language;
        case "status": return s.status;
        default: return s.name;
      }
    });
  }, [filtered, sort]);

  const getFirstContact = (schoolId: string) => mockContacts.find(c => c.school_id === schoolId);

  const exportCSV = () => {
    const headers = ["Naam", "Type", "Stad", "Provincie", "Taal", "Status", "Contact", "Email"];
    const rows = sorted.map((s) => {
      const contact = getFirstContact(s.id);
      return [s.name, s.type, s.city, s.province, s.language, s.status, contact?.name || "", contact?.email || ""];
    });
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "scholen_export.csv"; a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Scholen</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" /> Import
            </Button>
          )}
          {canEdit && (
            <Button size="sm" className="h-10 sm:h-8" onClick={() => { setEditSchool(undefined); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> School toevoegen
            </Button>
          )}
        </div>
      </div>

      <div className="surface-card p-3 sm:p-4 mb-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Zoeken op naam, stad, contact..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                <SelectItem value="universiteit">Universiteit</SelectItem>
                <SelectItem value="hogeschool">Hogeschool</SelectItem>
                <SelectItem value="secundair">Secundair</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProvince} onValueChange={setFilterProvince}>
              <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="Provincie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle provincies</SelectItem>
                {PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterLanguage} onValueChange={setFilterLanguage}>
              <SelectTrigger className="w-full sm:w-[120px] h-10 sm:h-9"><SelectValue placeholder="Taal" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle talen</SelectItem>
                <SelectItem value="NL">NL</SelectItem>
                <SelectItem value="FR">FR</SelectItem>
                <SelectItem value="EN">EN</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle statussen</SelectItem>
                <SelectItem value="actief">Actief</SelectItem>
                <SelectItem value="inactief">Inactief</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-2">
        {sorted.length === 0 ? (
          <div className="surface-card p-6 text-center text-sm text-muted-foreground">Geen scholen gevonden.</div>
        ) : (
          sorted.map((school) => (
            <div
              key={school.id}
              className="surface-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/scholen/${school.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{school.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{school.type} · {school.city} · {school.language}</p>
                </div>
                <StatusBadge status={school.status} />
              </div>
              {getFirstContact(school.id) && (
                <p className="text-xs text-muted-foreground mt-2">{getFirstContact(school.id)?.name}</p>
              )}
            </div>
          ))
        )}
        <div className="text-xs text-muted-foreground px-1 pt-2">
          {sorted.length} {sorted.length === 1 ? "school" : "scholen"} gevonden
        </div>
      </div>

      {/* Desktop table view */}
      <div className="surface-card overflow-hidden hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="name" currentSort={sort} onSort={toggleSort}>Naam</SortableTableHead>
              <SortableTableHead sortKey="type" currentSort={sort} onSort={toggleSort}>Type</SortableTableHead>
              <SortableTableHead sortKey="city" currentSort={sort} onSort={toggleSort}>Stad</SortableTableHead>
              <SortableTableHead sortKey="province" currentSort={sort} onSort={toggleSort} className="hidden lg:table-cell">Provincie</SortableTableHead>
              <SortableTableHead sortKey="language" currentSort={sort} onSort={toggleSort}>Taal</SortableTableHead>
              <SortableTableHead sortKey="status" currentSort={sort} onSort={toggleSort}>Status</SortableTableHead>
              <TableHead className="hidden lg:table-cell">Contact</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen scholen gevonden.</TableCell>
              </TableRow>
            ) : (
              sorted.map((school) => (
                <TableRow key={school.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/scholen/${school.id}`)}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell className="capitalize">{school.type}</TableCell>
                  <TableCell>{school.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">{school.province}</TableCell>
                  <TableCell>{school.language}</TableCell>
                  <TableCell><StatusBadge status={school.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{getFirstContact(school.id)?.name || "—"}</TableCell>
                  <TableCell>
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditSchool(school); setDialogOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? "school" : "scholen"} gevonden
        </div>
      </div>

      <SchoolFormDialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditSchool(undefined); }} school={editSchool} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} title="Scholen importeren" columns={SCHOOL_CSV_COLUMNS} templateFilename="scholen_template.csv" onImport={(rows) => { console.log("Import schools:", rows); }} />
    </div>
  );
}
