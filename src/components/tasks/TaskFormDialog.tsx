import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { mockSchools, mockEvents } from "@/data/mockData";
import { toast } from "sonner";
import type { Task, TaskPriority, TaskStatus } from "@/types/crm";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSchoolId?: string | null;
  defaultEventId?: string | null;
  task?: Task | null;
  onSave?: (task: Task) => void;
}

const teamMembers = ["Ellen Geerts", "Naomi Geyskens", "Matthias Peeters", "Sarah Zekhnini", "Elie ten Cate"];

export function TaskFormDialog({ open, onOpenChange, defaultSchoolId, defaultEventId, task, onSave }: TaskFormDialogProps) {
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
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setSchoolId(task.school_id ?? "");
        setEventId(task.event_id ?? "");
        setAssignedTo(task.assigned_to);
        setDueDate(task.due_date);
        setPriority(task.priority);
        setStatus(task.status);
      } else {
        setTitle("");
        setDescription("");
        setSchoolId(defaultSchoolId ?? "");
        setEventId(defaultEventId ?? "");
        setAssignedTo("");
        setDueDate("");
        setPriority("normaal");
        setStatus("open");
      }
    }
  }, [open, task, defaultSchoolId, defaultEventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const saved: Task = {
      id: task?.id ?? `t${Date.now()}`,
      title,
      description: description || undefined,
      school_id: schoolId || null,
      event_id: eventId || null,
      assigned_to: assignedTo,
      due_date: dueDate,
      priority,
      status,
      created_at: task?.created_at ?? new Date().toISOString().slice(0, 10),
    };
    onSave?.(saved);
    toast.success(isEditing ? "Taak bijgewerkt" : "Taak aangemaakt");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Taak bewerken" : "Nieuwe taak"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-title">Titel *</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Wat moet er gebeuren?" />
          </div>
          <div>
            <Label htmlFor="task-desc">Omschrijving</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optionele details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Toegewezen aan *</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo} required>
                <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioriteit</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="laag">Laag</SelectItem>
                  <SelectItem value="normaal">Normaal</SelectItem>
                  <SelectItem value="hoog">Hoog</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Vervaldatum *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in behandeling">In behandeling</SelectItem>
                  <SelectItem value="afgerond">Afgerond</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
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
              <Label>Evenement</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {mockEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={!title || !assignedTo || !dueDate}>{isEditing ? "Opslaan" : "Aanmaken"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
