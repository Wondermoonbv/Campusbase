import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Upload, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScholen } from "@/hooks/useScholen";
import { useEvenementen } from "@/hooks/useEvenementen";
import type { Contract } from "@/types/crm";
import { toast } from "sonner";

interface ContractFormDialogProps { open: boolean; onOpenChange: (open: boolean) => void; contract?: Contract; onSave?: (contract: Contract) => void; }

export function ContractFormDialog({ open, onOpenChange, contract, onSave }: ContractFormDialogProps) {
  const isEdit = !!contract;
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ school_id: "", contract_type: "partnership" as string, start_date: "", end_date: "", renewal_date: "", status: "in onderhandeling" as string, value: "", description: "", document_url: "", notes: "", linked_event_ids: [] as string[], file: null as File | null });

  useEffect(() => {
    if (open) {
      if (contract) {
        setForm({ school_id: contract.school_id, contract_type: contract.contract_type, start_date: contract.start_date, end_date: contract.end_date, renewal_date: contract.renewal_date, status: contract.status, value: contract.value?.toString() || "", description: contract.description || "", document_url: contract.document_url || "", notes: contract.notes || "", linked_event_ids: contract.linked_event_ids || [], file: null });
      } else {
        setForm({ school_id: "", contract_type: "partnership", start_date: "", end_date: "", renewal_date: "", status: "in onderhandeling", value: "", description: "", document_url: "", notes: "", linked_event_ids: [], file: null });
      }
    }
  }, [open, contract]);

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));
  const toggleEvent = (eventId: string) => setForm((p) => ({ ...p, linked_event_ids: p.linked_event_ids.includes(eventId) ? p.linked_event_ids.filter((id) => id !== eventId) : [...p.linked_event_ids, eventId] }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_id || !form.start_date || !form.end_date) { toast.error("Vul school, startdatum en einddatum in."); return; }
    const saved: Contract = { ...(contract?.id ? { id: contract.id } : {}), school_id: form.school_id, contract_type: form.contract_type as Contract["contract_type"], start_date: form.start_date, end_date: form.end_date, renewal_date: form.renewal_date, status: form.status as Contract["status"], value: form.value ? Number(form.value) : null, description: form.description, document_url: form.document_url, notes: form.notes, linked_event_ids: form.linked_event_ids } as Contract;
    onSave?.(saved);
    toast.success(isEdit ? "Contract bijgewerkt." : "Contract toegevoegd.");
    onOpenChange(false);
  };

  const relevantEvents = form.school_id ? evenementen.filter((e) => e.school_id === form.school_id || !e.school_id) : evenementen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Contract bewerken" : "Nieuw contract"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>School *</Label><Select value={form.school_id} onValueChange={(v) => update("school_id", v)}><SelectTrigger><SelectValue placeholder="Kies een school..." /></SelectTrigger><SelectContent>{scholen.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.contract_type} onValueChange={(v) => update("contract_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="partnership">Partnership</SelectItem><SelectItem value="sponsoring">Sponsoring</SelectItem><SelectItem value="stage-overeenkomst">Stage-overeenkomst</SelectItem><SelectItem value="andere">Andere</SelectItem></SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actief">Actief</SelectItem><SelectItem value="verlopen">Verlopen</SelectItem><SelectItem value="in onderhandeling">In onderhandeling</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Beschrijving</Label><Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Startdatum *</Label><Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} /></div>
            <div><Label>Einddatum *</Label><Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} /></div>
            <div><Label>Vernieuwingsdatum</Label><Input type="date" value={form.renewal_date} onChange={(e) => update("renewal_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Waarde (€)</Label><Input type="number" value={form.value} onChange={(e) => update("value", e.target.value)} placeholder="0" /></div>
            <div><Label>Document URL</Label><Input value={form.document_url} onChange={(e) => update("document_url", e.target.value)} placeholder="https://..." /></div>
          </div>
          <div><Label>Notities</Label><Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} /></div>
          <div><Label className="mb-2 block">Gekoppelde evenementen</Label><div className="border border-border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1.5">{relevantEvents.length === 0 ? <p className="text-xs text-muted-foreground p-1">Geen evenementen beschikbaar.</p> : relevantEvents.map((event) => <label key={event.id} className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/40 cursor-pointer"><Checkbox checked={form.linked_event_ids.includes(event.id)} onCheckedChange={() => toggleEvent(event.id)} /><span className="flex-1">{event.name}</span><span className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString("nl-BE")}</span></label>)}</div></div>
          <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button><Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
