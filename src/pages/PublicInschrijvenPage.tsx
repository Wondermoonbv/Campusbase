import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, MapPin, CheckCircle2 } from "lucide-react";
import { stripHtml, MAX_LENGTHS } from "@/lib/sanitize";

const BRAND = "#0E6575";

export default function PublicInschrijvenPage() {
  const { evenementId } = useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const { data: event, isLoading } = useQuery({
    queryKey: ["public_event", evenementId],
    enabled: !!evenementId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, date, location")
        .eq("id", evenementId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return; // prevent double submit
    setError("");
    if (!name.trim() || !email.trim()) { setError("Naam en e-mail zijn verplicht."); return; }
    setSubmitting(true);

    try {
      const sanitizedName = stripHtml(name.trim());
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedDept = stripHtml(department.trim());

      // Check/create ambassadeur
      let { data: existing } = await supabase
        .from("ambassadeurs")
        .select("id")
        .eq("email", sanitizedEmail)
        .maybeSingle();

      let ambassadeurId: string;
      if (existing) {
        ambassadeurId = existing.id;
      } else {
        const { data: created, error: createErr } = await supabase
          .from("ambassadeurs")
          .insert({ full_name: sanitizedName, email: sanitizedEmail, department: sanitizedDept })
          .select("id")
          .single();
        if (createErr) throw createErr;
        ambassadeurId = created.id;
      }

      // Check if already enrolled
      const { data: existingEnrollment } = await supabase
        .from("event_inschrijvingen")
        .select("id")
        .eq("evenement_id", evenementId!)
        .eq("ambassadeur_id", ambassadeurId)
        .maybeSingle();

      if (existingEnrollment) {
        setError("Je bent al ingeschreven voor dit event.");
        setSubmitting(false);
        return;
      }

      // Insert enrollment
      const { error: insertErr } = await supabase
        .from("event_inschrijvingen")
        .insert({ evenement_id: evenementId!, ambassadeur_id: ambassadeurId, status: "ingeschreven" });
      if (insertErr) throw insertErr;

      setSubmitted(true);
    } catch {
      setError("Er ging iets mis. Probeer het opnieuw.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0a4f5c 100%)` }}>
        <div className="animate-pulse text-white/80">Laden...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0a4f5c 100%)` }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
          <p className="text-muted-foreground">Evenement niet gevonden.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0a4f5c 100%)` }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto" style={{ color: BRAND }} />
          <h2 className="text-xl font-semibold">Bedankt voor je inschrijving!</h2>
          <p className="text-sm text-muted-foreground">
            Je inschrijving voor <strong>{event.name}</strong> is ontvangen. Het team neemt contact op voor bevestiging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #0a4f5c 100%)` }}>
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold" style={{ color: BRAND }}>Inschrijving ambassadeur</h1>
          <h2 className="text-lg font-semibold">{event.name}</h2>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(event.date).toLocaleDateString("nl-BE")}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.location}</span>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Naam *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Je volledige naam" className="h-11" maxLength={MAX_LENGTHS.name} />
          </div>
          <div>
            <Label>E-mail *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="je.email@elia.be" className="h-11" maxLength={MAX_LENGTHS.email} />
          </div>
          <div>
            <Label>Afdeling <span className="text-muted-foreground">(optioneel)</span></Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="bv. Grid Operations" className="h-11" maxLength={MAX_LENGTHS.shortText} />
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Button
            type="submit"
            disabled={submitting || submitted}
            className="w-full h-11 text-base font-semibold"
            style={{ backgroundColor: BRAND }}
          >
            {submitting ? "Verzenden..." : "Inschrijven"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Door je in te schrijven ga je akkoord met het delen van je gegevens met het recruitment team.
        </p>
      </div>
    </div>
  );
}
