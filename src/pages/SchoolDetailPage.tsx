import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useScholen, useContacten } from "@/hooks/useScholen";
import { useOpleidingen } from "@/hooks/useOpleidingen";
import { useContracten } from "@/hooks/useContracten";
import { useEvenementen } from "@/hooks/useEvenementen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Mail, Phone, Edit, Plus, Linkedin, User, CheckSquare, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";
import { ContactFormDialog } from "@/components/schools/ContactFormDialog";
import { ProgramFormDialog } from "@/components/programs/ProgramFormDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { handleDeleteError } from "@/lib/delete-helpers";
import { toast } from "sonner";
import type { School, Contact } from "@/types/crm";

export default function SchoolDetailPage() {
  const { id } = useParams();
  const { scholen, upsertSchool } = useScholen();
  const { contacten, upsertContact, deleteContact } = useContacten(id);
  const { opleidingen, upsertOpleiding } = useOpleidingen();
  const { contracten } = useContracten();
  const { evenementen } = useEvenementen();

  const school = scholen.find((s) => s.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>(undefined);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [deleteContactTarget, setDeleteContactTarget] = useState<Contact | null>(null);
  const { canEdit } = useAuth();

  if (!school) {
    return (
      <div className="page-container">
        <p className="text-muted-foreground">School niet gevonden.</p>
        <Link to="/scholen" className="text-primary hover:underline text-sm mt-2 inline-block">← Terug naar overzicht</Link>
      </div>
    );
  }

  const programs = opleidingen.filter((p) => p.school_id === school.id);
  const contracts = contracten.filter((c) => c.school_id === school.id);
  const schoolEvents = evenementen.filter((e) => e.school_id === school.id);

  const handleSaveSchool = async (saved: School) => {
    try { await upsertSchool.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  };

  const handleSaveContact = async (saved: Contact) => {
    try { await upsertContact.mutateAsync(saved); } catch { toast.error("Fout bij opslaan."); }
  };

  const handleDeleteContact = async () => {
    if (!deleteContactTarget) return;
    try {
      await deleteContact.mutateAsync({ id: deleteContactTarget.id, name: deleteContactTarget.name });
      toast.success("Contact verwijderd.");
    } catch (error) {
      handleDeleteError(error, "contact");
    }
    setDeleteContactTarget(null);
  };

  return (
    <div className="page-container animate-fade-in-up">
      <Link to="/scholen" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4"><ArrowLeft className="h-3 w-3" /> Terug naar scholen</Link>

      <div className="surface-card p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2"><h1 className="text-lg sm:text-2xl">{school.name}</h1><StatusBadge status={school.status} /></div>
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground"><span className="capitalize">{school.type}</span><span>{school.city}, {school.province}</span><span>{school.language}</span></div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setTaskDialogOpen(true)}><CheckSquare className="h-4 w-4 mr-1" /> Taak</Button>
              <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setEditOpen(true)}><Edit className="h-4 w-4 mr-1" /> Bewerken</Button>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 sm:gap-6 text-sm">
          {school.website && <a href={school.website} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Website</a>}
        </div>
        {school.notes && <p className="mt-3 text-sm text-muted-foreground">{school.notes}</p>}
      </div>

      <div className="surface-card p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Contactpersonen ({contacten.length})</h2>
          {canEdit && <Button size="sm" variant="outline" className="h-10 sm:h-8" onClick={() => { setEditContact(undefined); setContactDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Contact</Button>}
        </div>
        {contacten.length === 0 ? <p className="text-sm text-muted-foreground">Geen contactpersonen gekoppeld.</p> : (
          <div className="grid gap-3">
            {contacten.map((contact) => (
              <div key={contact.id} className="flex items-start gap-3 sm:gap-4 p-3 rounded-lg border border-border bg-muted/20">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium text-sm">{contact.name}</span>{contact.role && <span className="text-xs text-muted-foreground">— {contact.role}</span>}</div>
                  {contact.department && <p className="text-xs text-muted-foreground">{contact.department}</p>}
                  <div className="flex flex-wrap gap-2 sm:gap-3 mt-1.5 text-xs">
                    {contact.email && <a href={`mailto:${contact.email}`} className="text-primary hover:underline inline-flex items-center gap-1 break-all"><Mail className="h-3 w-3 shrink-0" /> {contact.email}</a>}
                    {contact.phone && <a href={`tel:${contact.phone}`} className="text-muted-foreground inline-flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" /> {contact.phone}</a>}
                    {contact.linkedin_url && <a href={contact.linkedin_url} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</a>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditContact(contact); setContactDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteContactTarget(contact)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="programs">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="programs" className="text-xs sm:text-sm">Opleidingen ({programs.length})</TabsTrigger>
          <TabsTrigger value="contracts" className="text-xs sm:text-sm">Contracten ({contracts.length})</TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm">Evenementen ({schoolEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          <div className="surface-card overflow-hidden">
            <div className="flex items-center justify-between p-3 sm:p-4 pb-0">
              <span className="text-sm text-muted-foreground">{programs.length} opleiding{programs.length !== 1 ? "en" : ""}</span>
              {canEdit && <Button size="sm" variant="outline" className="h-9 sm:h-8" onClick={() => setProgramDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Toevoegen</Button>}
            </div>
            <div className="hidden md:block">
              <Table><TableHeader><TableRow><TableHead>Opleiding</TableHead><TableHead>Faculteit</TableHead><TableHead>Niveau</TableHead><TableHead className="hidden lg:table-cell">Studierichting</TableHead><TableHead>Studenten</TableHead></TableRow></TableHeader>
                <TableBody>{programs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Geen opleidingen gekoppeld.</TableCell></TableRow> : programs.map((p) => (
                  <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.faculty}</TableCell><TableCell className="capitalize">{p.study_level}</TableCell><TableCell className="hidden lg:table-cell">{p.field_of_study}</TableCell><TableCell className="tabular-nums">{p.student_count ?? "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <div className="surface-card overflow-hidden">
            <div className="hidden md:block">
              <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>Einde</TableHead><TableHead>Status</TableHead><TableHead>Waarde</TableHead></TableRow></TableHeader>
                <TableBody>{contracts.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Geen contracten gekoppeld.</TableCell></TableRow> : contracts.map((c) => (
                  <TableRow key={c.id}><TableCell className="capitalize font-medium">{c.contract_type}</TableCell><TableCell>{new Date(c.start_date).toLocaleDateString("nl-BE")}</TableCell><TableCell>{new Date(c.end_date).toLocaleDateString("nl-BE")}</TableCell><TableCell><StatusBadge status={c.status} /></TableCell><TableCell className="tabular-nums">{c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</TableCell></TableRow>
                ))}</TableBody></Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <div className="surface-card overflow-hidden">
            <div className="hidden md:block">
              <Table><TableHeader><TableRow><TableHead>Evenement</TableHead><TableHead>Datum</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{schoolEvents.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Geen evenementen.</TableCell></TableRow> : schoolEvents.map((ev) => (
                  <TableRow key={ev.id}><TableCell className="font-medium">{ev.name}</TableCell><TableCell>{new Date(ev.date).toLocaleDateString("nl-BE")}</TableCell><TableCell className="capitalize">{ev.type}</TableCell><TableCell><StatusBadge status={ev.status} /></TableCell></TableRow>
                ))}</TableBody></Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <SchoolFormDialog open={editOpen} onOpenChange={setEditOpen} school={school} onSave={handleSaveSchool} />
      <ContactFormDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} schoolId={school.id} contact={editContact} onSave={handleSaveContact} />
      <ProgramFormDialog open={programDialogOpen} onOpenChange={setProgramDialogOpen} schoolId={school.id} onSave={async (p) => { try { await upsertOpleiding.mutateAsync(p); } catch { toast.error("Fout."); } }} />
      <TaskFormDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} defaultSchoolId={school.id} />
      <DeleteConfirmDialog open={!!deleteContactTarget} onClose={() => setDeleteContactTarget(null)} onConfirm={handleDeleteContact} itemName={deleteContactTarget?.name ?? ""} isLoading={deleteContact.isPending} />
    </div>
  );
}
