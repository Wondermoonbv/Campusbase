import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useActivity, ActivityAction, ActivityEntityType } from "@/contexts/ActivityContext";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Search, GraduationCap, CalendarDays, FileText, BookOpen, CheckSquare } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { toast } from "sonner";
import type { AppUser, UserRole } from "@/contexts/AuthContext";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

const entityIcons: Record<ActivityEntityType, React.ElementType> = {
  school: GraduationCap,
  evenement: CalendarDays,
  contract: FileText,
  opleiding: BookOpen,
  taak: CheckSquare,
};

const actionIcons: Record<ActivityAction, React.ElementType> = {
  aangemaakt: Plus,
  bewerkt: Pencil,
  verwijderd: Trash2,
};

const actionColors: Record<ActivityAction, string> = {
  aangemaakt: "text-success",
  bewerkt: "text-primary",
  verwijderd: "text-destructive",
};

function ActivityRow({ activity: a }: { activity: ReturnType<typeof useActivity>["activities"][0] }) {
  const ActionIcon = actionIcons[a.action];
  const EntityIcon = entityIcons[a.entityType];

  return (
    <div className="flex items-start sm:items-center gap-3 px-3 sm:px-4 py-3">
      <UserAvatar name={a.userName} avatarUrl={a.userAvatarUrl} className="h-8 w-8 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-relaxed">
          <span className="font-medium">{a.userName}</span>
          {" "}
          <span className="text-muted-foreground">heeft</span>
          {" "}
          <span className={`inline-flex items-center gap-1 font-medium ${actionColors[a.action]}`}>
            <ActionIcon className="h-3 w-3" />
            {a.action}
          </span>
          {": "}
          <span className="inline-flex items-center gap-1">
            <EntityIcon className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium">{a.entityName}</span>
          </span>
        </p>
      </div>
      <time className="text-xs text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true, locale: nl })}
      </time>
    </div>
  );
}

export default function GebruikersPage() {
  const { users, addUser, updateUser, deleteUser, user: currentUser } = useAuth();
  const { activities } = useActivity();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "activiteit" ? "activiteit" : "gebruikers";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", name: "", email: "", role: "viewer" as UserRole });
  const { sort, toggleSort } = useSort("lastName");

  const [actSearch, setActSearch] = useState("");
  const [filterUser, setFilterUser] = useState("alle");
  const [filterAction, setFilterAction] = useState("alle");
  const [filterPeriod, setFilterPeriod] = useState("alle");

  const sorted = useMemo(() => {
    return sortItems(users, sort, (u, key) => {
      switch (key) {
        case "lastName": return u.lastName ?? u.name;
        case "email": return u.email;
        case "role": return u.role;
        default: return u.lastName ?? u.name;
      }
    });
  }, [users, sort]);

  const activityUsers = useMemo(() =>
    [...new Map(activities.map((a) => [a.userId, a.userName])).values()].sort(),
    [activities]
  );

  const filtered = useMemo(() => {
    const now = Date.now();
    return activities.filter((a) => {
      if (actSearch && !a.entityName.toLowerCase().includes(actSearch.toLowerCase()) && !a.userName.toLowerCase().includes(actSearch.toLowerCase())) return false;
      if (filterUser !== "alle" && a.userName !== filterUser) return false;
      if (filterAction !== "alle" && a.action !== filterAction) return false;
      if (filterPeriod !== "alle") {
        const age = now - new Date(a.timestamp).getTime();
        if (filterPeriod === "vandaag" && age > 86400000) return false;
        if (filterPeriod === "week" && age > 7 * 86400000) return false;
        if (filterPeriod === "maand" && age > 30 * 86400000) return false;
      }
      return true;
    });
  }, [activities, actSearch, filterUser, filterAction, filterPeriod]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ firstName: "", lastName: "", name: "", email: "", role: "viewer" });
    setDialogOpen(true);
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setForm({ firstName: u.firstName ?? "", lastName: u.lastName ?? "", name: u.name, email: u.email, role: u.role });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) { toast.error("Vul alle velden in."); return; }
    const fullName = `${form.firstName} ${form.lastName}`.trim();
    if (editUser) {
      updateUser(editUser.id, { ...form, name: fullName });
      toast.success("Gebruiker bijgewerkt.");
    } else {
      if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
        toast.error("E-mailadres is al in gebruik.");
        return;
      }
      addUser({ ...form, name: fullName });
      toast.success("Gebruiker toegevoegd.");
    }
    setDialogOpen(false);
  };

  const handleDelete = (u: AppUser) => {
    if (u.id === currentUser?.id) { toast.error("Je kan jezelf niet verwijderen."); return; }
    deleteUser(u.id);
    toast.success("Gebruiker verwijderd.");
  };

  const handleTabChange = (value: string) => {
    if (value === "activiteit") {
      setSearchParams({ tab: "activiteit" });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <h1>Gebruikers</h1>
        {activeTab === "gebruikers" && (
          <Button size="sm" className="h-10 sm:h-8" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Gebruiker toevoegen
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="gebruikers">Gebruikers</TabsTrigger>
          <TabsTrigger value="activiteit">Activiteit</TabsTrigger>
        </TabsList>

        <TabsContent value="gebruikers" className="mt-4">
          {/* Mobile card view */}
          <div className="block md:hidden space-y-2">
            {sorted.map((u) => (
              <div key={u.id} className="surface-card p-4">
                <div className="flex items-center gap-3">
                  <UserAvatar name={u.name} avatarUrl={u.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleDelete(u)} disabled={u.id === currentUser?.id}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="surface-card overflow-hidden hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="lastName" currentSort={sort} onSort={toggleSort}>Naam</SortableTableHead>
                  <SortableTableHead sortKey="email" currentSort={sort} onSort={toggleSort}>E-mail</SortableTableHead>
                  <SortableTableHead sortKey="role" currentSort={sort} onSort={toggleSort}>Rol</SortableTableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={u.name} avatarUrl={u.avatarUrl} />
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(u)} disabled={u.id === currentUser?.id}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="activiteit" className="mt-4">
          <div className="surface-card p-3 sm:p-4 mb-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Zoeken..." value={actSearch} onChange={(e) => setActSearch(e.target.value)} className="pl-9 h-10 sm:h-9" />
              </div>
              <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger className="w-full sm:w-[180px] h-10 sm:h-9"><SelectValue placeholder="Gebruiker" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle gebruikers</SelectItem>
                    {activityUsers.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="w-full sm:w-[160px] h-10 sm:h-9"><SelectValue placeholder="Actie" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle acties</SelectItem>
                    <SelectItem value="aangemaakt">Aangemaakt</SelectItem>
                    <SelectItem value="bewerkt">Bewerkt</SelectItem>
                    <SelectItem value="verwijderd">Verwijderd</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-9 col-span-2 sm:col-span-1"><SelectValue placeholder="Periode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alle">Alle tijd</SelectItem>
                    <SelectItem value="vandaag">Vandaag</SelectItem>
                    <SelectItem value="week">Afgelopen week</SelectItem>
                    <SelectItem value="maand">Afgelopen maand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="surface-card overflow-hidden divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Geen activiteiten gevonden.</p>
            ) : (
              filtered.map((a) => <ActivityRow key={a.id} activity={a} />)
            )}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {filtered.length} activiteit{filtered.length !== 1 ? "en" : ""}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editUser ? "Gebruiker bewerken" : "Nieuwe gebruiker"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Voornaam *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="h-10 sm:h-9" />
              </div>
              <div className="space-y-2">
                <Label>Achternaam</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-10 sm:h-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="h-10 sm:h-9" />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="h-10 sm:h-9" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button type="submit" className="h-10 sm:h-9">{editUser ? "Opslaan" : "Toevoegen"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
