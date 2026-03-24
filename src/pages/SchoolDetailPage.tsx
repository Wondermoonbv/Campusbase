import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Mail, Phone, Edit, Plus, Linkedin, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { SchoolFormDialog } from "@/components/schools/SchoolFormDialog";
import { ContactFormDialog } from "@/components/schools/ContactFormDialog";
import { ProgramFormDialog } from "@/components/programs/ProgramFormDialog";

export default function SchoolDetailPage() {
  const { id } = useParams();
  const school = mockSchools.find((s) => s.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<typeof contacts[0] | undefined>(undefined);
  const [programDialogOpen, setProgramDialogOpen] = useState(false);
  const { isAdmin } = useAuth();

  if (!school) {
    return (
      <div className="page-container">
        <p className="text-muted-foreground">School niet gevonden.</p>
        <Link to="/scholen" className="text-primary hover:underline text-sm mt-2 inline-block">
          ← Terug naar overzicht
        </Link>
      </div>
    );
  }

  const programs = mockPrograms.filter((p) => p.school_id === school.id);
  const contracts = mockContracts.filter((c) => c.school_id === school.id);
  const contacts = mockContacts.filter((c) => c.school_id === school.id);
  const participations = mockParticipations.filter((p) => p.school_id === school.id);
  const events = participations
    .map((p) => ({ ...p, event: mockEvents.find((e) => e.id === p.event_id) }))
    .filter((p) => p.event);

  return (
    <div className="page-container animate-fade-in-up">
      <Link to="/scholen" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="h-3 w-3" /> Terug naar scholen
      </Link>

      {/* Header */}
      <div className="surface-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1>{school.name}</h1>
              <StatusBadge status={school.status} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="capitalize">{school.type}</span>
              <span>{school.city}, {school.province}</span>
              <span>{school.language}</span>
            </div>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4 mr-1" /> Bewerken
            </Button>
          )}
        </div>

        {/* Website link */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-6 text-sm">
          {school.website && (
            <a href={school.website} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> Website
            </a>
          )}
        </div>
        {school.notes && (
          <p className="mt-3 text-sm text-muted-foreground">{school.notes}</p>
        )}
      </div>

      {/* Contactpersonen */}
      <div className="surface-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contactpersonen ({contacts.length})</h2>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => { setEditContact(undefined); setContactDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Contact toevoegen
            </Button>
          )}
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen contactpersonen gekoppeld.</p>
        ) : (
          <div className="grid gap-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-start gap-4 p-3 rounded-lg border border-border bg-muted/20">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{contact.name}</span>
                    {contact.role && <span className="text-xs text-muted-foreground">— {contact.role}</span>}
                  </div>
                  {contact.department && (
                    <p className="text-xs text-muted-foreground">{contact.department}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="text-muted-foreground inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </a>
                    )}
                    {contact.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{contact.notes}</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => { setEditContact(contact); setContactDialogOpen(true); }}>
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Opleidingen ({programs.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracten ({contracts.length})</TabsTrigger>
          <TabsTrigger value="events">Evenementen ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          <div className="surface-card overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-0">
              <span className="text-sm text-muted-foreground">{programs.length} opleiding{programs.length !== 1 ? "en" : ""}</span>
              <Button size="sm" variant="outline" onClick={() => setProgramDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Opleiding toevoegen
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opleiding</TableHead>
                  <TableHead>Faculteit</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Studierichting</TableHead>
                  <TableHead>Studenten</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Geen opleidingen gekoppeld.
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.faculty}</TableCell>
                      <TableCell className="capitalize">{p.study_level}</TableCell>
                      <TableCell>{p.field_of_study}</TableCell>
                      <TableCell className="tabular-nums">{p.student_count ?? "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="mt-4">
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Einde</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waarde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Geen contracten gekoppeld.
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="capitalize font-medium">{c.contract_type}</TableCell>
                      <TableCell>{new Date(c.start_date).toLocaleDateString("nl-BE")}</TableCell>
                      <TableCell>{new Date(c.end_date).toLocaleDateString("nl-BE")}</TableCell>
                      <TableCell><StatusBadge status={c.status} /></TableCell>
                      <TableCell className="tabular-nums">{c.value ? `€${c.value.toLocaleString("nl-BE")}` : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <div className="surface-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evenement</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Elia medewerkers</TableHead>
                  <TableHead>Studentcontacten</TableHead>
                  <TableHead>Beoordeling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Geen evenementdeelnames.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.event!.name}</TableCell>
                      <TableCell>{new Date(p.event!.date).toLocaleDateString("nl-BE")}</TableCell>
                      <TableCell className="tabular-nums">{p.staff_count}</TableCell>
                      <TableCell className="tabular-nums">{p.student_contacts}</TableCell>
                      <TableCell>{p.rating ? `${p.rating}/5` : "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <SchoolFormDialog open={editOpen} onOpenChange={setEditOpen} school={school} />
      <ContactFormDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} schoolId={school.id} contact={editContact} />
      <ProgramFormDialog open={programDialogOpen} onOpenChange={setProgramDialogOpen} schoolId={school.id} />
    </div>
  );
}
