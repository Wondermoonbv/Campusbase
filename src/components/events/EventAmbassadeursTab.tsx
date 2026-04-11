import { useState, useMemo } from "react";
import { useAmbassadeurs, useEventInschrijvingen } from "@/hooks/useAmbassadeurs";
import { useEvenementen } from "@/hooks/useEvenementen";
import { useScholen } from "@/hooks/useScholen";
import type { Ambassadeur } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy, Link2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { sendEmail, sendBulkEmails, buildConfirmationEmail, buildInvitationEmail } from "@/lib/email";
import type { EventEmailData } from "@/lib/email";
import { generateICS } from "@/lib/ics";

const STATUSES = [
  { value: "uitgenodigd", label: "Uitgenodigd" },
  { value: "ingeschreven", label: "Ingeschreven" },
  { value: "bevestigd", label: "Bevestigd" },
  { value: "backup", label: "Backup" },
  { value: "afgemeld", label: "Afgemeld" },
];

function statusColor(status: string) {
  switch (status) {
    case "uitgenodigd": return "bg-muted text-muted-foreground";
    case "bevestigd": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "backup": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "afgemeld": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
}

export function EventAmbassadeursTab({ eventId }: { eventId: string }) {
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen, addInschrijving, updateStatus } = useEventInschrijvingen(eventId);
  const { evenementen } = useEvenementen();
  const { scholen } = useScholen();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const event = useMemo(() => evenementen.find((e) => e.id === eventId), [evenementen, eventId]);
  const school = useMemo(() => event?.school_id ? scholen.find((s) => s.id === event.school_id) : null, [event, scholen]);

  const enrolledIds = useMemo(() => new Set(inschrijvingen.map((i) => i.ambassadeur_id)), [inschrijvingen]);

  const enriched = useMemo(() => {
    return inschrijvingen.map((i) => ({
      ...i,
      ambassadeur: ambassadeurs.find((a) => a.id === i.ambassadeur_id),
    }));
  }, [inschrijvingen, ambassadeurs]);

  const counts = useMemo(() => {
    const c = { uitgenodigd: 0, ingeschreven: 0, bevestigd: 0, backup: 0, afgemeld: 0 };
    inschrijvingen.forEach((i) => { if (i.status in c) c[i.status as keyof typeof c]++; });
    return c;
  }, [inschrijvingen]);

  const availableForInvite = useMemo(
    () => ambassadeurs.filter((a) => a.is_active && !enrolledIds.has(a.id)),
    [ambassadeurs, enrolledIds]
  );

  const handleInvite = async () => {
    try {
      await Promise.all(
        selected.map((ambassadeur_id) =>
          addInschrijving.mutateAsync({ evenement_id: eventId, ambassadeur_id, status: "uitgenodigd" })
        )
      );
      toast.success(`${selected.length} ambassadeur(s) uitgenodigd`);

      // Send invitation emails
      if (event) {
        const eventData: EventEmailData = {
          eventName: event.name,
          date: event.date,
          location: event.location,
          schoolName: school?.name,
        };

        const emails = selected
          .map((id) => ambassadeurs.find((a) => a.id === id))
          .filter((a): a is Ambassadeur => !!a && !!a.email)
          .map((a) => {
            const portalUrl = `${window.location.origin}/ambassadeur-portaal?token=${a.access_token}`;
            const html = buildInvitationEmail(a.full_name, eventData, portalUrl);
            const subject = `Uitnodiging: ${event.name} - ${new Date(event.date).toLocaleDateString("nl-BE")}`;
            return { to: a.email, subject, html };
          });

        if (emails.length > 0) {
          const result = await sendBulkEmails(emails);
          if (result.sent > 0) {
            toast.success(`Uitnodiging verstuurd naar ${result.sent} ambassadeur(s)`);
          }
          result.failed.forEach((f) => {
            toast.error(`Email naar ${f.to} mislukt: ${f.error}`);
          });
        }
      }

      setSelected([]);
      setInviteOpen(false);
    } catch {
      toast.error("Fout bij uitnodigen");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success("Status bijgewerkt");

      // Send confirmation email when status changes to 'bevestigd'
      if (status === "bevestigd" && event) {
        const enrollment = enriched.find((e) => e.id === id);
        const amb = enrollment?.ambassadeur;
        if (amb?.email) {
          const rawEvent = event as any;
          const eventData: EventEmailData = {
            eventName: event.name,
            date: event.date,
            location: event.location,
            schoolName: school?.name,
            startTime: event.start_time,
            endTime: event.end_time,
            opbouwTijd: rawEvent.opbouw_tijd,
            afbraakTijd: rawEvent.afbraak_tijd,
            contactpersoon: event.elia_contact,
          };

          const portalUrl = `${window.location.origin}/ambassadeur-portaal?token=${amb.access_token}`;
          const html = buildConfirmationEmail(amb.full_name, eventData, portalUrl);
          const icsContent = generateICS({
            name: event.name,
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            description: `Ambassadeur voor ${event.name}${school ? ` - ${school.name}` : ""}`,
          });

          const subject = `Bevestiging: ${event.name} - ${new Date(event.date).toLocaleDateString("nl-BE")}`;
          const result = await sendEmail({ to: amb.email, subject, html, icsContent });

          if (result.success) {
            toast.success(`Bevestigingsmail verstuurd naar ${amb.email}`);
          } else {
            toast.warning(`Status bijgewerkt, maar email naar ${amb.email} is mislukt: ${result.error}`);
          }
        }
      }
    } catch {
      toast.error("Fout bij wijzigen");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/inschrijven/${eventId}`);
    toast.success("Inschrijflink gekopieerd!");
  };

  return (
    <div className="space-y-6">
      {/* Registration link */}
      <div className="surface-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {window.location.origin}/inschrijven/{eventId}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Inschrijflink kopiëren
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          { label: "Uitgenodigd", value: counts.uitgenodigd },
          { label: "Ingeschreven", value: counts.ingeschreven },
          { label: "Bevestigd", value: counts.bevestigd },
          { label: "Backup", value: counts.backup },
          { label: "Afgemeld", value: counts.afgemeld },
        ]).map((s) => (
          <div key={s.label} className="surface-card p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Invite button */}
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Ambassadeurs uitnodigen
        </Button>
      </div>

      {/* Enrolled list */}
      {enriched.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Nog geen ambassadeurs ingeschreven voor dit event.</p>
        </div>
      ) : (
        <div className="surface-card divide-y divide-border">
          {enriched.map((e) => (
            <div key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4">
              <div>
                <p className="text-sm font-medium">{e.ambassadeur?.full_name ?? "Onbekend"}</p>
                <p className="text-xs text-muted-foreground">{e.ambassadeur?.email} {e.ambassadeur?.department ? `· ${e.ambassadeur.department}` : ""}</p>
              </div>
              <Select value={e.status} onValueChange={(v) => handleStatusChange(e.id, v)}>
                <SelectTrigger className="w-40 h-9">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(e.status)}`}>
                    {STATUSES.find((s) => s.value === e.status)?.label ?? e.status}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ambassadeurs uitnodigen</DialogTitle>
          </DialogHeader>
          {availableForInvite.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Alle actieve ambassadeurs zijn al ingeschreven.</p>
          ) : (
            <div className="space-y-4">
              <div className="max-h-64 overflow-y-auto space-y-2">
                {availableForInvite.map((a) => (
                  <label key={a.id} className="flex items-center gap-3 cursor-pointer py-2 px-2 rounded hover:bg-muted/50 transition-colors">
                    <Checkbox
                      checked={selected.includes(a.id)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) => checked ? [...prev, a.id] : prev.filter((id) => id !== a.id))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium">{a.full_name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Annuleren</Button>
                <Button onClick={handleInvite} disabled={selected.length === 0}>
                  {selected.length} uitnodigen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
