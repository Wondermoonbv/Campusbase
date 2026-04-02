import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScholen } from "@/hooks/useScholen";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useProfiles } from "@/hooks/useProfiles";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import type { Task, TaskPriority, TaskStatus } from "@/types/crm";

interface TaskFormDialogProps { open: boolean; onOpenChange: (v: boolean) => void; defaultSchoolId?: string | null; defaultEventId?: string | null; task?: Task | null; onSave?: (task: Task) => void; }

export function TaskFormDialog({ open, onOpenChange, defaultSchoolId, defaultEventId, task, onSave }: TaskFormDialogProps) {
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [eventId, setEventId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normaal");
  const [status, setStatus] = useState<TaskStatus>("open");
  const isEditing = !!task;

  useEffect(() => {
    if (open) {
      if (task) { setTitle(task.title); setDescription(task.description ?? ""); setSchoolId(task.school_id ?? ""); setEventId(task.event_id ?? ""); setAssignedTo(task.assigned_to); setDueDate(task.due_date); setPriority(task.priority); setStatus(task.status); }
      else { setTitle(""); setDescription(""); setSchoolId(defaultSchoolId ?? ""); setEventId(defaultEventId ?? ""); setAssignedTo(""); setDueDate(""); setPriority("normaal"); setStatus("open"); }
    }
  }, [open, task, defaultSchoolId, defaultEventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeFormData({ title, description, schoolId, eventId, assignedTo, dueDate });
    const saved: Task = { ...(task?.id ? { id: task.id } : {}), title: sanitized.title, description: sanitized.description || "", school_id: sanitized.schoolId || null, event_id: sanitized.eventId || null, assigned_to: sanitized.assignedTo, due_date: sanitized.dueDate, priority, status } as Task;
    onSave?.(saved);
    toast.success(isEditing ? "Taak bijgewerkt" : "Taak aangemaakt");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEditing ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between"><Label>Titel *</Label><CharacterCounter current={title.length} max={MAX_LENGTHS.title} /></div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Wat moet er gebeuren?" maxLength={MAX_LENGTHS.title} />
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Omschrijving</Label><CharacterCounter current={description.length} max={MAX_LENGTHS.description} /></div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={MAX_LENGTHS.description} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Toegewezen aan *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} required>
                <SelectTrigger>
                  <SelectValue placeholder={profilesLoading ? "Laden..." : "Selecteer"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Prioriteit</Label><Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="laag">Laag</SelectItem><SelectItem value="normaal">Normaal</SelectItem><SelectItem value="hoog">Hoog</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Vervaldatum *</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></div>
            <div><Label>Status</Label><Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="in behandeling">In behandeling</SelectItem><SelectItem value="afgerond">Afgerond</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>School</Label><Select value={schoolId} onValueChange={setSchoolId}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{scholen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Evenement</Label><Select value={eventId} onValueChange={setEventId}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{evenementen.map((ev) => <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button><Button type="submit" disabled={!title || !assignedTo || !dueDate}>{isEditing ? "Opslaan" : "Aanmaken"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
