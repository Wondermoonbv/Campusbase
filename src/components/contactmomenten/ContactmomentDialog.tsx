import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganisatieSelect } from "@/components/organisaties/OrganisatieSelect";
import { useAuth } from "@/contexts/AuthContext";
import { useContacten } from "@/hooks/useScholen";
import { useContactmomenten, type ContactmomentType } from "@/hooks/useContactmomenten";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { toast } from "sonner";

const NONE = "__none__";

const TYPE_OPTIONS: { value: ContactmomentType; label: string }[] = [
  { value: "mail", label: "Mail" },
  { value: "telefoon", label: "Telefoon" },
  { value: "meeting", label: "Meeting" },
  { value: "notitie", label: "Notitie" },
  { value: "andere", label: "Andere" },
];

function todayLocalDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisatieId?: string;
  contactId?: string | null;
  allowOrganisatieChange?: boolean;
  onSaved?: () => void;
}

export function ContactmomentDialog({ open, onOpenChange, organisatieId, contactId, allowOrganisatieChange, onSaved }: Props) {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState(organisatieId ?? "");
  const { contacten } = useContacten(orgId || undefined);
  const { create } = useContactmomenten(orgId ? [orgId] : []);

  const [form, setForm] = useState({
    type: "notitie" as ContactmomentType,
    occurred_at: todayLocalDate(),
    onderwerp: "",
    notities: "",
    contact_id: contactId ?? "",
  });

  useEffect(() => {
    if (open) {
      setOrgId(organisatieId ?? "");
      setForm({
        type: "notitie",
        occurred_at: todayLocalDate(),
        onderwerp: "",
        notities: "",
        contact_id: contactId ?? "",
      });
    }
  }, [open, organisatieId, contactId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) { toast.error("Selecteer een organisatie."); return; }
    if (!form.onderwerp.trim()) { toast.error("Onderwerp is verplicht."); return; }
    const sanitized = sanitizeFormData({ onderwerp: form.onderwerp, notities: form.notities });
    // occurred_at: combine date with current time so it sorts naturally
    const occurredAt = new Date(`${form.occurred_at}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    try {
      await create.mutateAsync({
        organisatie_id: orgId,
        contact_id: form.contact_id || null,
        type: form.type,
        occurred_at: occurredAt,
        onderwerp: sanitized.onderwerp,
        notities: sanitized.notities || null,
        created_by: user?.id ?? null,
      });
      toast.success("Contactmoment toegevoegd.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Fout bij opslaan: " + (err?.message ?? ""));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Contactmoment loggen</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {allowOrganisatieChange && (
            <div>
              <Label>Organisatie *</Label>
              <OrganisatieSelect value={orgId} onChange={setOrgId} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as ContactmomentType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input type="date" value={form.occurred_at} onChange={(e) => setForm((p) => ({ ...p, occurred_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Onderwerp *</Label>
            <Input value={form.onderwerp} onChange={(e) => setForm((p) => ({ ...p, onderwerp: e.target.value }))} maxLength={MAX_LENGTHS.shortText} placeholder="bv. Opvolging na jobbeurs" />
          </div>
          <div>
            <Label>Contactpersoon</Label>
            <Select
              value={form.contact_id || NONE}
              onValueChange={(v) => setForm((p) => ({ ...p, contact_id: v === NONE ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Geen specifieke contactpersoon" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Geen specifieke contactpersoon</SelectItem>
                {contacten.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notities.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notities} onChange={(e) => setForm((p) => ({ ...p, notities: e.target.value }))} rows={3} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? "Opslaan…" : "Toevoegen"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
