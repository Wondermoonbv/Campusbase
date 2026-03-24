import { useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockSchools, mockEvents } from "@/data/mockData";
import type { Contract } from "@/types/crm";
import { toast } from "sonner";

interface ContractFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract;
}

export function ContractFormDialog({ open, onOpenChange, contract }: ContractFormDialogProps) {
  const isEdit = !!contract;
  const [form, setForm] = useState({
    school_id: contract?.school_id || "",
    contract_type: contract?.contract_type || "partnership",
    start_date: contract?.start_date || "",
    end_date: contract?.end_date || "",
    renewal_date: contract?.renewal_date || "",
    status: contract?.status || "in onderhandeling",
    value: contract?.value?.toString() || "",
    description: contract?.description || "",
    document_url: contract?.document_url || "",
    notes: contract?.notes || "",
    linked_event_ids: contract?.linked_event_ids || [] as string[],
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const toggleEvent = (eventId: string) => {
    setForm((p) => ({
      ...p,
      linked_event_ids: p.linked_event_ids.includes(eventId)
        ? p.linked_event_ids.filter((id) => id !== eventId)
        : [...p.linked_event_ids, eventId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.school_id || !form.start_date || !form.end_date) {
      toast.error("Vul school, startdatum en einddatum in.");
      return;
    }
    toast.success(isEdit ? "Contract bijgewerkt." : "Contract toegevoegd.");
    onOpenChange(false);
  };

  // Filter events relevant to selected school
  const relevantEvents = form.school_id
    ? mockEvents.filter((e) => e.school_id === form.school_id || !e.school_id)
    : mockEvents;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Contract bewerken" : "Nieuw contract"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>School *</Label>
            <Select value={form.school_id} onValueChange={(v) => update("school_id", v)}>
              <SelectTrigger><SelectValue placeholder="Kies een school..." /></SelectTrigger>
              <SelectContent>
                {mockSchools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.contract_type} onValueChange={(v) => update("contract_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="partnership">Partnership</SelectItem>
                  <SelectItem value="sponsoring">Sponsoring</SelectItem>
                  <SelectItem value="stage-overeenkomst">Stage-overeenkomst</SelectItem>
                  <SelectItem value="andere">Andere</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="actief">Actief</SelectItem>
                  <SelectItem value="verlopen">Verlopen</SelectItem>
                  <SelectItem value="in onderhandeling">In onderhandeling</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Beschrijving</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={3}
              placeholder="Wat omvat dit contract? Inhoud, afspraken, deliverables..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Startdatum *</Label>
              <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} />
            </div>
            <div>
              <Label>Einddatum *</Label>
              <Input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} />
            </div>
            <div>
              <Label>Vernieuwingsdatum</Label>
              <Input type="date" value={form.renewal_date} onChange={(e) => update("renewal_date", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Waarde (€)</Label>
              <Input
                type="number"
                value={form.value}
                onChange={(e) => update("value", e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Document URL</Label>
              <Input
                value={form.document_url}
                onChange={(e) => update("document_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <Label>Contract document (PDF)</Label>
            <div className="mt-1">
              {form.file ? (
                <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/20">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">{form.file.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {(form.file.size / 1024).toFixed(0)} KB
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setForm((p) => ({ ...p, file: null }))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  Klik om een PDF te uploaden
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  if (file && file.type !== "application/pdf") {
                    toast.error("Alleen PDF-bestanden zijn toegestaan.");
                    return;
                  }
                  setForm((p) => ({ ...p, file }));
                }}
              />
            </div>
          </div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
          </div>

          {/* Linked events */}
          <div>
            <Label className="mb-2 block">Gekoppelde evenementen</Label>
            <div className="border border-border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1.5">
              {relevantEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground p-1">Geen evenementen beschikbaar.</p>
              ) : (
                relevantEvents.map((event) => (
                  <label
                    key={event.id}
                    className="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted/40 cursor-pointer"
                  >
                    <Checkbox
                      checked={form.linked_event_ids.includes(event.id)}
                      onCheckedChange={() => toggleEvent(event.id)}
                    />
                    <span className="flex-1">{event.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("nl-BE")}
                    </span>
                  </label>
                ))
              )}
            </div>
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
