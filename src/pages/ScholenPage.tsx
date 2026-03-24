import { useState, useMemo } from "react";
import { mockSchools, mockContacts } from "@/data/mockData";
import { School, SchoolType, SchoolStatus, Language, PROVINCES } from "@/types/crm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Download, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";

export default function ScholenPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterProvince, setFilterProvince] = useState<string>("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return mockSchools.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_name.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || s.type === filterType;
      const matchesProvince = filterProvince === "all" || s.province === filterProvince;
      const matchesLanguage = filterLanguage === "all" || s.language === filterLanguage;
      const matchesStatus = filterStatus === "all" || s.status === filterStatus;
      return matchesSearch && matchesType && matchesProvince && matchesLanguage && matchesStatus;
    });
  }, [search, filterType, filterProvince, filterLanguage, filterStatus]);

  const exportCSV = () => {
    const headers = ["Naam", "Type", "Stad", "Provincie", "Taal", "Status", "Contact", "Email"];
    const rows = filtered.map((s) => [s.name, s.type, s.city, s.province, s.language, s.status, s.contact_name, s.contact_email]);
    const csv = [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scholen_export.csv";
    a.click();
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Scholen</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> School toevoegen
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="surface-card p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Zoeken op naam, stad, contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle types</SelectItem>
              <SelectItem value="universiteit">Universiteit</SelectItem>
              <SelectItem value="hogeschool">Hogeschool</SelectItem>
              <SelectItem value="secundair">Secundair</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProvince} onValueChange={setFilterProvince}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Provincie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle provincies</SelectItem>
              {PROVINCES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterLanguage} onValueChange={setFilterLanguage}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Taal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle talen</SelectItem>
              <SelectItem value="NL">NL</SelectItem>
              <SelectItem value="FR">FR</SelectItem>
              <SelectItem value="EN">EN</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="actief">Actief</SelectItem>
              <SelectItem value="inactief">Inactief</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="surface-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Stad</TableHead>
              <TableHead className="hidden lg:table-cell">Provincie</TableHead>
              <TableHead className="hidden md:table-cell">Taal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Geen scholen gevonden.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((school) => (
                <TableRow
                  key={school.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => navigate(`/scholen/${school.id}`)}
                >
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell className="capitalize">{school.type}</TableCell>
                  <TableCell className="hidden md:table-cell">{school.city}</TableCell>
                  <TableCell className="hidden lg:table-cell">{school.province}</TableCell>
                  <TableCell className="hidden md:table-cell">{school.language}</TableCell>
                  <TableCell><StatusBadge status={school.status} /></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{school.contact_name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "school" : "scholen"} gevonden
        </div>
      </div>

      <SchoolFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
