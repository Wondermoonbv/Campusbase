import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2 } from "lucide-react";
import { stripHtml, MAX_LENGTHS } from "@/lib/sanitize";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { cn } from "@/lib/utils";

const BRAND = "#0E6575";

// ── Bilingual scale definitions ──
const AUDIENCE_RELEVANCE = [
  { v: 1, nl: "Helemaal niet relevant", fr: "Pas pertinent" },
  { v: 2, nl: "Matig relevant", fr: "Moyennement pertinent" },
  { v: 3, nl: "Neutraal", fr: "Neutre" },
  { v: 4, nl: "Relevant", fr: "Pertinent" },
  { v: 5, nl: "Zeer relevant", fr: "Très pertinent" },
];
const CONVERSATION_QUALITY = [
  { v: 1, nl: "Slecht", fr: "Mauvais" },
  { v: 2, nl: "Beperkt", fr: "Limité" },
  { v: 3, nl: "Goed", fr: "Bien" },
  { v: 4, nl: "Zeer goed", fr: "Très bien" },
];
const PROFILES_OPTIONS = [
  { v: "Professionele bachelor", nl: "Professionele bachelor", fr: "Bachelier professionnel" },
  { v: "Academische bachelor", nl: "Academische bachelor", fr: "Bachelier académique" },
  { v: "Master", nl: "Master", fr: "Master" },
  { v: "Op zoek naar een stage", nl: "Op zoek naar een stage", fr: "À la recherche d'un stage" },
];
const EMPLOYER_AWARENESS = [
  { v: 1, nl: "Meestal niet bekend", fr: "Majoritairement pas du tout" },
  { v: 2, nl: "Enigszins bekend", fr: "Moyennement" },
  { v: 3, nl: "Meestal goed bekend", fr: "Majoritairement bien" },
];
const INTEREST_LEVEL = [
  { v: 1, nl: "Negatief", fr: "Négative" },
  { v: 2, nl: "Matig", fr: "Moyenne" },
  { v: 3, nl: "Neutraal", fr: "Neutre" },
  { v: 4, nl: "Positief", fr: "Positive" },
  { v: 5, nl: "Zeer positief", fr: "Très positive" },
];
const EFFORT_RETURN = [
  { v: 1, nl: "Veel effort, weinig return", fr: "Effort élevé, faible retour" },
  { v: 2, nl: "Effort en return in balans", fr: "Effort et retour équilibrés" },
  { v: 3, nl: "Beperkte effort, veel return", fr: "Effort limité, retour élevé" },
];
const PARTICIPATE_AGAIN = [
  { v: 1, nl: "Zeker niet", fr: "Certainement pas" },
  { v: 2, nl: "Waarschijnlijk niet", fr: "Peu probable" },
  { v: 3, nl: "Twijfelgeval", fr: "À voir" },
  { v: 4, nl: "Waarschijnlijk wel", fr: "Probablement" },
  { v: 5, nl: "Ja zeker!", fr: "Certainement" },
];

interface ScaleOption { v: number; nl: string; fr: string }

function ScaleField({
  number,
  questionNl,
  questionFr,
  options,
  value,
  onChange,
  required,
}: {
  number: number;
  questionNl: string;
  questionFr: string;
  options: ScaleOption[];
  value: number | null;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="space-y-1">
        <div className="text-sm font-semibold text-gray-900">
          {number}. {questionNl} {required && <span className="text-red-500">*</span>}
        </div>
        <div className="text-xs italic text-gray-500">{questionFr}</div>
      </legend>
      <div className="grid gap-2">
        {options.map((opt) => {
          const selected = value === opt.v;
          return (
            <button
              key={opt.v}
              type="button"
              onClick={() => onChange(opt.v)}
              aria-pressed={selected}
              className={cn(
                "w-full text-left px-3.5 py-2.5 rounded-lg border-2 transition-all",
                "hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                selected ? "border-current bg-opacity-5" : "border-gray-200 bg-white",
              )}
              style={selected ? { borderColor: BRAND, backgroundColor: `${BRAND}0d` } : undefined}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    selected ? "border-current" : "border-gray-300",
                  )}
                  style={selected ? { borderColor: BRAND } : undefined}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900">{opt.nl}</div>
                  <div className="text-xs italic text-gray-500">{opt.fr}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function PublicFeedbackPage() {
  const { formId } = useParams();

  const { data: formData, isLoading } = useQuery({
    queryKey: ["public_feedback_form", formId],
    queryFn: async () => {
      if (!formId) return null;
      const { data, error } = await supabase
        .from("feedback_forms")
        .select("*, evenementen(name, date, location)")
        .eq("id", formId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!formId,
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [audienceRelevance, setAudienceRelevance] = useState<number | null>(null);
  const [conversationQuality, setConversationQuality] = useState<number | null>(null);
  const [profilesMet, setProfilesMet] = useState<string[]>([]);
  const [employerAwareness, setEmployerAwareness] = useState<number | null>(null);
  const [interestLevel, setInterestLevel] = useState<number | null>(null);
  const [effortVsReturn, setEffortVsReturn] = useState<number | null>(null);
  const [participateAgain, setParticipateAgain] = useState<number | null>(null);
  const [participateReason, setParticipateReason] = useState("");
  const [comments, setComments] = useState("");
  const [error, setError] = useState("");

  const toggleProfile = (val: string) => {
    setProfilesMet((cur) => (cur.includes(val) ? cur.filter((v) => v !== val) : [...cur, val]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || submitting) return;
    setError("");
    if (!name.trim()) return setError("Naam is verplicht. / Le nom est requis.");
    if (!audienceRelevance) return setError("Vraag 2 is verplicht. / Question 2 requise.");
    if (!conversationQuality) return setError("Vraag 3 is verplicht.");
    if (profilesMet.length === 0) return setError("Vraag 4: kies minstens één profiel.");
    if (!employerAwareness) return setError("Vraag 5 is verplicht.");
    if (!interestLevel) return setError("Vraag 6 is verplicht.");
    if (!effortVsReturn) return setError("Vraag 7 is verplicht.");
    if (!participateAgain) return setError("Vraag 8 is verplicht.");
    if (!participateReason.trim()) return setError("Vraag 9 is verplicht.");

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("feedback_responses").insert({
        form_id: formId!,
        respondent_name: stripHtml(name.trim()),
        respondent_email: email.trim() || null,
        audience_relevance: audienceRelevance,
        conversation_quality: conversationQuality,
        profiles_met: profilesMet,
        employer_awareness: employerAwareness,
        interest_level: interestLevel,
        effort_vs_return: effortVsReturn,
        participate_again: participateAgain,
        participate_again_reason: stripHtml(participateReason.trim()),
        comments: stripHtml(comments.trim()) || null,
      });
      if (insertError) throw insertError;
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Er ging iets mis. / Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Laden... / Chargement...</div>
      </div>
    );
  }

  if (!formData || !formData.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Formulier niet beschikbaar</h1>
          <p className="text-sm italic text-gray-500 mb-4">Formulaire indisponible</p>
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
          <h1 className="text-2xl font-semibold text-gray-800">Bedankt voor je feedback!</h1>
          <p className="text-base italic text-gray-600">Merci pour votre retour!</p>
          <p className="text-sm text-gray-500">
            We gebruiken jouw input om onze toekomstige aanwezigheid op jobbeurzen te verbeteren.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 text-white font-bold text-lg"
            style={{ backgroundColor: BRAND }}
          >
            E
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">Feedback jobfairs</h1>
          {event && (
            <p className="text-sm font-medium text-gray-700 mt-2">
              {event.name}
              {event.date && ` · ${new Date(event.date).toLocaleDateString("nl-BE")}`}
              {event.location && ` · ${event.location}`}
            </p>
          )}
        </div>

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            Bedankt om deel te nemen aan de jobbeurs! We willen graag jouw feedback verzamelen om onze toekomstige
            aanwezigheid op jobbeurzen verder te verbeteren. Het invullen van dit formulier duurt slechts enkele minuten.
          </p>
          <p className="text-sm italic text-gray-500 leading-relaxed">
            Merci d'avoir participé au salon de l'emploi ! Nous souhaitons recueillir votre avis afin d'améliorer notre
            présence lors de futurs événements. Ce questionnaire ne prendra que quelques minutes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent info */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
                1. Jouw naam <span className="text-red-500">*</span>
                <span className="block text-xs italic font-normal text-gray-500">Votre nom</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
                maxLength={MAX_LENGTHS.name}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-900">
                Email
                <span className="block text-xs italic font-normal text-gray-500">Email (optioneel / facultatif)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voornaam.achternaam@elia.be"
                className="h-11"
                maxLength={MAX_LENGTHS.email}
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={2}
              questionNl="Hoe relevant was het publiek voor Elia?"
              questionFr="Quel était le degré de pertinence du public pour Elia?"
              options={AUDIENCE_RELEVANCE}
              value={audienceRelevance}
              onChange={setAudienceRelevance}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={3}
              questionNl="Hoe beoordeel je de kwaliteit van de gesprekken?"
              questionFr="Comment évaluez-vous la qualité des conversations?"
              options={CONVERSATION_QUALITY}
              value={conversationQuality}
              onChange={setConversationQuality}
              required
            />
          </section>

          {/* Profiles met (multi) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <fieldset className="space-y-3">
              <legend className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">
                  4. Welk type profielen heb je voornamelijk ontmoet? <span className="text-red-500">*</span>
                </div>
                <div className="text-xs italic text-gray-500">
                  Quels types de profils avez-vous principalement rencontrés? (meerdere mogelijk / plusieurs choix possibles)
                </div>
              </legend>
              <div className="grid gap-2">
                {PROFILES_OPTIONS.map((opt) => {
                  const checked = profilesMet.includes(opt.v);
                  return (
                    <label
                      key={opt.v}
                      className={cn(
                        "flex items-start gap-3 px-3.5 py-2.5 rounded-lg border-2 cursor-pointer transition-all",
                        "hover:border-gray-300",
                        checked ? "border-current" : "border-gray-200 bg-white",
                      )}
                      style={checked ? { borderColor: BRAND, backgroundColor: `${BRAND}0d` } : undefined}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleProfile(opt.v)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900">{opt.nl}</div>
                        <div className="text-xs italic text-gray-500">{opt.fr}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={5}
              questionNl="In welke mate waren studenten al bekend met Elia als werkgever?"
              questionFr="Dans quelle mesure les étudiants connaissaient-ils Elia en tant qu'employeur?"
              options={EMPLOYER_AWARENESS}
              value={employerAwareness}
              onChange={setEmployerAwareness}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={6}
              questionNl="Hoe ervaarde je de interesse in Elia?"
              questionFr="Comment avez-vous perçu l'intérêt pour Elia sur le stand?"
              options={INTEREST_LEVEL}
              value={interestLevel}
              onChange={setInterestLevel}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={7}
              questionNl="Hoe beoordeel je, rekening houdend met de inspanning, de return van deze jobfair?"
              questionFr="Compte tenu de l'effort requis, comment évaluez-vous le retour global de ce job fair?"
              options={EFFORT_RETURN}
              value={effortVsReturn}
              onChange={setEffortVsReturn}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={8}
              questionNl="Vind je dat Elia volgend jaar opnieuw aan deze jobbeurs moet deelnemen?"
              questionFr="Pensez-vous qu'Elia devrait à nouveau participer à ce salon l'année prochaine?"
              options={PARTICIPATE_AGAIN}
              value={participateAgain}
              onChange={setParticipateAgain}
              required
            />
          </section>

          {participateAgain !== null && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-3">
              <Label htmlFor="reason" className="space-y-1">
                <div className="text-sm font-semibold text-gray-900">
                  9. Wat is de voornaamste reden voor jouw antwoord op de vorige vraag? <span className="text-red-500">*</span>
                </div>
                <div className="text-xs italic font-normal text-gray-500">
                  Quelle est la raison principale de votre réponse à la question précédente?
                </div>
              </Label>
              <div className="flex items-center justify-end">
                <CharacterCounter current={participateReason.length} max={MAX_LENGTHS.description} />
              </div>
              <Textarea
                id="reason"
                value={participateReason}
                onChange={(e) => setParticipateReason(e.target.value)}
                rows={3}
                maxLength={MAX_LENGTHS.description}
                required
              />
            </section>
          )}

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-3">
            <Label htmlFor="comments" className="space-y-1">
              <div className="text-sm font-semibold text-gray-900">
                10. Heb je nog andere feedback of observaties die je wil delen?
              </div>
              <div className="text-xs italic font-normal text-gray-500">
                Avez-vous d'autres remarques ou observations à partager?
              </div>
            </Label>
            <div className="flex items-center justify-end">
              <CharacterCounter current={comments.length} max={MAX_LENGTHS.description} />
            </div>
            <Textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              maxLength={MAX_LENGTHS.description}
            />
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium"
            style={{ backgroundColor: BRAND }}
            disabled={submitting || submitted}
          >
            {submitting ? "Verzenden... / Envoi..." : "Verzenden / Envoyer"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Elia Group — Campus Recruitment
        </p>
      </div>
    </div>
  );
}
