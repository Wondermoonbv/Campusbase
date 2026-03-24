import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockEvents, mockSchools } from "@/data/mockData";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Save, X, Users, Clock, MapPin, CalendarDays } from "lucide-react";
import type { Event, StandType, StandSize, EventType, EventStatus } from "@/types/crm";
import { toast } from "sonner";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = mockEvents.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Event | null>(event ?? null);

  if (!event || !form) {
    return (
      <div className="page-container animate-fade-in-up">
        <Button variant="ghost" size="sm" onClick={() => navigate("/evenementen")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Terug
        </Button>
        <p className="mt-6 text-muted-foreground">Evenement niet gevonden.</p>
      </div>
    );
  }

  const school = event.school_id ? mockSchools.find((s) => s.id === event.school_id) : null;

  const handleSave = () => {
    toast.success("Evenement bijgewerkt.");
    setEditing(false);
  };

  const update = (patch: Partial<Event>) => setForm((prev) => prev ? { ...prev, ...patch } : prev);

  return (
    <div className="page-container animate-fade-in-up max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/evenementen")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <p className="text-sm text-muted-foreground">{event.location}</p>
          </div>
          <StatusBadge status={event.status} />
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setForm(event); setEditing(false); }}>
              <X className="h-4 w-4 mr-1" /> Annuleren
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Opslaan
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Bewerken
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* General info */}
        <section className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Algemeen</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Naam" value={form.name} editing={editing} onChange={(v) => update({ name: v })} />
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              {editing ? (
                <Select value={form.type} onValueChange={(v) => update({ type: v as EventType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
                    <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                    <SelectItem value="andere">Andere</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm capitalize">{form.type}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              {editing ? (
                <Select value={form.status} onValueChange={(v) => update({ status: v as EventStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gepland">Gepland</SelectItem>
                    <SelectItem value="bevestigd">Bevestigd</SelectItem>
                    <SelectItem value="afgelopen">Afgelopen</SelectItem>
                    <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <StatusBadge status={form.status} />
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">School</Label>
              {editing ? (
                <Select value={form.school_id ?? ""} onValueChange={(v) => update({ school_id: v || null })}>
                  <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                  <SelectContent>
                    {mockSchools.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{school?.name ?? "Multi-school"}</p>
              )}
            </div>
            <Field label="Locatie" value={form.location} editing={editing} onChange={(v) => update({ location: v })} icon={<MapPin className="h-3.5 w-3.5" />} />
            <Field label="Budget (€)" value={form.budget?.toString() ?? ""} editing={editing} onChange={(v) => update({ budget: v ? Number(v) : null })} type="number" />
          </div>
        </section>

        {/* Date & time */}
        <section className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Clock className="h-4 w-4" /> Datum & Tijd
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Datum" value={form.date} editing={editing} onChange={(v) => update({ date: v })} type="date" />
            <Field label="Startuur" value={form.start_time} editing={editing} onChange={(v) => update({ start_time: v })} type="time" />
            <Field label="Einduur" value={form.end_time} editing={editing} onChange={(v) => update({ end_time: v })} type="time" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Opbouwdatum" value={form.setup_date} editing={editing} onChange={(v) => update({ setup_date: v })} type="date" />
            <Field label="Opbouwuur" value={form.setup_time} editing={editing} onChange={(v) => update({ setup_time: v })} type="time" />
            <div />
          </div>
        </section>

        {/* Contact & team */}
        <section className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" /> Contactinfo & Team
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Elia contactpersoon" value={form.elia_contact} editing={editing} onChange={(v) => update({ elia_contact: v })} />
            <Field label="Verantwoordelijke" value={form.responsible} editing={editing} onChange={(v) => update({ responsible: v })} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Teamleden aanwezig</Label>
            {editing ? (
              <Input
                value={form.team_members.join(", ")}
                onChange={(e) => update({ team_members: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                placeholder="Naam 1, Naam 2, ..."
              />
            ) : (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.team_members.length > 0 ? form.team_members.map((m) => (
                  <span key={m} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                    {m}
                  </span>
                )) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Content / stand */}
        <section className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <CalendarDays className="h-4 w-4" /> Inhoud & Stand
          </h2>
          <div>
            <Label className="text-xs text-muted-foreground">Beschrijving</Label>
            {editing ? (
              <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
            ) : (
              <p className="text-sm mt-1">{form.description || "—"}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Type stand</Label>
              {editing ? (
                <Select value={form.stand_type} onValueChange={(v) => update({ stand_type: v as StandType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem>
                    <SelectItem value="infotafel">Infotafel</SelectItem>
                    <SelectItem value="presentatie">Presentatie</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm capitalize mt-1">{form.stand_type}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Standformaat</Label>
              {editing ? (
                <Select value={form.stand_size} onValueChange={(v) => update({ stand_size: v as StandSize })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="klein 2m²">Klein 2m²</SelectItem>
                    <SelectItem value="medium 4m²">Medium 4m²</SelectItem>
                    <SelectItem value="groot 6m²+">Groot 6m²+</SelectItem>
                    <SelectItem value="anders">Anders</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm capitalize mt-1">{form.stand_size}</p>
              )}
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Extra opmerkingen</h2>
          {editing ? (
            <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} />
          ) : (
            <p className="text-sm">{form.notes || "—"}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({
  label, value, editing, onChange, type = "text", icon,
}: {
  label: string; value: string; editing: boolean; onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing ? (
        <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="text-sm mt-1 flex items-center gap-1.5">
          {icon}
          {type === "date" && value ? new Date(value).toLocaleDateString("nl-BE") : value || "—"}
        </p>
      )}
    </div>
  );
}
