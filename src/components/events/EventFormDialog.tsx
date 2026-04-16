import { useState, useEffect, useMemo } from "react";
import { useScholen, useContacten } from "@/hooks/useScholen";
import { useEventContactpersonen } from "@/hooks/useEventContactpersonen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { sanitizeFormData, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { REGIO_LABELS, TAAL_LABELS, DOELGROEP_LABELS, REGISTRATIE_TYPE_LABELS, FOLLOW_UP_LABELS, ORGANISATIE_TYPE_LABELS, CONTACTPERSOON_ROL_LABELS } from "@/lib/event-labels";
import type { Event, ContactpersoonRol } from "@/types/crm";
import { Trash2, Plus, AlertTriangle } from "lucide-react";

interface ContactpersoonEntry {
  contact_id: string;
  rol: ContactpersoonRol;
}

interface EventFormDialogProps { open: boolean; onOpenChange: (v: boolean) => void; event?: Event; onSave?: (event: Event, contactpersonen: ContactpersoonEntry[]) => void; }

export function EventFormDialog({ open, onOpenChange, event, onSave }: EventFormDialogProps) {
  const isEdit = !!event;
  const { scholen } = useScholen();
  const { contacten: allContacten } = useContacten();
  const { contactpersonen: existingCP } = useEventContactpersonen(event?.id);
  const [confirmOrgChange, setConfirmOrgChange] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", type: "jobbeurs" as string, date: "", start_time: "", end_time: "",
    location: "", organisator_id: "", responsible: "", elia_contact: "", team_members: "",
    description: "", stand_type: "jobbeurs stand" as string, stand_size: "medium 4m²" as string,
    budget: "", status: "gepland" as string, setup_date: "", setup_time: "", notes: "",
    standenbouwer_nodig: false, opbouw_tijd: "", afbraak_tijd: "", stand_grootte: "",
    stand_notities: "", max_ambassadeurs: "",
    regio: "" as string, taal: "" as string, doelgroep_niveau: "" as string,
    registratie_type: "" as string, follow_up_status: "to_do" as string,
  });

  const [cpEntries, setCpEntries] = useState<ContactpersoonEntry[]>([]);

  useEffect(() => {
    if (open) {
      if (event) {
        setForm({
          name: event.name, type: event.type, date: event.date,
          start_time: event.start_time || "", end_time: event.end_time || "",
          location: event.location, organisator_id: event.organisator_id || "",
          responsible: event.responsible, elia_contact: event.elia_contact || "",
          team_members: (event.team_members || []).join(", "),
          description: event.description || "",
          stand_type: event.stand_type || "jobbeurs stand",
          stand_size: event.stand_size || "medium 4m²",
          budget: event.budget?.toString() || "", status: event.status,
          setup_date: event.setup_date || "", setup_time: event.setup_time || "",
          notes: event.notes || "",
          standenbouwer_nodig: (event as any).standenbouwer_nodig ?? false,
          opbouw_tijd: (event as any).opbouw_tijd || "",
          afbraak_tijd: (event as any).afbraak_tijd || "",
          stand_grootte: (event as any).stand_grootte || "",
          stand_notities: (event as any).stand_notities || "",
          max_ambassadeurs: (event as any).max_ambassadeurs?.toString() || "",
          regio: event.regio || "", taal: event.taal || "",
          doelgroep_niveau: event.doelgroep_niveau || "",
          registratie_type: event.registratie_type || "",
          follow_up_status: event.follow_up_status || "to_do",
        });
        // Load existing contactpersonen
        setCpEntries(existingCP.map((cp) => ({ contact_id: cp.contact_id, rol: cp.rol })));
      } else {
        setForm({
          name: "", type: "jobbeurs", date: "", start_time: "", end_time: "",
          location: "", organisator_id: "", responsible: "", elia_contact: "",
          team_members: "", description: "", stand_type: "jobbeurs stand",
          stand_size: "medium 4m²", budget: "", status: "gepland", setup_date: "",
          setup_time: "", notes: "", standenbouwer_nodig: false, opbouw_tijd: "",
          afbraak_tijd: "", stand_grootte: "",
          stand_notities: "", max_ambassadeurs: "",
          regio: "", taal: "", doelgroep_niveau: "", registratie_type: "",
          follow_up_status: "to_do",
        });
        setCpEntries([]);
      }
    }
  }, [open, event, existingCP]);

  const handleOrganisatorChange = (v: string) => {
    const oldOrg = form.organisator_id;
    const newOrg = v;
    if (oldOrg && oldOrg !== newOrg && cpEntries.length > 0) {
      setConfirmOrgChange(newOrg);
    } else {
      setForm({ ...form, organisator_id: newOrg });
    }
  };

  const confirmOrgSwitch = () => {
    if (confirmOrgChange) {
      setForm({ ...form, organisator_id: confirmOrgChange });
      setCpEntries([]);
      toast.info("Contactpersonen gereset omdat organisator gewijzigd is.");
      setConfirmOrgChange(null);
    }
  };

  const orgContacten = useMemo(() => {
    const orgId = form.organisator_id && form.organisator_id !== "none" ? form.organisator_id : null;
    if (!orgId) return [];
    return allContacten
      .filter((c) => c.organisatie_id === orgId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allContacten, form.organisator_id]);

  const hasOrganisator = !!form.organisator_id && form.organisator_id !== "none";

  const hasEventTerPlaatse = cpEntries.some((e) => e.rol === "event_ter_plaatse");

  const hasDuplicates = cpEntries.some((e, i) =>
    cpEntries.findIndex((o) => o.contact_id === e.contact_id && o.rol === e.rol) !== i
  );

  const cpValid = hasEventTerPlaatse && !hasDuplicates && cpEntries.every((e) => e.contact_id);

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
    const sanitized = sanitizeFormData(form);
    const saved: Event = {
      ...(event?.id ? { id: event.id } : {}),
      name: sanitized.name, type: sanitized.type as Event["type"],
      date: sanitized.date, start_time: sanitized.start_time,
      end_time: sanitized.end_time, location: sanitized.location,
      organisator_id: sanitized.organisator_id || null,
      responsible: sanitized.responsible, elia_contact: sanitized.elia_contact,
      team_members: sanitized.team_members ? sanitized.team_members.split(",").map((s) => s.trim()).filter(Boolean) : [],
      description: sanitized.description,
      stand_type: sanitized.stand_type as Event["stand_type"],
      stand_size: sanitized.stand_size as Event["stand_size"],
      budget: sanitized.budget ? Number(sanitized.budget) : null,
      status: sanitized.status as Event["status"],
      setup_date: sanitized.setup_date, setup_time: sanitized.setup_time,
      notes: sanitized.notes,
      standenbouwer_nodig: sanitized.standenbouwer_nodig,
      opbouw_tijd: sanitized.opbouw_tijd, afbraak_tijd: sanitized.afbraak_tijd,
      stand_grootte: sanitized.stand_grootte,
      stand_notities: sanitized.stand_notities,
      max_ambassadeurs: sanitized.max_ambassadeurs ? Number(sanitized.max_ambassadeurs) : null,
      regio: sanitized.regio || null,
      taal: sanitized.taal || null,
      doelgroep_niveau: sanitized.doelgroep_niveau || null,
      registratie_type: sanitized.registratie_type || null,
      follow_up_status: sanitized.follow_up_status || "to_do",
    } as Event;
    onSave?.(saved, cpEntries.filter((e) => e.contact_id));
    toast.success(isEdit ? "Evenement bijgewerkt." : "Evenement toegevoegd.");
    onOpenChange(false);
  };

  const sortedOrgs = [...scholen].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Evenement bewerken" : "Nieuw evenement"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between"><Label>Naam *</Label><CharacterCounter current={form.name.length} max={MAX_LENGTHS.title} /></div>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={MAX_LENGTHS.title} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs">Jobbeurs</SelectItem><SelectItem value="campus presentatie">Campus presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="hackathon">Hackathon</SelectItem><SelectItem value="andere">Andere</SelectItem></SelectContent></Select></div>
            <div><Label>Datum *</Label><Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Startuur</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>Einduur</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div>
            <Label>Locatie / adres</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={MAX_LENGTHS.shortText} placeholder="bv. 'Brussels Expo' of 'KU Leuven campus Leuven' of 'Online'" />
          </div>

          {/* Organisator */}
          <div>
            <Label>Organisator *</Label>
            <Select value={form.organisator_id} onValueChange={handleOrganisatorChange}>
              <SelectTrigger><SelectValue placeholder="Selecteer organisator" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen</SelectItem>
                {sortedOrgs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({ORGANISATIE_TYPE_LABELS[s.type] || s.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Verantwoordelijke</Label><Input value={form.responsible} onChange={(e) => setForm({ ...form, responsible: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
            <div><Label>Elia contactpersoon</Label><Input value={form.elia_contact} onChange={(e) => setForm({ ...form, elia_contact: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
          </div>
          <div><Label>Teamleden</Label><Input placeholder="Naam 1, Naam 2, ..." value={form.team_members} onChange={(e) => setForm({ ...form, team_members: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>

          <div>
            <div className="flex items-center justify-between"><Label>Beschrijving</Label><CharacterCounter current={form.description.length} max={MAX_LENGTHS.description} /></div>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={MAX_LENGTHS.description} />
          </div>

          {/* Details & follow-up */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Details & follow-up</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Regio</Label>
                <Select value={form.regio} onValueChange={(v) => setForm({ ...form, regio: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(REGIO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Taal</Label>
                <Select value={form.taal} onValueChange={(v) => setForm({ ...form, taal: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(TAAL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Doelgroepniveau</Label>
                <Select value={form.doelgroep_niveau} onValueChange={(v) => setForm({ ...form, doelgroep_niveau: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(DOELGROEP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Registratietype</Label>
                <Select value={form.registratie_type} onValueChange={(v) => setForm({ ...form, registratie_type: v })}><SelectTrigger><SelectValue placeholder="Optioneel" /></SelectTrigger><SelectContent><SelectItem value="none">Geen</SelectItem>{Object.entries(REGISTRATIE_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div><Label>Follow-up status</Label>
                <Select value={form.follow_up_status} onValueChange={(v) => setForm({ ...form, follow_up_status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(FOLLOW_UP_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>

          {/* Contactpersonen */}
          <div className="border-t border-border pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contactpersonen</h3>
            <p className="text-xs text-muted-foreground -mt-1">
              {hasOrganisator
                ? "Voeg minstens één contact ter plaatse toe"
                : "Kies eerst een organisator"}
            </p>

            {hasOrganisator && (
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
                            orgContacten.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}{c.role ? ` — ${c.role}` : ""}{c.department ? ` (${c.department})` : ""}
                              </SelectItem>
                            ))
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
          </div>

          {/* Stand info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Type stand</Label><Select value={form.stand_type} onValueChange={(v) => setForm({ ...form, stand_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jobbeurs stand">Jobbeurs stand</SelectItem><SelectItem value="infotafel">Infotafel</SelectItem><SelectItem value="presentatie">Presentatie</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="anders">Anders</SelectItem></SelectContent></Select></div>
            <div><Label>Standformaat</Label><Select value={form.stand_size} onValueChange={(v) => setForm({ ...form, stand_size: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="klein 2m²">Klein 2m²</SelectItem><SelectItem value="medium 4m²">Medium 4m²</SelectItem><SelectItem value="groot 6m²+">Groot 6m²+</SelectItem><SelectItem value="anders">Anders</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Budget (€)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gepland">Gepland</SelectItem><SelectItem value="bevestigd">Bevestigd</SelectItem><SelectItem value="afgelopen">Afgelopen</SelectItem><SelectItem value="geannuleerd">Geannuleerd</SelectItem></SelectContent></Select></div>
          </div>
          <div><Label>Max. ambassadeurs (optioneel)</Label><Input type="number" min={0} placeholder="Geen limiet" value={form.max_ambassadeurs} onChange={(e) => setForm({ ...form, max_ambassadeurs: e.target.value })} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>Opbouwdatum</Label><Input type="date" value={form.setup_date} onChange={(e) => setForm({ ...form, setup_date: e.target.value })} /></div>
            <div><Label>Opbouwuur</Label><Input type="time" value={form.setup_time} onChange={(e) => setForm({ ...form, setup_time: e.target.value })} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between"><Label>Notities</Label><CharacterCounter current={form.notes.length} max={MAX_LENGTHS.notes} /></div>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={MAX_LENGTHS.notes} />
          </div>

          {/* Standenbouwer sectie */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Standenbouwer nodig</Label>
              <Switch checked={form.standenbouwer_nodig} onCheckedChange={(v) => setForm({ ...form, standenbouwer_nodig: v })} />
            </div>
            {form.standenbouwer_nodig && (
              <div className="space-y-3 pl-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Opbouwtijd</Label><Input placeholder="bijv. 08:00" value={form.opbouw_tijd} onChange={(e) => setForm({ ...form, opbouw_tijd: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
                  <div><Label>Afbraaktijd</Label><Input placeholder="bijv. 18:00" value={form.afbraak_tijd} onChange={(e) => setForm({ ...form, afbraak_tijd: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
                </div>
                <div>
                  <div><Label>Standgrootte</Label><Input placeholder="bijv. 3x3m" value={form.stand_grootte} onChange={(e) => setForm({ ...form, stand_grootte: e.target.value })} maxLength={MAX_LENGTHS.shortText} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between"><Label>Stand notities</Label><CharacterCounter current={form.stand_notities.length} max={MAX_LENGTHS.notes} /></div>
                  <Textarea rows={2} placeholder="Extra info voor de standenbouwer..." value={form.stand_notities} onChange={(e) => setForm({ ...form, stand_notities: e.target.value })} maxLength={MAX_LENGTHS.notes} />
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!cpValid && cpEntries.length > 0}>
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
          <AlertDialogTitle>Organisator wijzigen?</AlertDialogTitle>
          <AlertDialogDescription>
            Organisator wijzigen verwijdert de gekoppelde contactpersonen (die horen bij de vorige organisator). Doorgaan?
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
