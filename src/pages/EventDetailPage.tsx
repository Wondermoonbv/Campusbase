import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useScholen } from "@/hooks/useScholen";
import { useOpleidingen, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X, Users, Clock, MapPin, CalendarDays, GraduationCap, CheckSquare, MessageSquare, UserCheck } from "lucide-react";
import type { Event, StandType, StandSize, EventType, EventStatus } from "@/types/crm";
import { toast } from "sonner";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { EventFeedbackTab } from "@/components/events/EventFeedbackTab";
import { EventAmbassadeursTab } from "@/components/events/EventAmbassadeursTab";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { evenementen, upsertEvent } = useEvenementen();
  const { scholen } = useScholen();
  const { opleidingen } = useOpleidingen();
  const { eventOpleidingen, setEventPrograms } = useEventOpleidingen();

  const event = evenementen.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [form, setForm] = useState<Event | null>(event ?? null);

  const initialProgramIds = useMemo(() => eventOpleidingen.filter((ep) => ep.event_id === id).map((ep) => ep.program_id), [id, eventOpleidingen]);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>(initialProgramIds);

  const programsBySchool = useMemo(() => {
    const groups: Record<string, { school: typeof scholen[0]; programs: typeof opleidingen }> = {};
    opleidingen.forEach((p) => { const s = scholen.find((sc) => sc.id === p.school_id); if (!s) return; if (!groups[s.id]) groups[s.id] = { school: s, programs: [] }; groups[s.id].programs.push(p); });
    return Object.values(groups);
  }, [scholen, opleidingen]);

  // Sync form when event data loads
  useMemo(() => { if (event && !form) setForm(event); }, [event]);

  if (!event || !form) {
    return (<div className="page-container animate-fade-in-up"><Button variant="ghost" size="sm" onClick={() => navigate("/evenementen")}><ArrowLeft className="h-4 w-4 mr-1" /> Terug</Button><p className="mt-6 text-muted-foreground">Evenement niet gevonden.</p></div>);
  }

  const school = event.school_id ? scholen.find((s) => s.id === event.school_id) : null;
  const linkedPrograms = opleidingen.filter((p) => selectedProgramIds.includes(p.id)).map((p) => ({ ...p, school: scholen.find((s) => s.id === p.school_id) }));
  const toggleProgram = (programId: string) => setSelectedProgramIds((prev) => prev.includes(programId) ? prev.filter((id) => id !== programId) : [...prev, programId]);

  const handleSave = async () => {
    try {
      await upsertEvent.mutateAsync(form);
      await setEventPrograms.mutateAsync({ eventId: form.id, programIds: selectedProgramIds });
      toast.success("Evenement bijgewerkt.");
      setEditing(false);
    } catch { toast.error("Fout bij opslaan."); }
  };

  const update = (patch: Partial<Event>) => setForm((prev) => prev ? { ...prev, ...patch } : prev);

  return (
    <div className="page-container animate-fade-in-up max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" className="shrink-0" aria-label="Terug naar evenementen" onClick={() => navigate("/evenementen")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0"><h1 className="text-lg sm:text-xl font-semibold truncate">{event.name}</h1><p className="text-xs sm:text-sm text-muted-foreground">{event.location}</p></div>
          <StatusBadge status={event.status} />
        </div>
        {canEdit && (editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => { setForm(event); setSelectedProgramIds(initialProgramIds); setEditing(false); }}><X className="h-4 w-4 mr-1" /> Annuleren</Button>
            <Button size="sm" className="h-10 sm:h-8" onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Opslaan</Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setTaskDialogOpen(true)}><CheckSquare className="h-4 w-4 mr-1" /> Taak</Button>
            <Button variant="outline" size="sm" className="h-10 sm:h-8" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> Bewerken</Button>
          </div>
        ))}
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="ambassadeurs" className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" /> Ambassadeurs
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> Feedback
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6">
        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Algemeen</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Naam" value={form.name} editing={editing} onChange={(v) => update({ name: v })} />
            <div><Label className="text-xs text-muted-foreground">Type</Label>{editing ? <Select value={form.type} onValueChange={(v) => update({ type: v as EventType })}><SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs">Jobbeurs</SelectItem><SelectItem value="campus presentatie">Campus presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="hackathon">Hackathon</SelectItem><SelectItem value="andere">Andere</SelectItem></SelectContent></Select> : <p className="text-sm capitalize">{form.type}</p>}</div>
            <div><Label className="text-xs text-muted-foreground">Status</Label>{editing ? <Select value={form.status} onValueChange={(v) => update({ status: v as EventStatus })}><SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gepland">Gepland</SelectItem><SelectItem value="bevestigd">Bevestigd</SelectItem><SelectItem value="afgelopen">Afgelopen</SelectItem><SelectItem value="geannuleerd">Geannuleerd</SelectItem></SelectContent></Select> : <StatusBadge status={form.status} />}</div>
            <div><Label className="text-xs text-muted-foreground">School</Label>{editing ? <Select value={form.school_id ?? ""} onValueChange={(v) => update({ school_id: v || null })}><SelectTrigger className="h-10 sm:h-9"><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent>{scholen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select> : <p className="text-sm">{school?.name ?? "Multi-school"}</p>}</div>
            <Field label="Locatie" value={form.location} editing={editing} onChange={(v) => update({ location: v })} icon={<MapPin className="h-3.5 w-3.5" />} />
            <Field label="Budget (€)" value={form.budget?.toString() ?? ""} editing={editing} onChange={(v) => update({ budget: v ? Number(v) : null })} type="number" />
          </div>
        </section>

        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Clock className="h-4 w-4" /> Datum & Tijd</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Datum" value={form.date} editing={editing} onChange={(v) => update({ date: v })} type="date" />
            <Field label="Startuur" value={form.start_time} editing={editing} onChange={(v) => update({ start_time: v })} type="time" />
            <Field label="Einduur" value={form.end_time} editing={editing} onChange={(v) => update({ end_time: v })} type="time" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Opbouwdatum" value={form.setup_date} editing={editing} onChange={(v) => update({ setup_date: v })} type="date" />
            <Field label="Opbouwuur" value={form.setup_time} editing={editing} onChange={(v) => update({ setup_time: v })} type="time" />
            <div />
          </div>
        </section>

        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Users className="h-4 w-4" /> Contactinfo & Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Elia contactpersoon" value={form.elia_contact} editing={editing} onChange={(v) => update({ elia_contact: v })} />
            <Field label="Verantwoordelijke" value={form.responsible} editing={editing} onChange={(v) => update({ responsible: v })} />
          </div>
          <div><Label className="text-xs text-muted-foreground">Teamleden aanwezig</Label>{editing ? <Input value={form.team_members.join(", ")} onChange={(e) => update({ team_members: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="Naam 1, Naam 2, ..." className="h-10 sm:h-9" /> : <div className="flex flex-wrap gap-1.5 mt-1">{form.team_members.length > 0 ? form.team_members.map((m) => <span key={m} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">{m}</span>) : <span className="text-sm text-muted-foreground">—</span>}</div>}</div>
        </section>

        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Doelgroep — Opleidingen</h2>
          {editing ? (
            <div className="space-y-3">{programsBySchool.map(({ school: s, programs }) => (
              <div key={s.id} className="border border-border rounded-lg p-3"><p className="text-xs font-semibold text-muted-foreground mb-2">{s.name}</p><div className="space-y-1.5">{programs.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm min-h-[44px] sm:min-h-0 py-1 sm:py-0"><Checkbox checked={selectedProgramIds.includes(p.id)} onCheckedChange={() => toggleProgram(p.id)} className="h-5 w-5 sm:h-4 sm:w-4" /><span>{p.name}</span><span className="text-xs text-muted-foreground capitalize">({p.study_level})</span></label>
              ))}</div></div>
            ))}</div>
          ) : (
            <div className="flex flex-wrap gap-2">{linkedPrograms.length > 0 ? linkedPrograms.map((p) => <span key={p.id} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">{p.name} — {p.school?.name}</span>) : <span className="text-sm text-muted-foreground">Geen doelgroep geselecteerd.</span>}</div>
          )}
        </section>

        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Inhoud & Stand</h2>
          <div><Label className="text-xs text-muted-foreground">Beschrijving</Label>{editing ? <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} /> : <p className="text-sm mt-1">{form.description || "—"}</p>}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label className="text-xs text-muted-foreground">Type stand</Label>{editing ? <Select value={form.stand_type} onValueChange={(v) => update({ stand_type: v as StandType })}><SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem><SelectItem value="infotafel">Infotafel</SelectItem><SelectItem value="presentatie">Presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="anders">Anders</SelectItem></SelectContent></Select> : <p className="text-sm capitalize mt-1">{form.stand_type}</p>}</div>
            <div><Label className="text-xs text-muted-foreground">Standformaat</Label>{editing ? <Select value={form.stand_size} onValueChange={(v) => update({ stand_size: v as StandSize })}><SelectTrigger className="h-10 sm:h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="klein 2m²">Klein 2m²</SelectItem><SelectItem value="medium 4m²">Medium 4m²</SelectItem><SelectItem value="groot 6m²+">Groot 6m²+</SelectItem><SelectItem value="anders">Anders</SelectItem></SelectContent></Select> : <p className="text-sm capitalize mt-1">{form.stand_size}</p>}</div>
          </div>
        </section>

        <section className="surface-card p-4 sm:p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Extra opmerkingen</h2>
          {editing ? <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} /> : <p className="text-sm">{form.notes || "—"}</p>}
        </section>
      </div>
        </TabsContent>

        <TabsContent value="ambassadeurs">
          <EventAmbassadeursTab eventId={event.id} />
        </TabsContent>

        <TabsContent value="feedback">
          <EventFeedbackTab eventId={event.id} eventName={event.name} />
        </TabsContent>
      </Tabs>

      <TaskFormDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} defaultEventId={event.id} defaultSchoolId={event.school_id} />
    </div>
  );
}

function Field({ label, value, editing, onChange, type = "text", icon }: { label: string; value: string; editing: boolean; onChange: (v: string) => void; type?: string; icon?: React.ReactNode; }) {
  return (<div><Label className="text-xs text-muted-foreground">{label}</Label>{editing ? <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 sm:h-9" /> : <p className="text-sm mt-1 flex items-center gap-1.5">{icon}{type === "date" && value ? new Date(value).toLocaleDateString("nl-BE") : value || "—"}</p>}</div>);
}
