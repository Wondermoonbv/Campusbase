import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, RefreshCw, CheckCircle2 } from "lucide-react";
import { useEventFeedbackForm } from "@/hooks/useFeedback";
import { useAmbassadeurs, useEventInschrijvingen } from "@/hooks/useAmbassadeurs";
import { sendBulkEmails, buildFeedbackEmail } from "@/lib/email";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  eventId: string;
  eventName: string;
  eventDate: string;
}

export function EventFeedbackBanner({ eventId, eventName, eventDate }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const isPast = eventDate < today;

  const { form, isLoading } = useEventFeedbackForm(eventId);
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen } = useEventInschrijvingen(eventId);
  const [sending, setSending] = useState(false);

  if (!isPast || isLoading || !form) return null;

  const confirmed = inschrijvingen.filter((i) => i.status === "bevestigd");
  if (confirmed.length === 0) return null;

  const feedbackUrl = form.short_code
    ? `${window.location.origin}/f/${form.short_code}`
    : `${window.location.origin}/feedback/${form.id}`;

  const handleSend = async () => {
    setSending(true);
    try {
      const emails = confirmed
        .map((ins) => {
          const amb = ambassadeurs.find((a) => a.id === ins.ambassadeur_id);
          return {
            to: amb?.email ?? "",
            subject: `Feedback gevraagd: ${eventName}`,
            html: buildFeedbackEmail(amb?.full_name ?? "Ambassadeur", eventName, feedbackUrl, amb?.email),
          };
        })
        .filter((e) => e.to);

      const result = await sendBulkEmails(emails);

      // Mark as sent
      await supabase
        .from("feedback_forms")
        .update({ feedback_mail_sent: true, feedback_mail_sent_at: new Date().toISOString() })
        .eq("id", form.id);

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

  if (form.feedback_mail_sent) {
    const sentDate = form.feedback_mail_sent_at
      ? new Date(form.feedback_mail_sent_at).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })
      : null;

    return (
      <Alert className="bg-emerald-50 border-emerald-200 mb-4">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm text-emerald-800">
            Feedback link verstuurd{sentDate ? ` op ${sentDate}` : ""} naar {confirmed.length} ambassadeur(s).
          </span>
          <Button variant="outline" size="sm" onClick={handleSend} disabled={sending}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {sending ? "Versturen..." : "Opnieuw versturen"}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-amber-50 border-amber-200 mb-4">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-sm text-amber-800">
          Dit event is afgelopen. Feedback link versturen naar {confirmed.length} bevestigde ambassadeur(s)?
        </span>
        <Button size="sm" onClick={handleSend} disabled={sending} className="bg-amber-600 hover:bg-amber-700 text-white">
          <Mail className="h-3.5 w-3.5 mr-1" />
          {sending ? "Versturen..." : "Verstuur feedback link"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
