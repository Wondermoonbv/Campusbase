import { useState } from "react";
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
import type { TaskPriority } from "@/types/crm";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSchoolId?: string | null;
  defaultEventId?: string | null;
}

export function TaskFormDialog({ open, onOpenChange, defaultSchoolId, defaultEventId }: TaskFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [schoolId, setSchoolId] = useState(defaultSchoolId ?? "");
  const [eventId, setEventId] = useState(defaultEventId ?? "");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normaal");

  const teamMembers = ["Anna Verhoeven", "Tom De Graef", "Sarah Mertens", "Koen Willems"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Taak aangemaakt");
    onOpenChange(false);
    setTitle("");
    setDescription("");
    setSchoolId(defaultSchoolId ?? "");
    setEventId(defaultEventId ?? "");
    setAssignedTo("");
    setDueDate("");
    setPriority("normaal");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nieuwe taak</DialogTitle>
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
          <div>
            <Label>Vervaldatum *</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger>
                <SelectContent>
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
                  {mockEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>{ev.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={!title || !assignedTo || !dueDate}>Aanmaken</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
