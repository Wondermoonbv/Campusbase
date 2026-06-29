import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganisatieSelect } from "@/components/organisaties/OrganisatieSelect";
import { useEvenementen } from "@/hooks/useEvenementen";
import type { Contract } from "@/types/crm";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { AttachmentsSection } from "@/components/shared/AttachmentsSection";

interface ContractFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; contract?: Contract; onSave?: (contract: Contract) => void; }

export function ContractFormDialog({ open, onOpenChange, contract, onSave }: ContractFormDialogProps) {
  const isEdit = !!contract;
  const { evenementen } = useEvenementen();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ organisatie_id: "", contract_type: "partnership" as string, start_date: "", end_date: "", renewal_date: "", status: "in onderhandeling" as string, value: "", description: "", document_url: "", notes: "", linked_event_ids: [] as string[], file: null as File | null, invoice_status: "open" as string, document_status: "" as string });

  useEffect(() => {
    if (open) {
      if (contract) {
        setForm({ organisatie_id: contract.organisatie_id, contract_type: contract.contract_type, start_date: contract.start_date, end_date: contract.end_date, renewal_date: contract.renewal_date, status: contract.status, value: contract.value?.toString() || "", description: contract.description || "", document_url: contract.document_url || "", notes: contract.notes || "", linked_event_ids: contract.linked_event_ids || [], file: null, invoice_status: contract.invoice_status || "open", document_status: contract.document_status || "" });
      } else {
        setForm({ organisatie_id: "", contract_type: "partnership", start_date: "", end_date: "", renewal_date: "", status: "in onderhandeling", value: "", description: "", document_url: "", notes: "", linked_event_ids: [], file: null, invoice_status: "open", document_status: "" });
      }
    }
  }, [open, contract]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const toggleEvent = (eventId: string) => setForm((p) => ({ ...p, linked_event_ids: p.linked_event_ids.includes(eventId) ? p.linked_event_ids.filter((id) => id !== eventId) : [...p.linked_event_ids, eventId] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organisatie_id || !form.start_date || !form.end_date) { toast.error("Vul organisatie, startdatum en einddatum in."); return; }
    const sanitized = sanitizeFormData(form);
    const saved: Contract = { ...(contract?.id ? { id: contract.id } : {}), organisatie_id: sanitized.organisatie_id, contract_type: sanitized.contract_type as Contract["contract_type"], start_date: sanitized.start_date, end_date: sanitized.end_date, renewal_date: sanitized.renewal_date, status: sanitized.status as Contract["status"], value: sanitized.value ? Number(sanitized.value) : null, description: sanitized.description, document_url: sanitized.document_url, notes: sanitized.notes, linked_event_ids: form.linked_event_ids, invoice_status: sanitized.invoice_status || "open", document_status: sanitized.document_status || null } as Contract;
    onSave?.(saved);
    toast.success(isEdit ? "Contract bijgewerkt." : "Contract toegevoegd.");
    onOpenChange(false);
  };

  const relevantEvents = form.organisatie_id ? evenementen.filter((e) => e.organisator_id === form.organisatie_id || !e.organisator_id) : evenementen;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Contract bewerken" : "Nieuw contract"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Organisatie *</Label>
            <OrganisatieSelect
              value={form.organisatie_id}
              onChange={(v) => update("organisatie_id", v)}
              placeholder="Kies een organisatie..."
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.contract_type} onValueChange={(v) => update("contract_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="sponsoring">Sponsoring</SelectItem><SelectItem value="stage-overeenkomst">Stage-overeenkomst</SelectItem><SelectItem value="andere">Andere</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in onderhandeling">In onderhandeling</SelectItem><SelectItem value="actief">Actief</SelectItem><SelectItem value="verlopen">Verlopen</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Factuurstatus</Label><Select value={form.invoice_status} onValueChange={(v) => update("invoice_status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="verzonden">Verzonden</SelectItem><SelectItem value="betaald">Betaald</SelectItem></SelectContent></Select></div>
            <div><Label>Ondertekening</Label><Select value={form.document_status} onValueChange={(v) => update("document_status", v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="">—</SelectItem><SelectItem value="opgemaakt">Opgemaakt</SelectItem><SelectItem value="getekend">Getekend</SelectItem><SelectItem value="tegengetekend">Tegengetekend</SelectItem></SelectContent></Select></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Beschrijving</Label><CharacterCounter current={form.description.length} max={MAX_LENGTHS.description} /></div>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} maxLength={MAX_LENGTHS.description} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Startdatum *</Label><Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} /></div>
            <div><Label>Einddatum *</Label><Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} /></div>
            <div><Label>Vernieuwingsdatum</Label><Input type="date" value={form.renewal_date} onChange={(e) => update("renewal_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Waarde (€)</Label><Input type="number" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="0" /></div>
            <div><Label>Document URL</Label><Input value={form.document_url} onChange={(e) => update("document_url", e.target.value)} placeholder="https://..." maxLength={MAX_LENGTHS.url} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div><Label className="mb-2 block">Gekoppelde evenementen</Label><div className="border border-border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1.5">{relevantEvents.length === 0 ? <p className="text-xs text-muted-foreground p-1">Geen evenementen beschikbaar.</p> : relevantEvents.map((event) => <label key={event.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/40 cursor-pointer"><Checkbox checked={form.linked_event_ids.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} /><span className="flex-1">{event.name}</span><span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString("nl-BE")}</span></label>)}</div></div>
          <div>
            <Label className="mb-2 block">Documenten</Label>
            {contract?.id ? (
              <AttachmentsSection entityType="contract" entityId={contract.id} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Sla het contract eerst op om documenten te kunnen toevoegen.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button><Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
