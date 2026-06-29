import { useState, useEffect, useMemo, type ChangeEvent, type FocusEvent } from "react";
import { useScholen, useContacten } from "@/hooks/useScholen";
import { useEventContactpersonen } from "@/hooks/useEventContactpersonen";
import { useEventOrganisaties } from "@/hooks/useEventOrganisaties";
import { useOpleidingen, useEventOpleidingen } from "@/hooks/useOpleidingen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { FormSection } from "@/components/events/FormSection";
import { AttachmentsSection } from "@/components/shared/AttachmentsSection";
import { REGION_LABELS, EVENT_LANGUAGE_LABELS, TARGET_LEVEL_LABELS, REGISTRATION_TYPE_LABELS, FOLLOW_UP_LABELS, ORGANISATIE_TYPE_LABELS, CONTACTPERSOON_ROL_LABELS, INVOICE_STATUS_LABELS } from "@/lib/event-labels";
import type { Event, ContactpersoonRol } from "@/types/crm";
import { Trash2, Plus, AlertTriangle, ChevronsUpDown, X, Building2 } from "lucide-react";

interface ContactpersoonEntry {
  contact_id: string;
  rol: ContactpersoonRol;
}

type TimeField = "start_time" | "end_time" | "setup_time" | "teardown_time";

interface EventFormDialogProps { open: boolean; onOpenChange: (v: boolean) => void; event?: Event; onSave?: (event: Event, contactpersonen: ContactpersoonEntry[], organisatieIds: string[], opleidingIds: string[]) => void; }

export function EventFormDialog({ open, onOpenChange, event, onSave }: EventFormDialogProps) {
  const isEdit = !!event;
  const { scholen } = useScholen();
  const { contacten: allContacten } = useContacten();
  const { contactpersonen: existingCP } = useEventContactpersonen(event?.id);
  const { links: existingOrgLinks } = useEventOrganisaties(event?.id);
  const { opleidingen: allOpleidingen } = useOpleidingen();
  const { eventOpleidingen } = useEventOpleidingen();
  const [confirmOrgChange, setConfirmOrgChange] = useState<string | null>(null);
  const [timeInputVersion, setTimeInputVersion] = useState(0);
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([]);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState("");
  const [selectedOpleidingIds, setSelectedOpleidingIds] = useState<string[]>([]);
  const [opleidingPickerOpen, setOpleidingPickerOpen] = useState(false);
  const [opleidingSearch, setOpleidingSearch] = useState("");

  const [form, setForm] = useState({
    name: "", type: "jobbeurs" as string, date: "", start_time: "", end_time: "",
    location: "", organisator_id: "", elia_contact: "", team_members: "",
    description: "", stand_type: "jobbeurs stand" as string,
    budget: "", status: "gepland" as string, setup_date: "", setup_time: "", notes: "",
    requires_booth_builder: false, teardown_time: "", booth_size: "",
    max_ambassadeurs: "",
    region: "" as string, event_language: "" as string, target_level: "" as string,
    registration_type: "" as string, follow_up_status: "to_do" as string,
    booth_number: "", parking_info: "", locker_code: "",
    invoice_status: "open" as string,
  });

  const [cpEntries, setCpEntries] = useState<ContactpersoonEntry[]>([]);

  const updateTimeField = (field: TimeField, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleTimeChange = (field: TimeField) => (e: ChangeEvent<HTMLInputElement>) => {
    const { value, validity } = e.currentTarget;
    if (value && validity.valid) {
      updateTimeField(field, value);
    }
  };

  const handleTimeBlur = (field: TimeField) => (e: FocusEvent<HTMLInputElement>) => {
    const { value, validity } = e.currentTarget;
    updateTimeField(field, value && validity.valid ? value : "");
  };

  useEffect(() => {
    if (open) {
      setTimeInputVersion((prev) => prev + 1);
    }
  }, [open, event?.id]);

  useEffect(() => {
    if (open) {
      if (event) {
        setForm({
          name: event.name, type: event.type, date: event.date,
          start_time: event.start_time || "", end_time: event.end_time || "",
          location: event.location, organisator_id: event.organisator_id || "",
          elia_contact: event.elia_contact || "",
          team_members: (event.team_members || []).join(", "),
          description: event.description || "",
          stand_type: event.stand_type || "jobbeurs stand",
          budget: event.budget?.toString() || "", status: event.status,
          setup_date: event.setup_date || "", setup_time: event.setup_time || "",
          notes: event.notes || "",
          requires_booth_builder: event.requires_booth_builder ?? false,
          teardown_time: event.teardown_time || "",
          booth_size: event.booth_size || "",
          max_ambassadeurs: event.max_ambassadeurs?.toString() || "",
          region: event.region || "", event_language: event.event_language || "",
          target_level: event.target_level || "",
          registration_type: event.registration_type || "",
          follow_up_status: event.follow_up_status || "to_do",
          booth_number: event.booth_number || "",
          parking_info: event.parking_info || "",
          locker_code: event.locker_code || "",
          invoice_status: event.invoice_status || "open",
        });
      } else {
        setForm({
          name: "", type: "jobbeurs", date: "", start_time: "", end_time: "",
          location: "", organisator_id: "", elia_contact: "",
          team_members: "", description: "", stand_type: "jobbeurs stand",
          budget: "", status: "gepland", setup_date: "",
          setup_time: "", notes: "", requires_booth_builder: false, teardown_time: "",
          booth_size: "",
          max_ambassadeurs: "",
          region: "", event_language: "", target_level: "", registration_type: "",
          follow_up_status: "to_do",
          booth_number: "", parking_info: "", locker_code: "",
          invoice_status: "open",
        });
        setCpEntries([]);
        setSelectedOrgIds([]);
        setSelectedOpleidingIds([]);
      }
    }
  }, [open, event]);

  // Sync contactpersonen separately when they load (only for edit mode)
  useEffect(() => {
    if (open && event) {
      setCpEntries(existingCP.map((cp) => ({ contact_id: cp.contact_id, rol: cp.rol })));
    }
  }, [open, event?.id, existingCP]);

  // Load existing org links into selection when editing
  useEffect(() => {
    if (open && event) {
      setSelectedOrgIds(existingOrgLinks.map((l) => l.organisatie_id));
    }
  }, [open, event?.id, existingOrgLinks]);

  // Load existing opleiding links when editing
  useEffect(() => {
    if (open && event) {
      setSelectedOpleidingIds(
        eventOpleidingen.filter((ep) => ep.event_id === event.id).map((ep) => ep.program_id)
      );
    }
  }, [open, event?.id, eventOpleidingen]);

  // Derive "hoofdorganisator" from selection
  const orgById = useMemo(() => new Map(scholen.map((s) => [s.id, s])), [scholen]);
  const derivedOrganisatorId = useMemo(() => {
    if (selectedOrgIds.length === 0) return null;
    const hoofdIds = Array.from(new Set(selectedOrgIds.map((id) => {
      const o = orgById.get(id);
      if (!o) return id;
      return o.parent_id || o.id;
    })));
    return hoofdIds[0] ?? null;
  }, [selectedOrgIds, orgById]);

  // Keep form.organisator_id in sync with derived value
  useEffect(() => {
    setForm((prev) => prev.organisator_id === (derivedOrganisatorId ?? "")
      ? prev
      : { ...prev, organisator_id: derivedOrganisatorId ?? "" });
  }, [derivedOrganisatorId]);

  const toggleOrg = (id: string) => {
    const isOn = selectedOrgIds.includes(id);
    const next = isOn ? selectedOrgIds.filter((x) => x !== id) : [...selectedOrgIds, id];
    const prevHoofd = derivedOrganisatorId;
    const newHoofd = (() => {
      if (next.length === 0) return null;
      const ids = Array.from(new Set(next.map((i) => orgById.get(i)?.parent_id || i)));
      return ids[0] ?? null;
    })();
    if (prevHoofd && newHoofd && prevHoofd !== newHoofd && cpEntries.length > 0) {
      setConfirmOrgChange(JSON.stringify(next));
      return;
    }
    setSelectedOrgIds(next);
  };

  const confirmOrgSwitch = () => {
    if (confirmOrgChange) {
      try {
        const next = JSON.parse(confirmOrgChange) as string[];
        setSelectedOrgIds(next);
        setCpEntries([]);
        toast.info("Contactpersonen gereset omdat de hoofdorganisator gewijzigd is.");
      } catch { /* noop */ }
      setConfirmOrgChange(null);
    }
  };

  // Build grouped org list (hoofd + campuses)
  const orgGroups = useMemo(() => {
    const sortedAll = [...scholen].sort((a, b) => a.name.localeCompare(b.name));
    const hoofden = sortedAll.filter((s) => !s.parent_id);
    const search = orgSearch.trim().toLowerCase();
    const matches = (name: string) => !search || name.toLowerCase().includes(search);
    return hoofden.map((h) => {
      const campuses = sortedAll.filter((s) => s.parent_id === h.id);
      const filteredCampuses = campuses.filter((c) => matches(c.name));
      const hoofdVisible = matches(h.name) || filteredCampuses.length > 0;
      return { hoofd: h, campuses: filteredCampuses, visible: hoofdVisible };
    }).filter((g) => g.visible);
  }, [scholen, orgSearch]);

  const selectedOrgs = useMemo(
    () => selectedOrgIds.map((id) => orgById.get(id)).filter(Boolean) as typeof scholen,
    [selectedOrgIds, orgById]
  );

  const orgContacten = useMemo(() => {
    if (selectedOrgIds.length === 0) return [];
    const selectedSet = new Set(selectedOrgIds);
    return allContacten
      .filter((c) => c.organisatie_id && selectedSet.has(c.organisatie_id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allContacten, selectedOrgIds]);

  // Opleidingen grouped by school; show only opleidingen of selected orgs, or all if none selected
  const opleidingGroups = useMemo(() => {
    const selectedSet = new Set(selectedOrgIds);
    const filtered = selectedSet.size === 0
      ? allOpleidingen
      : allOpleidingen.filter((o) => o.organisatie_id && selectedSet.has(o.organisatie_id));
    const search = opleidingSearch.trim().toLowerCase();
    const matches = (s: string) => !search || s.toLowerCase().includes(search);
    const byOrg = new Map<string, typeof allOpleidingen>();
    for (const o of filtered) {
      const key = o.organisatie_id || "_";
      if (!byOrg.has(key)) byOrg.set(key, [] as any);
      byOrg.get(key)!.push(o);
    }
    const groups: { orgId: string; orgName: string; items: typeof allOpleidingen }[] = [];
    for (const [orgId, items] of byOrg.entries()) {
      const orgName = orgById.get(orgId)?.name || "Onbekende organisatie";
      const filteredItems = items
        .filter((i) => matches(i.name) || matches(orgName))
        .sort((a, b) => a.name.localeCompare(b.name));
      if (filteredItems.length === 0) continue;
      groups.push({ orgId, orgName, items: filteredItems });
    }
    return groups.sort((a, b) => a.orgName.localeCompare(b.orgName));
  }, [allOpleidingen, selectedOrgIds, opleidingSearch, orgById]);

  const toggleOpleiding = (id: string) => {
    setSelectedOpleidingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedOpleidingen = useMemo(
    () => selectedOpleidingIds
      .map((id) => allOpleidingen.find((o) => o.id === id))
      .filter(Boolean) as typeof allOpleidingen,
    [selectedOpleidingIds, allOpleidingen]
  );

  const hasOrganisator = selectedOrgIds.length > 0;
  const hasEventTerPlaatse = cpEntries.some((e) => e.rol === "event_ter_plaatse");
  const hasDuplicates = cpEntries.some((e, i) =>
    cpEntries.findIndex((o) => o.contact_id === e.contact_id && o.rol === e.rol) !== i
  );
  const cpValid = hasEventTerPlaatse && !hasDuplicates && cpEntries.every((e) => e.contact_id);

  const eventTimeInvalid = !!form.start_time && !!form.end_time && form.end_time <= form.start_time;
  const setupTimeInvalid = !!form.setup_time && !!form.teardown_time && form.teardown_time <= form.setup_time;
  const timesValid = !eventTimeInvalid && !setupTimeInvalid;

  const addCpEntry = () => setCpEntries([...cpEntries, { contact_id: "", rol: "event_ter_plaatse" }]);
  const removeCpEntry = (idx: number) => setCpEntries(cpEntries.filter((_, i) => i !== idx));
  const updateCpEntry = (idx: number, patch: Partial<ContactpersoonEntry>) => {
    setCpEntries(cpEntries.map((e, i) => i === idx ? { ...e, ...patch } : e));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpValid) {
      toast.error("Voeg minstens één contact ter plaatse toe.");
      return;
    }
    if (!timesValid) {
      toast.error("Einduur moet na het startuur liggen.");
      return;
    }
    const sanitized = sanitizeFormData(form);
    const saved: Event = {
      ...(event?.id ? { id: event.id } : {}),
      name: sanitized.name, type: sanitized.type as Event["type"],
      date: sanitized.date, start_time: sanitized.start_time,
      end_time: sanitized.end_time, location: sanitized.location,
      organisator_id: derivedOrganisatorId,
      elia_contact: sanitized.elia_contact,
      team_members: sanitized.team_members ? sanitized.team_members.split(",").map((s) => s.trim()).filter(Boolean) : [],
      description: sanitized.description,
      stand_type: sanitized.stand_type as Event["stand_type"],
      budget: sanitized.budget ? Number(sanitized.budget) : null,
      status: sanitized.status as Event["status"],
      setup_date: sanitized.setup_date, setup_time: sanitized.setup_time,
      notes: sanitized.notes,
      requires_booth_builder: sanitized.requires_booth_builder,
      teardown_time: sanitized.teardown_time || null,
      booth_size: sanitized.booth_size || null,
      max_ambassadeurs: sanitized.max_ambassadeurs ? Number(sanitized.max_ambassadeurs) : null,
      region: sanitized.region || null,
      event_language: sanitized.event_language || null,
      target_level: sanitized.target_level || null,
      registration_type: sanitized.registration_type || null,
      follow_up_status: sanitized.follow_up_status || "to_do",
      booth_number: sanitized.booth_number || null,
      parking_info: sanitized.parking_info || null,
      locker_code: sanitized.locker_code || null,
      invoice_status: sanitized.invoice_status || "open",
    } as Event;
    onSave?.(saved, cpEntries.filter((e) => e.contact_id), selectedOrgIds, selectedOpleidingIds);
    toast.success(isEdit ? "Evenement bijgewerkt." : "Evenement toegevoegd.");
    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Evenement bewerken" : "Nieuw evenement"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* SECTIE 1 — Basis (niet inklapbaar) */}
          <FormSection title="Basis" collapsible={false}>
            <div>
              <div className="flex items-center justify-between"><Label>Naam *</Label><CharacterCounter current={form.name.length} max={MAX_LENGTHS.title} /></div>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={MAX_LENGTHS.title} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Type *</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs">Jobbeurs</SelectItem><SelectItem value="beursstand">Beursstand</SelectItem><SelectItem value="campus presentatie">Campus presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="hackathon">Hackathon</SelectItem><SelectItem value="andere">Andere</SelectItem></SelectContent></Select></div>
              <div><Label>Status *</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gepland">Gepland</SelectItem><SelectItem value="bevestigd">Bevestigd</SelectItem><SelectItem value="afgelopen">Afgelopen</SelectItem><SelectItem value="geannuleerd">Geannuleerd</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><Label>Datum *</Label><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Startuur</Label><Input key={`${timeInputVersion}-start_time`} type="time" defaultValue={form.start_time} onChange={handleTimeChange("start_time")} onBlur={handleTimeBlur("start_time")} /></div>
              <div>
                <Label>Einduur</Label>
                <Input key={`${timeInputVersion}-end_time`} type="time" defaultValue={form.end_time} onChange={handleTimeChange("end_time")} onBlur={handleTimeBlur("end_time")} aria-invalid={eventTimeInvalid} />
                {eventTimeInvalid && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Einduur moet na het startuur liggen</p>
                )}
              </div>
            </div>
            <div>
              <Label>Locatie</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={MAX_LENGTHS.shortText} placeholder="bv. Brussels Expo, KU Leuven campus, of Online" />
              <p className="text-xs text-muted-foreground mt-1">bv. Brussels Expo, KU Leuven campus, of Online</p>
            </div>
            <div>
              <Label>Organisator(en)</Label>
              <Popover open={orgPickerOpen} onOpenChange={setOrgPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-auto min-h-10 py-2"
                  >
                    <span className="flex flex-wrap gap-1 text-left">
                      {selectedOrgs.length === 0 ? (
                        <span className="text-muted-foreground">Selecteer hoofdorganisatie of campussen…</span>
                      ) : selectedOrgs.map((o) => (
                        <Badge key={o.id} variant="secondary" className="gap-1">
                          {o.name}
                          <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleOrg(o.id); }} />
                        </Badge>
                      ))}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="p-2 border-b border-border">
                    <Input
                      placeholder="Zoeken…"
                      value={orgSearch}
                      onChange={(e) => setOrgSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {orgGroups.length === 0 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">Geen organisaties gevonden.</div>
                    )}
                    {orgGroups.map(({ hoofd, campuses }) => (
                      <div key={hoofd.id} className="py-1">
                        <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm font-medium">
                          <Checkbox
                            checked={selectedOrgIds.includes(hoofd.id)}
                            onCheckedChange={() => toggleOrg(hoofd.id)}
                          />
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{hoofd.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">{ORGANISATIE_TYPE_LABELS[hoofd.type] || hoofd.type}</span>
                        </label>
                        {campuses.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 pl-9 pr-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedOrgIds.includes(c.id)}
                              onCheckedChange={() => toggleOrg(c.id)}
                            />
                            <span className="truncate">{c.name}</span>
                            {c.city && <span className="text-[10px] text-muted-foreground ml-auto">{c.city}</span>}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {derivedOrganisatorId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Hoofdorganisator (voor mails en weergave): <span className="font-medium">{orgById.get(derivedOrganisatorId)?.name}</span>
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between"><Label>Beschrijving</Label><CharacterCounter current={form.description.length} max={MAX_LENGTHS.description} /></div>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={MAX_LENGTHS.description} />
              <p className="text-xs text-muted-foreground mt-1">Info over het event, zichtbaar voor ambassadeurs</p>
            </div>
          </FormSection>

          {/* SECTIE 2 — Doelgroep & bereik */}
          <FormSection title="Doelgroep & bereik" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Regio</Label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(REGION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Taal</Label>
                <Select value={form.event_language} onValueChange={(v) => setForm({ ...form, event_language: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(EVENT_LANGUAGE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Doelgroepniveau</Label>
                <Select value={form.target_level} onValueChange={(v) => setForm({ ...form, target_level: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(TARGET_LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Max. ambassadeurs</Label><Input type="number" min={0} placeholder="Geen limiet" value={form.max_ambassadeurs} onChange={(e) => setForm({ ...form, max_ambassadeurs: e.target.value })} /></div>
            </div>
            <div>
              <Label>Opleidingen / studierichtingen</Label>
              <Popover open={opleidingPickerOpen} onOpenChange={setOpleidingPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-auto min-h-10 py-2"
                  >
                    <span className="flex flex-wrap gap-1 text-left">
                      {selectedOpleidingen.length === 0 ? (
                        <span className="text-muted-foreground">Selecteer opleidingen…</span>
                      ) : selectedOpleidingen.map((o) => (
                        <Badge key={o.id} variant="secondary" className="gap-1">
                          {o.name}
                          <X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleOpleiding(o.id); }} />
                        </Badge>
                      ))}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="p-2 border-b border-border">
                    <Input
                      placeholder="Zoeken…"
                      value={opleidingSearch}
                      onChange={(e) => setOpleidingSearch(e.target.value)}
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {opleidingGroups.length === 0 && (
                      <div className="px-3 py-4 text-xs text-muted-foreground text-center">Geen opleidingen gevonden.</div>
                    )}
                    {opleidingGroups.map((g) => (
                      <div key={g.orgId} className="py-1">
                        <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                          {g.orgName}
                        </div>
                        {g.items.map((o) => (
                          <label key={o.id} className="flex items-center gap-2 pl-6 pr-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm">
                            <Checkbox
                              checked={selectedOpleidingIds.includes(o.id)}
                              onCheckedChange={() => toggleOpleiding(o.id)}
                            />
                            <span className="truncate">{o.name}</span>
                            {o.faculty && <span className="text-[10px] text-muted-foreground ml-auto">{o.faculty}</span>}
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {selectedOrgIds.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">Geen organisatie geselecteerd — alle opleidingen worden getoond.</p>
              )}
            </div>
          </FormSection>

          {/* SECTIE 3 — Registratie & opvolging */}
          <FormSection title="Registratie & opvolging" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Registratietype</Label>
                <Select value={form.registration_type} onValueChange={(v) => setForm({ ...form, registration_type: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(REGISTRATION_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Follow-up status</Label>
                <Select value={form.follow_up_status} onValueChange={(v) => setForm({ ...form, follow_up_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FOLLOW_UP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="sm:col-span-2"><Label>Budget (€)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            </div>
          </FormSection>

          {/* SECTIE 4 — Elia team */}
          <FormSection title="Elia team" defaultOpen>
            <div>
              <Label>Elia contactpersoon</Label>
              <Input value={form.elia_contact} onChange={(e) => setForm({ ...form, elia_contact: e.target.value })} maxLength={MAX_LENGTHS.shortText} />
            </div>
            <div><Label>Teamleden aanwezig</Label><Input placeholder="Naam 1, Naam 2, ..." value={form.team_members} onChange={(e) => setForm({ ...form, team_members: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
          </FormSection>

          {/* SECTIE 5 — Contactpersonen bij organisator */}
          <FormSection title="Contactpersonen bij organisator" description="Voeg minstens één contact ter plaatse toe" defaultOpen>
            {!hasOrganisator ? (
              <p className="text-sm text-muted-foreground italic">Kies eerst een organisator in de sectie Basis.</p>
            ) : (
              <>
                {cpEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select value={entry.contact_id} onValueChange={(v) => updateCpEntry(idx, { contact_id: v })}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecteer contact" />
                        </SelectTrigger>
                        <SelectContent>
                          {orgContacten.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-muted-foreground">
                              Geen contactpersonen bekend. Voeg eerst een contact toe via de organisatie-detailpagina.
                            </div>
                          ) : (
                            orgContacten.map((c) => {
                              const org = c.organisatie_id ? orgById.get(c.organisatie_id) : null;
                              return (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name} — {org?.name || "Onbekende organisatie"}
                                  {c.role ? ` — ${c.role}` : ""}
                                  {c.department ? ` (${c.department})` : ""}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-[160px]">
                      <Select value={entry.rol} onValueChange={(v) => updateCpEntry(idx, { rol: v as ContactpersoonRol })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CONTACTPERSOON_ROL_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeCpEntry(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addCpEntry} disabled={orgContacten.length === 0}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Contactpersoon toevoegen
                </Button>

                {hasDuplicates && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Dezelfde contactpersoon met dezelfde rol kan niet twee keer worden toegevoegd.
                  </p>
                )}
                {!hasEventTerPlaatse && cpEntries.length > 0 && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Minstens één contact ter plaatse is vereist.
                  </p>
                )}
              </>
            )}
          </FormSection>

          {/* SECTIE 6 — Stand & opbouw (standaard dicht) */}
          <FormSection title="Stand & opbouw" defaultOpen={false}>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Standenbouwer nodig?</Label>
              <Switch checked={form.requires_booth_builder} onCheckedChange={(v) => setForm({ ...form, requires_booth_builder: v })} />
            </div>
            {form.requires_booth_builder && (
              <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Stand type</Label><Select value={form.stand_type} onValueChange={(v) => setForm({ ...form, stand_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem><SelectItem value="infotafel">Infotafel</SelectItem><SelectItem value="presentatie">Presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="anders">Anders</SelectItem></SelectContent></Select></div>
                  <div><Label>Stand grootte</Label><Input placeholder="bv. 3x3m" value={form.booth_size} onChange={(e) => setForm({ ...form, booth_size: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Opbouwdatum</Label><Input type="date" value={form.setup_date} onChange={(e) => setForm({ ...form, setup_date: e.target.value })} /></div>
                  <div><Label>Opbouwtijd</Label><Input key={`${timeInputVersion}-setup_time`} type="time" defaultValue={form.setup_time} onChange={handleTimeChange("setup_time")} onBlur={handleTimeBlur("setup_time")} /></div>
                  <div>
                    <Label>Afbraaktijd</Label>
                    <Input key={`${timeInputVersion}-teardown_time`} type="time" defaultValue={form.teardown_time} onChange={handleTimeChange("teardown_time")} onBlur={handleTimeBlur("teardown_time")} aria-invalid={setupTimeInvalid} />
                    {setupTimeInvalid && (
                      <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Afbraaktijd moet na opbouwtijd liggen</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </FormSection>

          {/* SECTIE 7 — Notities (standaard dicht) */}
          <FormSection title="Praktische info" defaultOpen={false}>
            {form.requires_booth_builder && (
              <div>
                <Label>Standnummer</Label>
                <Input
                  value={form.booth_number}
                  onChange={(e) => setForm({ ...form, booth_number: e.target.value })}
                  maxLength={MAX_LENGTHS.shortText}
                  placeholder="bv. 141 (Hal 4)"
                />
              </div>
            )}
            <div>
              <Label>Parkeerinformatie</Label>
              <Textarea
                rows={2}
                value={form.parking_info}
                onChange={(e) => setForm({ ...form, parking_info: e.target.value })}
                maxLength={MAX_LENGTHS.notes}
                placeholder="bv. Parking PA3, 1 ticket voorzien aan de stand"
              />
            </div>
            <div>
              <Label>Locker & iPad code</Label>
              <Input
                value={form.locker_code}
                onChange={(e) => setForm({ ...form, locker_code: e.target.value })}
                maxLength={MAX_LENGTHS.shortText}
                placeholder="bv. Locker: 840 / iPad: 8400"
              />
            </div>
            <div>
              <Label>Factuurstatus</Label>
              <Select value={form.invoice_status} onValueChange={(v) => setForm({ ...form, invoice_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Deze info wordt mee verstuurd in de bevestigings- en herinneringsmail naar ambassadeurs.</p>
          </FormSection>

          <FormSection title="Bijlagen" defaultOpen={false}>
            {event?.id ? (
              <AttachmentsSection entityType="event" entityId={event.id} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Sla het event eerst op om bijlagen te kunnen toevoegen.</p>
            )}
          </FormSection>

          <FormSection title="Notities" defaultOpen={false}>
            <div>
              <div className="flex items-center justify-between"><Label>Interne notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={MAX_LENGTHS.notes} />
              <p className="text-xs text-muted-foreground mt-1">Alleen zichtbaar voor het interne team, niet voor ambassadeurs of standenbouwer</p>
            </div>
          </FormSection>

          <Button type="submit" className="w-full" disabled={(!cpValid && cpEntries.length > 0) || !timesValid}>
            {isEdit ? "Opslaan" : "Toevoegen"}
          </Button>
          {!cpValid && cpEntries.length > 0 && (
            <p className="text-xs text-destructive text-center">Minstens één contact ter plaatse is vereist om op te slaan.</p>
          )}
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!confirmOrgChange} onOpenChange={(v) => { if (!v) setConfirmOrgChange(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hoofdorganisator wijzigen?</AlertDialogTitle>
          <AlertDialogDescription>
            Deze wijziging verandert ook de hoofdorganisator en verwijdert de gekoppelde contactpersonen (die horen bij de vorige organisator). Doorgaan?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction onClick={confirmOrgSwitch}>Doorgaan</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
