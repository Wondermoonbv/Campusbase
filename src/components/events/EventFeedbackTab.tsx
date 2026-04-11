import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEventFeedbackForm, useFeedbackResponses } from "@/hooks/useFeedback";
import { useAmbassadeurs, useEventInschrijvingen } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Download, Link2, MessageSquare, Star, ThumbsUp, BarChart3, Mail } from "lucide-react";
import type { FeedbackResponse } from "@/hooks/useFeedback";
import { sendBulkEmails, buildFeedbackEmail } from "@/lib/email";

const getShareUrl = (formId: string) => `${window.location.origin}/feedback/${formId}`;

function avg(arr: (number | null)[]): number {
  const valid = arr.filter((v): v is number => v != null);
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-32 sm:w-40 shrink-0 text-sm text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums w-10 text-right">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

function exportResponsesCSV(responses: FeedbackResponse[], eventName: string) {
  const headers = ["Naam", "E-mail", "Algemeen", "Organisatie", "Relevantie", "Stand", "Zou aanraden", "Opmerkingen", "Datum"];
  const rows = responses.map((r) => [
    r.respondent_name,
    r.respondent_email ?? "",
    r.overall_rating?.toString() ?? "",
    r.organization_rating?.toString() ?? "",
    r.relevance_rating?.toString() ?? "",
    r.stand_rating?.toString() ?? "",
    r.would_recommend == null ? "" : r.would_recommend ? "Ja" : "Nee",
    (r.comments ?? "").replace(/"/g, '""'),
    r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("nl-BE") : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `feedback-${eventName.replace(/\s+/g, "-").toLowerCase()}.csv`;
  a.click();
}

function FeedbackLinkControls({
  form,
  eventId,
  eventName,
  copyLink,
  handleToggle,
}: {
  form: { id: string; is_active: boolean | null };
  eventId: string;
  eventName: string;
  copyLink: () => void;
  handleToggle: (active: boolean) => void;
}) {
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen } = useEventInschrijvingen(eventId);
  const [sending, setSending] = useState(false);

  const handleSendFeedbackEmails = async () => {
    const confirmed = inschrijvingen.filter((i) => i.status === "bevestigd");
    if (confirmed.length === 0) {
      toast.warning("Geen bevestigde ambassadeurs om feedback aan te vragen.");
      return;
    }

    setSending(true);
    try {
      const feedbackUrl = getShareUrl(form.id);
      const emails = confirmed.map((ins) => {
        const amb = ambassadeurs.find((a) => a.id === ins.ambassadeur_id);
        return {
          to: amb?.email ?? "",
          subject: `Feedback gevraagd: ${eventName}`,
          html: buildFeedbackEmail(amb?.full_name ?? "Ambassadeur", eventName, feedbackUrl),
        };
      }).filter((e) => e.to);

      const result = await sendBulkEmails(emails);
      if (result.sent > 0) toast.success(`Feedback link verstuurd naar ${result.sent} ambassadeur(s)`);
      if (result.failed.length > 0) {
        result.failed.forEach((f) => toast.error(`Email naar ${f.to} mislukt: ${f.error}`));
      }
    } catch {
      toast.error("Fout bij versturen van feedback emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="surface-card p-4 sm:p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{getShareUrl(form.id)}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Link kopiëren
          </Button>
          <Button variant="outline" size="sm" onClick={handleSendFeedbackEmails} disabled={sending}>
            <Mail className="h-3.5 w-3.5 mr-1" /> {sending ? "Versturen..." : "Feedback link versturen"}
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Actief</Label>
            <Switch checked={form.is_active ?? false} onCheckedChange={handleToggle} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventFeedbackTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const { user } = useAuth();
  const { form, isLoading, createForm, toggleActive } = useEventFeedbackForm(eventId);
  const { data: responses = [] } = useFeedbackResponses(form?.id);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createForm.mutateAsync({
        evenement_id: eventId,
        title: `Feedback — ${eventName}`,
        created_by: user?.id,
      });
      toast.success("Feedback formulier aangemaakt!");
    } catch {
      toast.error("Fout bij aanmaken.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (active: boolean) => {
    if (!form) return;
    try {
      await toggleActive.mutateAsync({ formId: form.id, isActive: active });
      toast.success(active ? "Formulier geactiveerd" : "Formulier gedeactiveerd");
    } catch {
      toast.error("Fout bij wijzigen.");
    }
  };

  const copyLink = () => {
    if (!form) return;
    navigator.clipboard.writeText(getShareUrl(form.id));
    toast.success("Link gekopieerd!");
  };

  if (isLoading) return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  );

  if (!form) {
    return (
      <div className="py-12 text-center space-y-4">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">Nog geen feedback formulier voor dit evenement.</p>
        <Button onClick={handleCreate} disabled={creating}>
          {creating ? "Aanmaken..." : "Feedback formulier aanmaken"}
        </Button>
      </div>
    );
  }

  const avgOverall = avg(responses.map((r) => r.overall_rating));
  const avgOrg = avg(responses.map((r) => r.organization_rating));
  const avgRel = avg(responses.map((r) => r.relevance_rating));
  const avgStand = avg(responses.map((r) => r.stand_rating));
  const recommendPct = responses.length
    ? Math.round((responses.filter((r) => r.would_recommend === true).length / responses.length) * 100)
    : 0;
  const commentsOnly = responses.filter((r) => r.comments?.trim());

  if (responses.length === 0) {
    return (
      <div className="space-y-6">
        <FeedbackLinkControls form={form} eventId={eventId} eventName={eventName} copyLink={copyLink} handleToggle={handleToggle} />
        <div className="surface-card py-16 px-6 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Nog geen responses ontvangen</p>
          <p className="text-xs text-muted-foreground">Deel de feedbacklink om responses te verzamelen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FeedbackLinkControls form={form} eventId={eventId} eventName={eventName} copyLink={copyLink} handleToggle={handleToggle} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-semibold tabular-nums">{responses.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Responses</p>
        </div>
        <div className="surface-card p-4 text-center">
          <p className="text-2xl font-semibold tabular-nums">{avgOverall > 0 ? avgOverall.toFixed(1) : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Gem. score</p>
        </div>
        <div className="surface-card p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-semibold tabular-nums">{responses.length > 0 ? `${recommendPct}%` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Zou aanraden</p>
        </div>
      </div>

      {/* Score bars */}
      {responses.length > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Scores per categorie
          </h3>
          <div className="space-y-3">
            <ScoreBar label="Algemeen" value={avgOverall} icon={<Star className="h-3.5 w-3.5" />} />
            <ScoreBar label="Organisatie" value={avgOrg} icon={<Star className="h-3.5 w-3.5" />} />
            <ScoreBar label="Relevantie" value={avgRel} icon={<Star className="h-3.5 w-3.5" />} />
            <ScoreBar label="Stand" value={avgStand} icon={<Star className="h-3.5 w-3.5" />} />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-32 sm:w-40 shrink-0 text-sm text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span>Zou aanraden</span>
              </div>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${recommendPct}%` }} />
              </div>
              <span className="text-sm font-semibold tabular-nums w-10 text-right">{recommendPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {commentsOnly.length > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Opmerkingen ({commentsOnly.length})
            </h3>
            <Button variant="outline" size="sm" onClick={() => exportResponsesCSV(responses, eventName)}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
          <div className="divide-y divide-border">
            {commentsOnly.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{r.respondent_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("nl-BE") : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{r.comments}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {responses.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => exportResponsesCSV(responses, eventName)}>
            <Download className="h-3.5 w-3.5 mr-1" /> Alle responses exporteren (CSV)
          </Button>
        </div>
      )}
    </div>
  );
}
