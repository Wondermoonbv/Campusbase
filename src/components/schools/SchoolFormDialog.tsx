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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVINCES } from "@/types/crm";
import type { School } from "@/types/crm";
import { toast } from "sonner";

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School;
}

export function SchoolFormDialog({ open, onOpenChange, school }: SchoolFormDialogProps) {
  const isEdit = !!school;
  const [form, setForm] = useState({
    name: school?.name || "",
    type: school?.type || "universiteit",
    province: school?.province || "",
    city: school?.city || "",
    website: school?.website || "",
    contact_name: school?.contact_name || "",
    contact_email: school?.contact_email || "",
    contact_phone: school?.contact_phone || "",
    language: school?.language || "NL",
    notes: school?.notes || "",
    status: school?.status || "prospect",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city || !form.province) {
      toast.error("Vul alle verplichte velden in.");
      return;
    }
    toast.success(isEdit ? "School bijgewerkt." : "School toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "School bewerken" : "Nieuwe school"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="universiteit">Universiteit</SelectItem>
                  <SelectItem value="hogeschool">Hogeschool</SelectItem>
                  <SelectItem value="secundair">Secundair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Taal</Label>
              <Select value={form.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NL">NL</SelectItem>
                  <SelectItem value="FR">FR</SelectItem>
                  <SelectItem value="EN">EN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stad *</Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label>Provincie *</Label>
              <Select value={form.province} onValueChange={(v) => update("province", v)}>
                <SelectTrigger><SelectValue placeholder="Kies..." /></SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Website</Label>
            <Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="actief">Actief</SelectItem>
                <SelectItem value="inactief">Inactief</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <hr className="border-border" />
          <div>
            <Label>Contactpersoon</Label>
            <Input value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div>
              <Label>Telefoon</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} />
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
