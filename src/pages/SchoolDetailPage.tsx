import { useParams, Link } from "react-router-dom";
import { mockSchools, mockPrograms, mockContracts, mockEvents, mockParticipations, mockContacts } from "@/data/mockData";
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

export default function SchoolDetailPage() {
  const { id } = useParams();
  const school = mockSchools.find((s) => s.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

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
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit className="h-4 w-4 mr-1" /> Bewerken
          </Button>
        </div>

        {/* Contact info */}
        <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-6 text-sm">
          {school.contact_name && (
            <span className="font-medium">{school.contact_name}</span>
          )}
          {school.contact_email && (
            <a href={`mailto:${school.contact_email}`} className="text-primary hover:underline inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {school.contact_email}
            </a>
          )}
          {school.contact_phone && (
            <a href={`tel:${school.contact_phone}`} className="text-muted-foreground inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {school.contact_phone}
            </a>
          )}
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

      {/* Tabs */}
      <Tabs defaultValue="programs">
        <TabsList>
          <TabsTrigger value="programs">Opleidingen ({programs.length})</TabsTrigger>
          <TabsTrigger value="contracts">Contracten ({contracts.length})</TabsTrigger>
          <TabsTrigger value="events">Evenementen ({events.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="mt-4">
          <div className="surface-card overflow-hidden">
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
    </div>
  );
}
