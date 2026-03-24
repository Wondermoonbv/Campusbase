import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Contact } from "@/types/crm";
import { toast } from "sonner";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  contact?: Contact;
}

export function ContactFormDialog({ open, onOpenChange, schoolId, contact }: ContactFormDialogProps) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    name: contact?.name || "",
    email: contact?.email || "",
    phone: contact?.phone || "",
    role: contact?.role || "",
    department: contact?.department || "",
    notes: contact?.notes || "",
    linkedin_url: contact?.linkedin_url || "",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Naam is verplicht.");
      return;
    }
    toast.success(isEdit ? "Contactpersoon bijgewerkt." : "Contactpersoon toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Contact bewerken" : "Nieuw contactpersoon"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div>
            <Label>Functie / Rol</Label>
            <Input value={form.role} onChange={(e) => update("role", e.target.value)} placeholder="bv. Career Services Manager" />
          </div>
          <div>
            <Label>Afdeling</Label>
            <Input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="bv. Dienst Studentenvoorzieningen" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>LinkedIn</Label>
            <Input value={form.linkedin_url} onChange={(e) => update("linkedin_url", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
