import { useState, useEffect } from "react";
import { mockSchools } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Event } from "@/types/crm";

interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event?: Event;
  onSave?: (event: Event) => void;
}

export function EventFormDialog({ open, onOpenChange, event, onSave }: EventFormDialogProps) {
  const isEdit = !!event;
  const [form, setForm] = useState({
    name: "", type: "jobbeurs" as string, date: "", start_time: "", end_time: "",
    location: "", school_id: "", responsible: "", elia_contact: "", team_members: "",
    description: "", stand_type: "jobbeurs stand" as string, stand_size: "medium 4m²" as string,
    budget: "", status: "gepland" as string, setup_date: "", setup_time: "", notes: "",
  });

  useEffect(() => {
    if (open) {
      if (event) {
        setForm({
          name: event.name, type: event.type, date: event.date, start_time: event.start_time || "",
          end_time: event.end_time || "", location: event.location, school_id: event.school_id || "",
          responsible: event.responsible, elia_contact: event.elia_contact || "",
          team_members: (event.team_members || []).join(", "), description: event.description || "",
          stand_type: event.stand_type || "jobbeurs stand", stand_size: event.stand_size || "medium 4m²",
          budget: event.budget?.toString() || "", status: event.status,
          setup_date: event.setup_date || "", setup_time: event.setup_time || "", notes: event.notes || "",
        });
      } else {
        setForm({
          name: "", type: "jobbeurs", date: "", start_time: "", end_time: "",
          location: "", school_id: "", responsible: "", elia_contact: "", team_members: "",
          description: "", stand_type: "jobbeurs stand", stand_size: "medium 4m²",
          budget: "", status: "gepland", setup_date: "", setup_time: "", notes: "",
        });
      }
    }
  }, [open, event]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved: Event = {
      id: event?.id ?? `ev${Date.now()}`,
      name: form.name,
      type: form.type as Event["type"],
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location,
      school_id: form.school_id || null,
      responsible: form.responsible,
      elia_contact: form.elia_contact,
      team_members: form.team_members ? form.team_members.split(",").map((s) => s.trim()).filter(Boolean) : [],
      description: form.description,
      stand_type: form.stand_type as Event["stand_type"],
      stand_size: form.stand_size as Event["stand_size"],
      budget: form.budget ? Number(form.budget) : undefined,
      status: form.status as Event["status"],
      setup_date: form.setup_date,
      setup_time: form.setup_time,
      notes: form.notes,
    };
    onSave?.(saved);
    toast.success(isEdit ? "Evenement bijgewerkt." : "Evenement toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Evenement bewerken" : "Nieuw evenement"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobbeurs">Jobbeurs</SelectItem>
                  <SelectItem value="campus presentatie">Campus presentatie</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="hackathon">Hackathon</SelectItem>
                  <SelectItem value="andere">Andere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startuur</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <Label>Einduur</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Locatie</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>School</Label>
              <Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {mockSchools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Verantwoordelijke</Label>
              <Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Elia contactpersoon</Label>
              <Input value={form.elia_contact} onChange={(e) => setForm({ ...form, elia_contact: e.target.value })} />
            </div>
            <div>
              <Label>Teamleden</Label>
              <Input placeholder="Naam 1, Naam 2, ..." value={form.team_members} onChange={(e) => setForm({ ...form, team_members: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Beschrijving</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type stand</Label>
              <Select value={form.stand_type} onValueChange={(v) => setForm({ ...form, stand_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem>
                  <SelectItem value="infotafel">Infotafel</SelectItem>
                  <SelectItem value="presentatie">Presentatie</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Standformaat</Label>
              <Select value={form.stand_size} onValueChange={(v) => setForm({ ...form, stand_size: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="klein 2m²">Klein 2m²</SelectItem>
                  <SelectItem value="medium 4m²">Medium 4m²</SelectItem>
                  <SelectItem value="groot 6m²+">Groot 6m²+</SelectItem>
                  <SelectItem value="anders">Anders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Budget (€)</Label>
              <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="bevestigd">Bevestigd</SelectItem>
                  <SelectItem value="afgelopen">Afgelopen</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Opbouwdatum</Label>
              <Input type="date" value={form.setup_date} onChange={(e) => setForm({ ...form, setup_date: e.target.value })} />
            </div>
            <div>
              <Label>Opbouwuur</Label>
              <Input type="time" value={form.setup_time} onChange={(e) => setForm({ ...form, setup_time: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
