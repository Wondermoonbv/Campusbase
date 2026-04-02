import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScholen } from "@/hooks/useScholen";
import { FIELDS_OF_STUDY } from "@/types/crm";
import type { Program } from "@/types/crm";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";

interface ProgramFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; program?: Program; schoolId?: string; onSave?: (program: Program) => void; }

export function ProgramFormDialog({ open, onOpenChange, program, schoolId, onSave }: ProgramFormDialogProps) {
  const isEdit = !!program;
  const { scholen } = useScholen();
  const [form, setForm] = useState({ name: "", school_id: schoolId ?? "", faculty: "", study_level: "bachelor" as string, field_of_study: "", student_count: "" });

  useEffect(() => {
    if (open) {
      if (program) { setForm({ name: program.name, school_id: program.school_id, faculty: program.faculty, study_level: program.study_level, field_of_study: program.field_of_study, student_count: program.student_count?.toString() ?? "" }); }
      else { setForm({ name: "", school_id: schoolId ?? "", faculty: "", study_level: "bachelor", field_of_study: "", student_count: "" }); }
    }
  }, [program, schoolId, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitized = sanitizeFormData(form);
    const saved: Program = { ...(program?.id ? { id: program.id } : {}), name: sanitized.name, school_id: sanitized.school_id, faculty: sanitized.faculty, study_level: sanitized.study_level as Program["study_level"], field_of_study: sanitized.field_of_study, student_count: sanitized.student_count ? Number(sanitized.student_count) : null } as Program;
    onSave?.(saved);
    toast.success(isEdit ? "Opleiding bijgewerkt." : "Opleiding toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>{isEdit ? "Opleiding bewerken" : "Nieuwe opleiding"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Naam *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={MAX_LENGTHS.name} /></div>
          <div className="space-y-2"><Label>School *</Label><Select value={form.school_id} onValueChange={(v) => setForm({ ...form, school_id: v })} required><SelectTrigger><SelectValue placeholder="Selecteer een school" /></SelectTrigger><SelectContent>{scholen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Faculteit</Label><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Niveau *</Label><Select value={form.study_level} onValueChange={(v) => setForm({ ...form, study_level: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="bachelor">Bachelor</SelectItem><SelectItem value="master">Master</SelectItem><SelectItem value="graduaat">Graduaat</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Studierichting</Label><Select value={form.field_of_study} onValueChange={(v) => setForm({ ...form, field_of_study: v })}><SelectTrigger><SelectValue placeholder="Kies..." /></SelectTrigger><SelectContent>{FIELDS_OF_STUDY.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Aantal studenten</Label><Input type="number" min="0" value={form.student_count} onChange={(e) => setForm({ ...form, student_count: e.target.value })} /></div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button><Button type="submit" disabled={!form.name || !form.school_id}>{isEdit ? "Opslaan" : "Toevoegen"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
