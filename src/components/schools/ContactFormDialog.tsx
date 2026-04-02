import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScholen } from "@/hooks/useScholen";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import type { Contact } from "@/types/crm";
import { toast } from "sonner";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId?: string | null;
  contact?: Contact;
  onSave?: (contact: Contact) => void;
  showSchoolSelect?: boolean;
}

export function ContactFormDialog({ open, onOpenChange, schoolId, contact, onSave, showSchoolSelect = false }: ContactFormDialogProps) {
  const isEdit = !!contact;
  const { scholen } = useScholen();
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "", department: "", notes: "", linkedin_url: "", school_id: schoolId ?? "" });

  useEffect(() => {
    if (open) {
      if (contact) {
        setForm({ name: contact.name, email: contact.email, phone: contact.phone, role: contact.role, department: contact.department, notes: contact.notes, linkedin_url: contact.linkedin_url, school_id: contact.school_id ?? "" });
      } else {
        setForm({ name: "", email: "", phone: "", role: "", department: "", notes: "", linkedin_url: "", school_id: schoolId ?? "" });
      }
    }
  }, [open, contact, schoolId]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast.error("Naam is verplicht."); return; }
    const sanitized = sanitizeFormData(form);
    const saved: Contact = {
      ...(contact?.id ? { id: contact.id } : {}),
      school_id: sanitized.school_id || null,
      name: sanitized.name,
      email: sanitized.email,
      phone: sanitized.phone,
      role: sanitized.role,
      department: sanitized.department,
      notes: sanitized.notes,
      linkedin_url: sanitized.linkedin_url,
    } as Contact;
    onSave?.(saved);
    toast.success(isEdit ? "Contactpersoon bijgewerkt." : "Contactpersoon toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Contact bewerken" : "Nieuw contactpersoon"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Naam *</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={MAX_LENGTHS.name} /></div>
          {showSchoolSelect && (
            <div>
              <Label>School</Label>
              <Select value={form.school_id} onValueChange={(v) => update("school_id", v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Geen school" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Geen school</SelectItem>
                  {scholen.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div><Label>Functie / Rol</Label><Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="bv. Career Services Manager" maxLength={MAX_LENGTHS.shortText} /></div>
          <div><Label>Afdeling</Label><Input value={form.department} onChange={(e) => update("department", e.target.value)} maxLength={MAX_LENGTHS.shortText} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} maxLength={MAX_LENGTHS.email} /></div><div><Label>Telefoon</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} maxLength={MAX_LENGTHS.phone} /></div></div>
          <div><Label>LinkedIn</Label><Input value={form.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." maxLength={MAX_LENGTHS.url} /></div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button><Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
