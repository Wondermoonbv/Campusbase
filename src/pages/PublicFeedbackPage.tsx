import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Star, CheckCircle2 } from "lucide-react";
import { stripHtml, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";

const BRAND = "#0E6575";

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-1 rounded-md transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className="h-7 w-7 transition-colors"
              fill={n <= value ? BRAND : "transparent"}
              stroke={n <= value ? BRAND : "hsl(var(--muted-foreground))"}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PublicFeedbackPage() {
  const { formId } = useParams();

  const { data: formData, isLoading } = useQuery({
    queryKey: ["public_feedback_form", formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data: form, error } = await supabase
        .from("feedback_forms")
        .select("*, evenementen(name, date, location)")
        .eq("id", formId)
        .maybeSingle();
      if (error) throw error;
      return form;
    },
    enabled: !!formId,
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [overall, setOverall] = useState(0);
  const [organization, setOrganization] = useState(0);
  const [relevance, setRelevance] = useState(0);
  const [stand, setStand] = useState(0);
  const [recommend, setRecommend] = useState(true);
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return; // prevent double submit
    setError("");
    if (!name.trim()) { setError("Naam is verplicht."); return; }
    if (overall === 0) { setError("Geef een algemene beoordeling."); return; }
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("feedback_responses").insert({
        form_id: formId!,
        respondent_name: stripHtml(name.trim()),
        respondent_email: email.trim() || null,
        overall_rating: overall,
        organization_rating: organization || null,
        relevance_rating: relevance || null,
        stand_rating: stand || null,
        would_recommend: recommend,
        comments: stripHtml(comments.trim()) || null,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Er ging iets mis.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Laden...</div>
      </div>
    );
  }

  if (!formData || !formData.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Formulier niet beschikbaar</h1>
          <p className="text-gray-500 text-sm">Dit feedback formulier is niet meer actief of bestaat niet.</p>
        </div>
      </div>
    );
  }

  const event = (formData as any).evenementen;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md space-y-4">
          <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: BRAND }} />
          <h1 className="text-2xl font-semibold text-gray-800">Bedankt!</h1>
          <p className="text-gray-500">Je feedback is succesvol verzonden. We waarderen je input!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 text-white font-bold text-lg"
            style={{ backgroundColor: BRAND }}
          >
            E
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 text-wrap-balance">
            {formData.title}
          </h1>
          {event && (
            <p className="text-sm text-gray-500 mt-1">
              {event.name} · {event.date ? new Date(event.date).toLocaleDateString("nl-BE") : ""}{" "}
              {event.location ? `· ${event.location}` : ""}
            </p>
          )}
          {formData.description && (
            <p className="text-sm text-gray-500 mt-2">{formData.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-7 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="name">Naam *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className="h-11" maxLength={MAX_LENGTHS.name} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voornaam.achternaam@elia.be" className="h-11" maxLength={MAX_LENGTHS.email} />
          </div>

          <hr className="border-gray-100" />

          <RatingField label="Algemene beoordeling *" value={overall} onChange={setOverall} />
          <RatingField label="Organisatie" value={organization} onChange={setOrganization} />
          <RatingField label="Relevantie voor jouw profiel" value={relevance} onChange={setRelevance} />
          <RatingField label="Kwaliteit van de stand/presentatie" value={stand} onChange={setStand} />

          <hr className="border-gray-100" />

          <div className="flex items-center justify-between">
            <Label>Zou je dit event aanraden?</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{recommend ? "Ja" : "Nee"}</span>
              <Switch checked={recommend} onCheckedChange={setRecommend} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="comments">Opmerkingen</Label>
              <CharacterCounter current={comments.length} max={MAX_LENGTHS.description} />
            </div>
            <Textarea id="comments" value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Deel je ervaring..." rows={3} maxLength={MAX_LENGTHS.description} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            style={{ backgroundColor: BRAND }}
            disabled={submitting || submitted}
          >
            {submitting ? "Verzenden..." : "Feedback verzenden"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">Powered by CampusBase</p>
      </div>
    </div>
  );
}
