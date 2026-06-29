import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PROVINCES } from "@/types/crm";
import type { School, OrganisatieType } from "@/types/crm";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { useScholen } from "@/hooks/useScholen";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";

const ORGANISATIE_TYPE_OPTIONS: { value: OrganisatieType; label: string }[] = [
  { value: "school", label: "School" },
  { value: "studentenvereniging", label: "Studentenvereniging" },
  { value: "werkgeversorganisatie", label: "Werkgeversorganisatie" },
  { value: "overheid", label: "Overheid" },
  { value: "andere", label: "Andere" },
];

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School;
  onSave?: (school: School) => void;
  defaultParentId?: string;
}

export function SchoolFormDialog({ open, onOpenChange, school, onSave, defaultParentId }: SchoolFormDialogProps) {
  const isEdit = !!school;
  const { scholen } = useScholen();
  const [form, setForm] = useState({
    name: "", type: "school" as OrganisatieType, school_type: "universiteit" as string, province: "", city: "",
    website: "", language: "NL" as string, notes: "", status: "prospect" as string,
    parent_id: "" as string,
    is_nationaal: false,
    verbonden_instelling_id: "" as string,
  });

  useEffect(() => {
    if (open) {
      if (school) {
        setForm({ name: school.name, type: school.type || "school", school_type: school.school_type, province: school.province, city: school.city, website: school.website || "", language: school.language, notes: school.notes || "", status: school.status, parent_id: school.parent_id || "", is_nationaal: !!school.is_nationaal, verbonden_instelling_id: school.verbonden_instelling_id || "" });
      } else {
        setForm({ name: "", type: "school", school_type: "universiteit", province: "", city: "", website: "", language: "NL", notes: "", status: "prospect", parent_id: defaultParentId || "", is_nationaal: false, verbonden_instelling_id: "" });
      }
    }
  }, [open, school, defaultParentId]);

  const update = (field: string, value: string | boolean) => setForm((p) => ({ ...p, [field]: value }));

  const isSchoolType = form.type === "school";
  const isStudentenvereniging = form.type === "studentenvereniging";
  const schoolOptions = scholen.filter((s) => s.type === "school" && s.id !== school?.id);

  // Eligible parents: hoofdorganisaties (parent_id IS NULL) and not self
  const parentOptions = scholen.filter((s) => !s.parent_id && s.id !== school?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Vul alle verplichte velden in.");
      return;
    }
    if (isSchoolType && (!form.city || !form.province)) {
      toast.error("Vul stad en provincie in voor scholen.");
      return;
    }
    const sanitized = sanitizeFormData(form);
    const saved: Partial<School> & { name: string } = {
      ...(school?.id ? { id: school.id } : {}),
      name: sanitized.name,
      type: sanitized.type as School["type"],
      school_type: isSchoolType ? sanitized.school_type as School["school_type"] : "universiteit",
      province: sanitized.province,
      city: sanitized.city,
      website: sanitized.website,
      language: isSchoolType ? sanitized.language as School["language"] : "NL",
      notes: sanitized.notes,
      status: sanitized.status as School["status"],
      parent_id: sanitized.parent_id && sanitized.parent_id !== "none" ? sanitized.parent_id : null,
      is_nationaal: isStudentenvereniging ? !!form.is_nationaal : false,
      verbonden_instelling_id: isStudentenvereniging && sanitized.verbonden_instelling_id && sanitized.verbonden_instelling_id !== "none" ? sanitized.verbonden_instelling_id : null,
    };
    onSave?.(saved as School);
    toast.success(isEdit ? "Organisatie bijgewerkt." : "Organisatie toegevoegd.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Organisatie bewerken" : "Nieuwe organisatie"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Naam *</Label><Input value={form.name} onChange={(e) => update("name", e.target.value)} maxLength={MAX_LENGTHS.name} /></div>
          <div><Label>Type organisatie *</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORGANISATIE_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isSchoolType && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>School-type</Label><Select value={form.school_type} onValueChange={(v) => update("school_type", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="universiteit">Universiteit</SelectItem><SelectItem value="hogeschool">Hogeschool</SelectItem><SelectItem value="secundair">Secundair</SelectItem></SelectContent></Select></div>
              <div><Label>Taal</Label><Select value={form.language} onValueChange={(v) => update("language", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="NL">NL</SelectItem><SelectItem value="FR">FR</SelectItem><SelectItem value="EN">EN</SelectItem></SelectContent></Select></div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Stad{isSchoolType ? " *" : ""}</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} maxLength={MAX_LENGTHS.shortText} /></div>
            <div><Label>Provincie{isSchoolType ? " *" : ""}</Label><Select value={form.province} onValueChange={(v) => update("province", v)}><SelectTrigger><SelectValue placeholder="Kies..." /></SelectTrigger><SelectContent>{PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Website</Label><Input value={form.website} onChange={(e) => update("website", e.target.value)} placeholder="https://" maxLength={MAX_LENGTHS.url} /></div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => update("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actief">Actief</SelectItem><SelectItem value="inactief">Inactief</SelectItem><SelectItem value="prospect">Prospect</SelectItem></SelectContent></Select></div>
          <div>
            <Label>Hoofdorganisatie</Label>
            <SearchableSelect
              value={form.parent_id}
              onValueChange={(v) => update("parent_id", v)}
              options={parentOptions.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Geen — dit is een hoofdorganisatie"
              searchInputPlaceholder="Zoek organisatie..."
              allowNone
              noneLabel="Geen — hoofdorganisatie"
            />
            <p className="text-xs text-muted-foreground mt-1">Laat leeg om zelf een hoofdorganisatie te zijn. Vul in om een campus / suborganisatie te maken.</p>
          </div>
          {isStudentenvereniging && (
            <>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <Label htmlFor="is_nationaal" className="cursor-pointer">Nationale vereniging</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Schakel in als deze vereniging nationaal actief is.</p>
                </div>
                <Switch id="is_nationaal" checked={form.is_nationaal} onCheckedChange={(v) => update("is_nationaal", v)} />
              </div>
              <div>
                <Label>Verbonden hogeschool/universiteit</Label>
                <SearchableSelect
                  value={form.verbonden_instelling_id}
                  onValueChange={(v) => update("verbonden_instelling_id", v)}
                  options={schoolOptions.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Geen — niet verbonden"
                  allowNone
                  noneLabel="Geen — niet verbonden"
                />
                <p className="text-xs text-muted-foreground mt-1">Optioneel. Koppel de vereniging aan een hogeschool of universiteit.</p>
              </div>
            </>
          )}
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={3} maxLength={MAX_LENGTHS.notes} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
            <Button type="submit">{isEdit ? "Opslaan" : "Toevoegen"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
