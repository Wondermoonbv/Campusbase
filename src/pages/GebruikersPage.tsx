import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { toast } from "sonner";
import type { AppUser, UserRole } from "@/contexts/AuthContext";
import { SortableTableHead, useSort, sortItems } from "@/components/ui/SortableTableHead";

export default function GebruikersPage() {
  const { users, addUser, updateUser, deleteUser, user: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", name: "", email: "", role: "viewer" as UserRole });
  const { sort, toggleSort } = useSort("lastName");

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

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <h1>Gebruikers</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Gebruiker toevoegen
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editUser ? "Gebruiker bewerken" : "Nieuwe gebruiker"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Voornaam *</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Achternaam</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
              <Button type="submit">{editUser ? "Opslaan" : "Toevoegen"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
