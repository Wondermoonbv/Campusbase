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
import { useContactmomenten, type Contactmoment, type ContactmomentType } from "@/hooks/useContactmomenten";
import { useProfiles } from "@/hooks/useProfiles";
import { MultiSelectPopover } from "@/components/ui/MultiSelectPopover";
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
  moment?: Contactmoment | null;
}

export function ContactmomentDialog({ open, onOpenChange, organisatieId, contactId, allowOrganisatieChange, onSaved, moment }: Props) {
  const { user } = useAuth();
  const isEdit = !!moment;
  const [orgId, setOrgId] = useState(moment?.organisatie_id ?? organisatieId ?? "");
  const { contacten } = useContacten(orgId || undefined);
  const { contacten: allContacten } = useContacten();
  const { profiles } = useProfiles();
  const { save } = useContactmomenten(orgId ? [orgId] : []);

  const [form, setForm] = useState({
    type: "notitie" as ContactmomentType,
    occurred_at: todayLocalDate(),
    onderwerp: "",
    notities: "",
    contact_id: contactId ?? "",
    collega_ids: [] as string[],
    contact_ids: [] as string[],
  });

  useEffect(() => {
    if (open) {
      if (moment) {
        setOrgId(moment.organisatie_id);
        setForm({
          type: moment.type,
          occurred_at: moment.occurred_at.slice(0, 10),
          onderwerp: moment.onderwerp,
          notities: moment.notities ?? "",
          contact_id: moment.contact_id ?? "",
          collega_ids: [...moment.collega_ids],
          contact_ids: [...moment.contact_ids],
        });
      } else {
        setOrgId(organisatieId ?? "");
        setForm({
          type: "notitie",
          occurred_at: todayLocalDate(),
          onderwerp: "",
          notities: "",
          contact_id: contactId ?? "",
          collega_ids: [],
          contact_ids: contactId ? [contactId] : [],
        });
      }
    }
  }, [open, organisatieId, contactId, moment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) { toast.error("Selecteer een organisatie."); return; }
    if (!form.onderwerp.trim()) { toast.error("Onderwerp is verplicht."); return; }
    const sanitized = sanitizeFormData({ onderwerp: form.onderwerp, notities: form.notities });
    // occurred_at: combine date with current time so it sorts naturally
    const occurredAt = isEdit
      ? new Date(`${form.occurred_at}T${new Date(moment!.occurred_at).toTimeString().slice(0, 8)}`).toISOString()
      : new Date(`${form.occurred_at}T${new Date().toTimeString().slice(0, 8)}`).toISOString();
    try {
      await save.mutateAsync({
        id: moment?.id,
        organisatie_id: orgId,
        contact_id: form.contact_id || null,
        type: form.type,
        occurred_at: occurredAt,
        onderwerp: sanitized.onderwerp,
        notities: sanitized.notities || null,
        created_by: isEdit ? (moment!.created_by ?? null) : (user?.id ?? null),
        collega_ids: form.collega_ids,
        contact_ids: form.contact_ids,
        _currentCollegaIds: moment?.collega_ids ?? [],
        _currentContactIds: moment?.contact_ids ?? [],
      });
      toast.success(isEdit ? "Contactmoment bijgewerkt." : "Contactmoment toegevoegd.");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Fout bij opslaan: " + (err?.message ?? ""));
    }
  };

  // Build contact options: start with org contacts, then add any other selected
  const contactOptionMap = new Map<string, string>();
  contacten.forEach((c) => contactOptionMap.set(c.id, c.name));
  allContacten.forEach((c) => {
    if (form.contact_ids.includes(c.id)) contactOptionMap.set(c.id, c.name);
  });
  // Also include any other contacten so users can freely add
  allContacten.forEach((c) => contactOptionMap.set(c.id, c.name));
  const contactOptions = Array.from(contactOptionMap.entries()).map(([value, label]) => ({ value, label }));
  const collegaOptions = profiles.map((p) => ({ value: p.id, label: p.full_name }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Contactmoment bewerken" : "Contactmoment loggen"}</DialogTitle></DialogHeader>
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
            <Label>Betrokken collega's</Label>
            <MultiSelectPopover
              options={collegaOptions}
              value={form.collega_ids}
              onChange={(v) => setForm((p) => ({ ...p, collega_ids: v }))}
              placeholder="Geen collega's geselecteerd"
              emptyText="Geen collega's gevonden"
            />
          </div>
          <div>
            <Label>Betrokken contactpersonen</Label>
            <MultiSelectPopover
              options={contactOptions}
              value={form.contact_ids}
              onChange={(v) => setForm((p) => ({ ...p, contact_ids: v }))}
              placeholder="Geen contactpersonen geselecteerd"
              emptyText="Geen contactpersonen gevonden"
            />
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notities.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notities} onChange={(e) => setForm((p) => ({ ...p, notities: e.target.value }))} rows={3} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Opslaan…" : (isEdit ? "Opslaan" : "Toevoegen")}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
