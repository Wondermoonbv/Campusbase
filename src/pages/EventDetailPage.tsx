import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useScholen, useContacten } from "@/hooks/useScholen";
import { useOpleidingen, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { useEventContactpersonen } from "@/hooks/useEventContactpersonen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Users, Clock, MapPin, CalendarDays, GraduationCap, CheckSquare, MessageSquare, UserCheck, Phone, Mail, AlertTriangle, Building2, Target, ClipboardList, FileText, Wrench } from "lucide-react";
import type { ContactpersoonRol, Event } from "@/types/crm";
import { toast } from "sonner";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { EventFeedbackTab } from "@/components/events/EventFeedbackTab";
import { EventFeedbackBanner } from "@/components/events/EventFeedbackBanner";
import { EventAmbassadeursTab } from "@/components/events/EventAmbassadeursTab";
import { EventFormDialog } from "@/components/events/EventFormDialog";
import { REGION_LABELS, EVENT_LANGUAGE_LABELS, TARGET_LEVEL_LABELS, REGISTRATION_TYPE_LABELS, FOLLOW_UP_LABELS, ORGANISATIE_TYPE_LABELS, CONTACTPERSOON_ROL_LABELS, contactpersoonRolVariant, followUpVariant } from "@/lib/event-labels";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { evenementen, upsertEvent } = useEvenementen();
  const { scholen } = useScholen();
  const { opleidingen } = useOpleidingen();
  const { eventOpleidingen } = useEventOpleidingen();
  const { contactpersonen: eventContactpersonen, syncContactpersonen } = useEventContactpersonen(id);

  const event = evenementen.find((e) => e.id === id);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventFormOpen, setEventFormOpen] = useState(false);

  const initialProgramIds = useMemo(() => eventOpleidingen.filter((ep) => ep.event_id === id).map((ep) => ep.program_id), [id, eventOpleidingen]);

  if (!event) {
    return (<div className="page-container animate-fade-in-up"><Button variant="ghost" size="sm" onClick={() => navigate("/evenementen")}><ArrowLeft className="h-4 w-4 mr-1" /> Terug</Button><p className="mt-6 text-muted-foreground">Evenement niet gevonden.</p></div>);
  }

  const organisator = event.organisator_id ? scholen.find((s) => s.id === event.organisator_id) : null;
  const linkedPrograms = opleidingen.filter((p) => initialProgramIds.includes(p.id)).map((p) => ({ ...p, school: scholen.find((s) => s.id === p.organisatie_id) }));

  const sortedContactpersonen = [...eventContactpersonen].sort((a, b) => {
    if (a.rol === "event_ter_plaatse" && b.rol !== "event_ter_plaatse") return -1;
    if (a.rol !== "event_ter_plaatse" && b.rol === "event_ter_plaatse") return 1;
    return (a.contact?.name || "").localeCompare(b.contact?.name || "");
  });

  const handleFormSave = async (saved: Event, cpEntries: { contact_id: string; rol: ContactpersoonRol }[]) => {
    try {
      const result = await upsertEvent.mutateAsync(saved);
      const eventId = (result as any)?.data?.id || saved.id || id;
      if (eventId) {
        await syncContactpersonen.mutateAsync({ eventId, items: cpEntries });
      }
    } catch { toast.error("Fout bij opslaan."); }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("nl-BE") : "—";
  const teamMembers = event.team_members || [];
  const hasNotes = !!event.notes && event.notes.trim().length > 0;
  const showStandSection = !!event.requires_booth_builder;

  return (
    <div className="page-container animate-fade-in-up max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="shrink-0" aria-label="Terug naar evenementen" onClick={() => navigate("/evenementen")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0"><h1 className="text-lg sm:text-xl font-semibold truncate">{event.name}</h1><p className="text-xs sm:text-sm text-muted-foreground">{event.location || "—"}</p></div>
          <StatusBadge status={event.status} />
          {event.follow_up_status && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${followUpVariant(event.follow_up_status)}`}>
              {FOLLOW_UP_LABELS[event.follow_up_status] || event.follow_up_status}
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setTaskDialogOpen(true)}><CheckSquare className="h-4 w-4 mr-1" /> Taak</Button>
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setEventFormOpen(true)}><Pencil className="h-4 w-4 mr-1" /> Bewerken</Button>
          </div>
        )}
      </div>

      <EventFeedbackBanner eventId={event.id} eventName={event.name} eventDate={event.date} />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="ambassadeurs" className="flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Ambassadeurs</TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 sm:space-y-6">

          {/* SECTIE 1 — Basis */}
          <section className="surface-card p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Basis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Naam" value={event.name} />
              <DetailField label="Type" value={event.type} className="capitalize" />
              <DetailField label="Status" value={<StatusBadge status={event.status} />} />
              <DetailField label="Datum" value={formatDate(event.date)} icon={<CalendarDays className="h-3.5 w-3.5" />} />
              <DetailField label="Tijd" value={event.start_time || event.end_time ? `${event.start_time || "—"} – ${event.end_time || "—"}` : "—"} icon={<Clock className="h-3.5 w-3.5" />} />
              <DetailField label="Locatie" value={event.location || "—"} icon={<MapPin className="h-3.5 w-3.5" />} />
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Organisator</Label>
                <p className="text-sm mt-1 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {organisator ? (
                    <Link to={`/organisaties/${organisator.id}`} className="text-primary hover:underline">
                      {organisator.name}
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{ORGANISATIE_TYPE_LABELS[organisator.type] || organisator.type}</span>
                    </Link>
                  ) : "—"}
                </p>
              </div>
              {event.description && (
                <div className="sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Beschrijving</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          </section>

          {/* SECTIE 2 — Doelgroep & bereik */}
          {(event.region || event.event_language || event.target_level || event.max_ambassadeurs || linkedPrograms.length > 0) && (
            <section className="surface-card p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Target className="h-4 w-4" /> Doelgroep & bereik</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {event.region && <DetailField label="Regio" value={REGION_LABELS[event.region] || event.region} />}
                {event.event_language && <DetailField label="Taal" value={EVENT_LANGUAGE_LABELS[event.event_language] || event.event_language} />}
                {event.target_level && <DetailField label="Doelgroepniveau" value={TARGET_LEVEL_LABELS[event.target_level] || event.target_level} />}
                {event.max_ambassadeurs != null && <DetailField label="Max. ambassadeurs" value={String(event.max_ambassadeurs)} />}
              </div>
              {linkedPrograms.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Opleidingen</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {linkedPrograms.map((p) => <span key={p.id} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{p.name} — {p.school?.name}</span>)}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* SECTIE 3 — Registratie & opvolging */}
          {(event.registration_type || event.follow_up_status || event.budget != null) && (
            <section className="surface-card p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Registratie & opvolging</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {event.registration_type && <DetailField label="Registratietype" value={REGISTRATION_TYPE_LABELS[event.registration_type] || event.registration_type} />}
                {event.follow_up_status && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Follow-up status</Label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${followUpVariant(event.follow_up_status)}`}>
                        {FOLLOW_UP_LABELS[event.follow_up_status] || event.follow_up_status}
                      </span>
                    </div>
                  </div>
                )}
                {event.budget != null && <DetailField label="Budget" value={`€ ${event.budget.toLocaleString("nl-BE")}`} />}
              </div>
            </section>
          )}

          {/* SECTIE 4 — Elia team */}
          {(event.elia_contact || teamMembers.length > 0) && (
            <section className="surface-card p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Users className="h-4 w-4" /> Elia team</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {event.elia_contact && <DetailField label="Elia contactpersoon" value={event.elia_contact} />}
                {teamMembers.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Teamleden aanwezig</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {teamMembers.map((m) => <span key={m} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{m}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SECTIE 5 — Contactpersonen bij organisator */}
          <section className="surface-card p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Phone className="h-4 w-4" /> Contactpersonen bij organisator</h2>
            {sortedContactpersonen.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-amber-800">Dit event heeft nog geen contactpersonen. Voeg minstens een contact ter plaatse toe.</p>
                  {canEdit && (
                    <Button variant="outline" size="sm" className="mt-2 h-8" onClick={() => setEventFormOpen(true)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Event bewerken
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedContactpersonen.map((cp) => (
                  <div key={cp.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0 mt-0.5 ${contactpersoonRolVariant(cp.rol)}`}>
                      {CONTACTPERSOON_ROL_LABELS[cp.rol] || cp.rol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <Link to="/contacten" className="text-primary hover:underline">{cp.contact?.name || "Onbekend contact"}</Link>
                        {cp.contact?.role && <span className="ml-1.5 text-xs text-muted-foreground">— {cp.contact.role}</span>}
                        {cp.contact?.department && <span className="text-xs text-muted-foreground"> ({cp.contact.department})</span>}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                        {cp.contact?.email && (
                          <a href={`mailto:${cp.contact.email}`} className="text-primary hover:underline flex items-center gap-1">
                            <Mail className="h-3 w-3" />{cp.contact.email}
                          </a>
                        )}
                        {cp.contact?.phone && (
                          <a href={`tel:${cp.contact.phone}`} className="text-primary hover:underline flex items-center gap-1">
                            <Phone className="h-3 w-3" />{cp.contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTIE 6 — Stand & opbouw */}
          {showStandSection && (
            <section className="surface-card p-4 sm:p-5 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Wrench className="h-4 w-4" /> Stand & opbouw</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {event.stand_type && <DetailField label="Stand type" value={event.stand_type} className="capitalize" />}
                {event.booth_size && <DetailField label="Stand grootte" value={event.booth_size} />}
                {event.setup_date && <DetailField label="Opbouwdatum" value={formatDate(event.setup_date)} />}
                {event.setup_time && <DetailField label="Opbouwtijd" value={event.setup_time} />}
                {event.teardown_time && <DetailField label="Afbraaktijd" value={event.teardown_time} />}
              </div>
            </section>
          )}

          {/* SECTIE 7 — Notities */}
          {hasNotes && (
            <section className="surface-card p-4 sm:p-5 space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><FileText className="h-4 w-4" /> Notities</h2>
              <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
            </section>
          )}
        </TabsContent>

        <TabsContent value="ambassadeurs">
          <EventAmbassadeursTab eventId={event.id} />
        </TabsContent>

        <TabsContent value="feedback">
          <EventFeedbackTab eventId={event.id} eventName={event.name} />
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} defaultEventId={event.id} defaultSchoolId={event.organisator_id} />
      <EventFormDialog open={eventFormOpen} onOpenChange={setEventFormOpen} event={event} onSave={handleFormSave} />
    </div>
  );
}

function DetailField({ label, value, icon, className }: { label: string; value: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={`text-sm mt-1 flex items-center gap-1.5 ${className || ""}`}>
        {icon}{value}
      </p>
    </div>
  );
}
