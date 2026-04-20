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
import {
  feedbackTranslations,
  PROFILES_VALUES,
  type FeedbackLang,
} from "@/lib/feedback-translations";

const BRAND = "#0E6575";

function ScaleField({
  number,
  question,
  options,
  value,
  onChange,
  required,
}: {
  number: number;
  question: string;
  options: readonly string[];
  value: number | null;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-gray-900">
        {number}. {question} {required && <span className="text-red-500">*</span>}
      </legend>
      <div className="grid gap-2">
        {options.map((label, idx) => {
          const v = idx + 1;
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              aria-pressed={selected}
              className={cn(
                "w-full text-left px-3.5 py-2.5 rounded-lg border-2 transition-all",
                "hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                selected ? "border-current" : "border-gray-200 bg-white",
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
                  {selected && (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BRAND }} />
                  )}
                </span>
                <span className="text-sm text-gray-900">{label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function PublicFeedbackPage() {
  const { formId, shortCode } = useParams();
  const [lang, setLang] = useState<FeedbackLang>("nl");
  const t = feedbackTranslations[lang];

  const { data: formData, isLoading } = useQuery({
    queryKey: ["public_feedback_form", formId ?? null, shortCode ?? null],
    queryFn: async () => {
      const query = supabase
        .from("feedback_forms")
        .select("*, evenementen(name, date, location)");
      if (shortCode) {
        const { data, error } = await query.eq("short_code", shortCode).maybeSingle();
        if (error) throw error;
        return data;
      }
      if (formId) {
        const { data, error } = await query.eq("id", formId).maybeSingle();
        if (error) throw error;
        return data;
      }
      return null;
    },
    enabled: !!(formId || shortCode),
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
    if (!name.trim()) return setError(t.err_name);
    if (!audienceRelevance) return setError(t.err_question(2));
    if (!conversationQuality) return setError(t.err_question(3));
    if (profilesMet.length === 0) return setError(t.err_profiles);
    if (!employerAwareness) return setError(t.err_question(5));
    if (!interestLevel) return setError(t.err_question(6));
    if (!effortVsReturn) return setError(t.err_question(7));
    if (!participateAgain) return setError(t.err_question(8));
    if (!participateReason.trim()) return setError(t.err_question(9));

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("feedback_responses").insert({
        form_id: (formData as any)?.id ?? formId!,
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
      setError(err.message || t.err_generic);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">{t.loading}</div>
      </div>
    );
  }

  if (!formData || !formData.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">{t.unavailable_title}</h1>
          <p className="text-gray-500 text-sm">{t.unavailable_message}</p>
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
          <h1 className="text-2xl font-semibold text-gray-800">{t.thank_you_title}</h1>
          <p className="text-sm text-gray-500">{t.thank_you_message}</p>
        </div>
      </div>
    );
  }

  const dateLocale = lang === "fr" ? "fr-BE" : "nl-BE";

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

          {/* Language picker */}
          <div className="flex justify-center gap-2 mb-5" role="group" aria-label="Language / Taal">
            {(["nl", "fr"] as const).map((code) => {
              const active = lang === code;
              const label = code === "nl" ? "Nederlands" : "Français";
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={active}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                    active ? "text-white" : "text-gray-700 bg-white hover:border-gray-300",
                  )}
                  style={
                    active
                      ? { backgroundColor: BRAND, borderColor: BRAND }
                      : { borderColor: "#e5e7eb" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">{t.title}</h1>
          {event && (
            <p className="text-sm font-medium text-gray-700 mt-2">
              {event.name}
              {event.date && ` · ${new Date(event.date).toLocaleDateString(dateLocale)}`}
              {event.location && ` · ${event.location}`}
            </p>
          )}
        </div>

        {/* Intro */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{t.intro}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Respondent info */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-semibold text-gray-900">
                1. {t.name_label} <span className="text-red-500">*</span>
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
                {t.email_label}{" "}
                <span className="font-normal text-gray-500">({t.email_help})</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.email_placeholder}
                className="h-11"
                maxLength={MAX_LENGTHS.email}
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={2}
              question={t.q2_label}
              options={t.q2_options}
              value={audienceRelevance}
              onChange={setAudienceRelevance}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={3}
              question={t.q3_label}
              options={t.q3_options}
              value={conversationQuality}
              onChange={setConversationQuality}
              required
            />
          </section>

          {/* Profiles met (multi) */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-gray-900">
                4. {t.q4_label} <span className="text-red-500">*</span>{" "}
                <span className="font-normal text-gray-500">({t.multi_hint})</span>
              </legend>
              <div className="grid gap-2">
                {PROFILES_VALUES.map((val, idx) => {
                  const checked = profilesMet.includes(val);
                  const label = t.q4_options[idx];
                  return (
                    <label
                      key={val}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-2 cursor-pointer transition-all",
                        "hover:border-gray-300",
                        checked ? "border-current" : "border-gray-200 bg-white",
                      )}
                      style={checked ? { borderColor: BRAND, backgroundColor: `${BRAND}0d` } : undefined}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleProfile(val)} />
                      <span className="text-sm text-gray-900">{label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={5}
              question={t.q5_label}
              options={t.q5_options}
              value={employerAwareness}
              onChange={setEmployerAwareness}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={6}
              question={t.q6_label}
              options={t.q6_options}
              value={interestLevel}
              onChange={setInterestLevel}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={7}
              question={t.q7_label}
              options={t.q7_options}
              value={effortVsReturn}
              onChange={setEffortVsReturn}
              required
            />
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <ScaleField
              number={8}
              question={t.q8_label}
              options={t.q8_options}
              value={participateAgain}
              onChange={setParticipateAgain}
              required
            />
          </section>

          {participateAgain !== null && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 space-y-3">
              <Label htmlFor="reason" className="text-sm font-semibold text-gray-900">
                9. {t.q9_label} <span className="text-red-500">*</span>
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
            <Label htmlFor="comments" className="text-sm font-semibold text-gray-900">
              10. {t.q10_label}
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
            {submitting ? t.submitting : t.submit}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t.footer.replace("{year}", String(new Date().getFullYear()))}
        </p>
      </div>
    </div>
  );
}
