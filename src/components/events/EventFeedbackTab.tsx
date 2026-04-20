import { useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useEventFeedbackForm, useFeedbackResponses } from "@/hooks/useFeedback";
import { useAmbassadeurs, useEventInschrijvingen } from "@/hooks/useAmbassadeurs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, Download, Link2, MessageSquare, BarChart3, Mail, Users } from "lucide-react";
import type { FeedbackResponse } from "@/hooks/useFeedback";
import { sendBulkEmails, buildFeedbackEmail } from "@/lib/email";

const getShareUrl = (formId: string) => `${window.location.origin}/feedback/${formId}`;

function avg(arr: (number | null)[]): number {
  const valid = arr.filter((v): v is number => v != null);
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : 0;
}

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 sm:w-56 shrink-0 text-sm text-muted-foreground truncate">{label}</div>
      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${value > 0 ? (value / max) * 100 : 0}%` }}
        />
      </div>
      <span className="text-sm font-semibold tabular-nums w-14 text-right">
        {value > 0 ? `${value.toFixed(1)}/${max}` : "—"}
      </span>
    </div>
  );
}

function exportResponsesCSV(responses: FeedbackResponse[], eventName: string) {
  const headers = [
    "Naam", "E-mail",
    "Relevantie publiek (1-5)", "Kwaliteit gesprekken (1-4)",
    "Profielen ontmoet", "Bekendheid Elia (1-3)",
    "Interesse (1-5)", "Effort/Return (1-3)",
    "Opnieuw deelnemen (1-5)", "Reden", "Opmerkingen", "Datum",
  ];
  const rows = responses.map((r) => [
    r.respondent_name,
    r.respondent_email ?? "",
    r.audience_relevance?.toString() ?? "",
    r.conversation_quality?.toString() ?? "",
    (r.profiles_met ?? []).join(", "),
    r.employer_awareness?.toString() ?? "",
    r.interest_level?.toString() ?? "",
    r.effort_vs_return?.toString() ?? "",
    r.participate_again?.toString() ?? "",
    (r.participate_again_reason ?? "").replace(/"/g, '""'),
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
  const autoCreating = useRef(false);

  // Auto-create feedback form if none exists
  useEffect(() => {
    if (!isLoading && !form && !autoCreating.current && eventId && user) {
      autoCreating.current = true;
      createForm.mutateAsync({
        evenement_id: eventId,
        title: `Feedback — ${eventName}`,
        created_by: user.id,
      }).catch(() => {
        // non-critical
      }).finally(() => {
        autoCreating.current = false;
      });
    }
  }, [isLoading, form, eventId, user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (isLoading || !form) return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </div>
  );

  const avgAudience = avg(responses.map((r) => r.audience_relevance));
  const avgConversation = avg(responses.map((r) => r.conversation_quality));
  const avgAwareness = avg(responses.map((r) => r.employer_awareness));
  const avgInterest = avg(responses.map((r) => r.interest_level));
  const avgEffort = avg(responses.map((r) => r.effort_vs_return));
  const avgParticipate = avg(responses.map((r) => r.participate_again));

  // Profiles met aggregation
  const profileCounts = new Map<string, number>();
  responses.forEach((r) => (r.profiles_met ?? []).forEach((p) => profileCounts.set(p, (profileCounts.get(p) ?? 0) + 1)));

  const reasonsAndComments = responses.filter((r) => r.participate_again_reason?.trim() || r.comments?.trim());

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
          <p className="text-2xl font-semibold tabular-nums">{avgParticipate > 0 ? `${avgParticipate.toFixed(1)}/5` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Opnieuw deelnemen</p>
        </div>
        <div className="surface-card p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-semibold tabular-nums">{avgInterest > 0 ? `${avgInterest.toFixed(1)}/5` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-1">Interesse in Elia</p>
        </div>
      </div>

      {/* Score bars */}
      <div className="surface-card p-4 sm:p-5 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Gemiddelde scores per vraag
        </h3>
        <div className="space-y-3">
          <ScoreBar label="Relevantie publiek" value={avgAudience} max={5} />
          <ScoreBar label="Kwaliteit gesprekken" value={avgConversation} max={4} />
          <ScoreBar label="Bekendheid Elia" value={avgAwareness} max={3} />
          <ScoreBar label="Interesse in Elia" value={avgInterest} max={5} />
          <ScoreBar label="Effort vs return" value={avgEffort} max={3} />
          <ScoreBar label="Opnieuw deelnemen" value={avgParticipate} max={5} />
        </div>
      </div>

      {/* Profiles met */}
      {profileCounts.size > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="h-4 w-4" /> Ontmoete profielen
          </h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(profileCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => (
                <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {name} <span className="opacity-70">· {count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Reasons + Comments */}
      {reasonsAndComments.length > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Antwoorden &amp; opmerkingen ({reasonsAndComments.length})
            </h3>
          </div>
          <div className="divide-y divide-border">
            {reasonsAndComments.map((r) => (
              <div key={r.id} className="py-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.respondent_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("nl-BE") : ""}
                  </span>
                </div>
                {r.participate_again_reason && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Reden opnieuw deelnemen</p>
                    <p className="text-sm text-foreground">{r.participate_again_reason}</p>
                  </div>
                )}
                {r.comments && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Overige opmerkingen</p>
                    <p className="text-sm text-muted-foreground">{r.comments}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportResponsesCSV(responses, eventName)}>
          <Download className="h-3.5 w-3.5 mr-1" /> Alle responses exporteren (CSV)
        </Button>
      </div>
    </div>
  );
}
