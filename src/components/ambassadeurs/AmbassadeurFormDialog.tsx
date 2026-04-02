import { useState, useEffect } from "react";
import type { Ambassadeur } from "@/hooks/useAmbassadeurs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ambassadeur: Ambassadeur | null;
  onSave: (amb: Partial<Ambassadeur> & { full_name: string; email: string }) => void;
}

export function AmbassadeurFormDialog({ open, onOpenChange, ambassadeur, onSave }: Props) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", department: "", notes: "", is_active: true,
  });

  useEffect(() => {
    if (open) {
      setForm(ambassadeur ? {
        full_name: ambassadeur.full_name, email: ambassadeur.email,
        phone: ambassadeur.phone ?? "", department: ambassadeur.department ?? "",
        notes: ambassadeur.notes ?? "", is_active: ambassadeur.is_active ?? true,
      } : { full_name: "", email: "", phone: "", department: "", notes: "", is_active: true });
    }
  }, [open, ambassadeur]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    const sanitized = sanitizeFormData(form);
    onSave({ ...(ambassadeur ? { id: ambassadeur.id } : {}), ...sanitized });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ambassadeur ? "Ambassadeur bewerken" : "Ambassadeur toevoegen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Naam *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={MAX_LENGTHS.name} /></div>
          <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={MAX_LENGTHS.email} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Telefoon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={MAX_LENGTHS.phone} /></div>
            <div><Label>Afdeling</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label className="text-sm">Actief</Label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit">Opslaan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
