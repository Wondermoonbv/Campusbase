import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Users, FileText, MessageCircle, Plus, Settings2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useContacten, useScholen } from "@/hooks/useScholen";
import { useProfiles } from "@/hooks/useProfiles";
import { useContactmomenten, type Contactmoment, type ContactmomentType } from "@/hooks/useContactmomenten";
import { ContactmomentDialog } from "./ContactmomentDialog";

const TYPE_ICON: Record<ContactmomentType, React.ComponentType<{ className?: string }>> = {
  mail: Mail,
  telefoon: Phone,
  meeting: Users,
  notitie: FileText,
  andere: MessageCircle,
};

const TYPE_LABEL: Record<ContactmomentType, string> = {
  mail: "Mail",
  telefoon: "Telefoon",
  meeting: "Meeting",
  notitie: "Notitie",
  andere: "Andere",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-BE", { day: "2-digit", month: "short", year: "numeric" });
}

interface Props {
  organisatieId: string;
  contactId?: string;
}

export function ContactmomentenSection({ organisatieId, contactId }: Props) {
  const { canEdit } = useAuth();
  const { scholen } = useScholen();
  const { contacten: orgContacten } = useContacten(organisatieId);
  const { profiles } = useProfiles();

  const org = scholen.find((s) => s.id === organisatieId);
  const isHoofd = !!org && !org.parent_id && !contactId;
  const campuses = useMemo(
    () => (isHoofd ? scholen.filter((s) => s.parent_id === organisatieId) : []),
    [scholen, organisatieId, isHoofd],
  );

  const [includeCampuses, setIncludeCampuses] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const orgIds = useMemo(() => {
    if (isHoofd && includeCampuses) return [organisatieId, ...campuses.map((c) => c.id)];
    return [organisatieId];
  }, [isHoofd, includeCampuses, organisatieId, campuses]);

  const { contactmomenten, isLoading } = useContactmomenten(orgIds, contactId ? { contactId } : undefined);

  const orgMap = useMemo(() => Object.fromEntries(scholen.map((s) => [s.id, s])), [scholen]);
  const contactMap = useMemo(() => Object.fromEntries(orgContacten.map((c) => [c.id, c])), [orgContacten]);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);

  const resolveContactName = (item: Contactmoment): string | null => {
    if (!item.contact_id) return null;
    return contactMap[item.contact_id]?.name ?? null;
  };

  return (
    <div className="surface-card p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base sm:text-lg font-semibold">Logboek ({contactmomenten.length})</h2>
        <div className="flex items-center gap-3">
          {isHoofd && campuses.length > 0 && (
            <div className="flex items-center gap-2">
              <Switch id="include-campuses" checked={includeCampuses} onCheckedChange={setIncludeCampuses} />
              <Label htmlFor="include-campuses" className="text-xs sm:text-sm cursor-pointer">Inclusief campussen</Label>
            </div>
          )}
          {canEdit && (
            <Button size="sm" variant="outline" className="h-10 sm:h-8" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Contactmoment toevoegen
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : contactmomenten.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen contactmomenten gelogd.</p>
      ) : (
        <ol className="space-y-3">
          {contactmomenten.map((item) => {
            const type = (item.type as ContactmomentType) ?? "andere";
            const Icon = TYPE_ICON[type] ?? MessageCircle;
            const isSysteem = item.bron === "systeem";
            const contactName = resolveContactName(item);
            const loggerName = item.created_by ? profileMap[item.created_by]?.full_name : null;
            const campusName = isHoofd && includeCampuses && item.organisatie_id !== organisatieId
              ? orgMap[item.organisatie_id]?.name
              : null;

            return (
              <li key={item.id} className={`flex gap-3 p-3 rounded-lg border ${isSysteem ? "border-dashed border-border bg-muted/10" : "border-border bg-muted/20"}`}>
                <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${isSysteem ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                  {isSysteem ? <Settings2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{item.onderwerp}</span>
                    <Badge variant={isSysteem ? "outline" : "secondary"} className="text-[10px] uppercase tracking-wide">
                      {isSysteem ? "Systeem" : TYPE_LABEL[type]}
                    </Badge>
                    {campusName && (
                      <span className="text-[10px] uppercase tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        ↳ {campusName}
                      </span>
                    )}
                  </div>
                  {item.notities && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.notities}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                    <span>{formatDate(item.occurred_at)}</span>
                    {contactName && <span>met {contactName}</span>}
                    {loggerName && !isSysteem && <span>gelogd door {loggerName}</span>}
                    {isSysteem && <span className="italic">automatisch</span>}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ContactmomentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organisatieId={organisatieId}
        contactId={contactId ?? null}
      />
    </div>
  );
}
