import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeliverableTypes, type ContractDeliverable, type DeliverableStatus } from "@/hooks/useContractDeliverables";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contractId: string;
  deliverable?: ContractDeliverable | null;
  onSave: (data: Partial<ContractDeliverable> & { contract_id: string; type: string }) => Promise<void>;
}

const STATUS_OPTIONS: DeliverableStatus[] = ["te leveren", "geleverd", "n.v.t."];

export function ContractDeliverableDialog({ open, onOpenChange, contractId, deliverable, onSave }: Props) {
  const { data: types = [] } = useDeliverableTypes();
  const [form, setForm] = useState({
    type: "",
    omschrijving: "",
    aantal: "",
    kanaal: "",
    status: "te leveren" as DeliverableStatus,
    deadline: "",
    geleverd_op: "",
    geschatte_waarde: "",
    waarde_score: "geen",
    evaluatie: "",
    notities: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      type: deliverable?.type ?? "",
      omschrijving: deliverable?.omschrijving ?? "",
      aantal: deliverable?.aantal != null ? String(deliverable.aantal) : "",
      kanaal: deliverable?.kanaal ?? "",
      status: (deliverable?.status as DeliverableStatus) ?? "te leveren",
      deadline: deliverable?.deadline ?? "",
      geleverd_op: deliverable?.geleverd_op ?? "",
      geschatte_waarde: deliverable?.geschatte_waarde != null ? String(deliverable.geschatte_waarde) : "",
      waarde_score: deliverable?.waarde_score != null ? String(deliverable.waarde_score) : "geen",
      evaluatie: deliverable?.evaluatie ?? "",
      notities: deliverable?.notities ?? "",
    });
  }, [open, deliverable]);

  const handleSave = async () => {
    if (!form.type) {
      toast.error("Kies een type.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        id: deliverable?.id,
        contract_id: contractId,
        type: form.type,
        omschrijving: form.omschrijving.trim() || null,
        aantal: form.aantal ? Number(form.aantal) : null,
        kanaal: form.kanaal.trim() || null,
        status: form.status,
        deadline: form.deadline || null,
        geleverd_op: form.geleverd_op || null,
        geschatte_waarde: form.geschatte_waarde ? Number(form.geschatte_waarde) : null,
        waarde_score: form.waarde_score !== "geen" ? Number(form.waarde_score) : null,
        evaluatie: form.evaluatie.trim() || null,
        notities: form.notities.trim() || null,
      } as any);
      toast.success("Tegenprestatie opgeslagen.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Fout bij opslaan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deliverable ? "Tegenprestatie bewerken" : "Tegenprestatie toevoegen"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue placeholder="Kies type" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as DeliverableStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Omschrijving</Label>
            <Input value={form.omschrijving} onChange={(e) => setForm({ ...form, omschrijving: e.target.value })} placeholder="bv. 1 pagina A4 in T-Magazine" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Aantal</Label>
              <Input type="number" min="0" value={form.aantal} onChange={(e) => setForm({ ...form, aantal: e.target.value })} />
            </div>
            <div>
              <Label>Kanaal</Label>
              <Input value={form.kanaal} onChange={(e) => setForm({ ...form, kanaal: e.target.value })} placeholder="bv. LinkedIn" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Deadline</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div>
              <Label>Geleverd op</Label>
              <Input type="date" value={form.geleverd_op} onChange={(e) => setForm({ ...form, geleverd_op: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Geschatte waarde (€)</Label>
              <Input type="number" min="0" step="0.01" value={form.geschatte_waarde} onChange={(e) => setForm({ ...form, geschatte_waarde: e.target.value })} />
            </div>
            <div>
              <Label>Waarde-score</Label>
              <Select value={form.waarde_score} onValueChange={(v) => setForm({ ...form, waarde_score: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geen">—</SelectItem>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Evaluatie</Label>
            <Textarea rows={2} value={form.evaluatie} onChange={(e) => setForm({ ...form, evaluatie: e.target.value })} />
          </div>
          <div>
            <Label>Notities</Label>
            <Textarea rows={2} value={form.notities} onChange={(e) => setForm({ ...form, notities: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuleren</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Opslaan..." : "Opslaan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}