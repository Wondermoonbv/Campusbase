import { useState, useMemo, useCallback, memo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useContacten, useScholen } from "@/hooks/useScholen";
import { useAuth } from "@/contexts/AuthContext";
import { ContactFormDialog } from "@/components/schools/ContactFormDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, Mail, Phone, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Contact } from "@/types/crm";

const ContactMobileCard = memo(function ContactMobileCard({
  contact: c, school, canEdit, onEdit, onDelete,
}: {
  contact: Contact; school: { id: string; name: string } | null; canEdit: boolean;
  onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  return (
    <div className="surface-card p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{c.name}</span>
        {canEdit && (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        )}
      </div>
      {c.role && <p className="text-xs text-muted-foreground">{c.role}</p>}
      {school ? (
        <Link to={`/scholen/${school.id}`} className="text-xs text-primary hover:underline">{school.name}</Link>
      ) : (
        <span className="text-xs text-muted-foreground italic">Geen school</span>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {c.email && <a href={`mailto:${c.email}`} className="text-primary hover:underline inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</a>}
        {c.phone && <span className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
      </div>
    </div>
  );
});

const ContactTableRow = memo(function ContactTableRow({
  contact: c, school, canEdit, onEdit, onDelete,
}: {
  contact: Contact; school: { id: string; name: string } | null; canEdit: boolean;
  onEdit: (c: Contact) => void; onDelete: (c: Contact) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{c.name}</TableCell>
      <TableCell>{c.role || "—"}</TableCell>
      <TableCell>
        {school ? (
          <Link to={`/scholen/${school.id}`} className="text-primary hover:underline">{school.name}</Link>
        ) : (
          <span className="text-muted-foreground italic text-xs">Geen school</span>
        )}
      </TableCell>
      <TableCell>{c.email ? <a href={`mailto:${c.email}`} className="text-primary hover:underline">{c.email}</a> : "—"}</TableCell>
      <TableCell>{c.phone || "—"}</TableCell>
      {canEdit && (
        <TableCell>
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}><Edit className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        </TableCell>
      )}
    </TableRow>
  );
});

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="surface-card p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-56" />
        </div>
      ))}
    </div>
  );
}

export default function ContactenPage() {
  const { contacten, isLoading, upsertContact, deleteContact } = useContacten();
  const { scholen } = useScholen();
  const { canEdit } = useAuth();

  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const schoolMap = useMemo(() => Object.fromEntries(scholen.map((s) => [s.id, s])), [scholen]);

  const filtered = useMemo(() => contacten.filter((c) => {
    const schoolName = c.school_id ? schoolMap[c.school_id]?.name ?? "" : "";
    const matchesSearch = !search || [c.name, c.email, schoolName].some((f) => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesSchool = schoolFilter === "all" || (schoolFilter === "__none__" ? !c.school_id : c.school_id === schoolFilter);
    return matchesSearch && matchesSchool;
  }), [contacten, schoolMap, search, schoolFilter]);

  const handleSave = useCallback(async (saved: Contact) => {
    try { await upsertContact.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  }, [upsertContact]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteContact.mutateAsync({ id: deleteTarget.id, name: deleteTarget.name });
      toast.success("Contact verwijderd.");
    } catch (error) {
      handleDeleteError(error, "contact");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteContact]);

  const handleEdit = useCallback((c: Contact) => { setEditContact(c); setDialogOpen(true); }, []);
  const handleDeleteClick = useCallback((c: Contact) => setDeleteTarget(c), []);

  return (
    <div className="page-container animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Contacten</h1>
        {canEdit && (
          <Button size="sm" onClick={() => { setEditContact(undefined); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Contact toevoegen
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Zoek op naam, email of school..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder="Alle scholen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle scholen</SelectItem>
            <SelectItem value="__none__">Geen school</SelectItem>
            {scholen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <ListSkeleton /> : contacten.length === 0 ? (
        <EmptyState icon={Users} title="Nog geen contacten toegevoegd" description="Voeg je eerste contact toe." actionLabel="Contact toevoegen" onAction={() => { setEditContact(undefined); setDialogOpen(true); }} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Geen contacten gevonden.</p>
            ) : filtered.map((c) => (
              <ContactMobileCard
                key={c.id}
                contact={c}
                school={c.school_id ? schoolMap[c.school_id] ?? null : null}
                canEdit={canEdit}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Rol / Functie</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefoon</TableHead>
                  {canEdit && <TableHead className="w-[100px]">Acties</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center py-8 text-muted-foreground">Geen contacten gevonden.</TableCell></TableRow>
                ) : filtered.map((c) => (
                  <ContactTableRow
                    key={c.id}
                    contact={c}
                    school={c.school_id ? schoolMap[c.school_id] ?? null : null}
                    canEdit={canEdit}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editContact} onSave={handleSave} showSchoolSelect />
      <DeleteConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} itemName={deleteTarget?.name ?? ""} isLoading={deleteContact.isPending} />
    </div>
  );
}
