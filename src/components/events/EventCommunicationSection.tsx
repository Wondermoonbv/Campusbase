import { useMemo, useState } from "react";
import { useAmbassadeurs, useEventInschrijvingen } from "@/hooks/useAmbassadeurs";
import { useEventFeedbackForm, useFeedbackResponses, type FeedbackResponse } from "@/hooks/useFeedback";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Mail, Bell, Calendar as CalendarIcon, MessageSquare, BarChart3, Users, ChevronDown, ChevronRight, Eye, Quote } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("nl-BE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtDateLong(s: string | null | undefined): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" }) +
    " " + new Date(s).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" });
}

function avg(nums: (number | null | undefined)[]): number {
  const v = nums.filter((n): n is number => typeof n === "number");
  if (!v.length) return 0;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

const SCORE_LABELS: { key: keyof FeedbackResponse; label: string }[] = [
  { key: "audience_relevance", label: "Relevantie publiek" },
  { key: "conversation_quality", label: "Kwaliteit gesprekken" },
  { key: "employer_awareness", label: "Werkgeversbekendheid" },
  { key: "interest_level", label: "Interesseniveau" },
  { key: "effort_vs_return", label: "Inspanning vs. resultaat" },
  { key: "participate_again", label: "Opnieuw deelnemen?" },
];

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = value > 0 ? (value / 5) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value > 0 ? `${value.toFixed(1)}/5` : "—"}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function MetricPill({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex-1 min-w-[140px] surface-card p-4 space-y-1.5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

interface Props {
  eventId: string;
  eventDate: string;
}

export function EventCommunicationSection({ eventId, eventDate }: Props) {
  const { ambassadeurs } = useAmbassadeurs();
  const { inschrijvingen } = useEventInschrijvingen(eventId);
  const { form } = useEventFeedbackForm(eventId);
  const { data: responses = [] } = useFeedbackResponses(form?.id);
  const [selectedResponse, setSelectedResponse] = useState<FeedbackResponse | null>(null);
  const [quotesOpen, setQuotesOpen] = useState(false);

  const ambById = useMemo(() => new Map(ambassadeurs.map((a) => [a.id, a])), [ambassadeurs]);
  const responseById = useMemo(() => new Map(responses.map((r) => [r.id, r])), [responses]);
  const responseByEmail = useMemo(() => {
    const m = new Map<string, FeedbackResponse>();
    for (const r of responses) {
      if (r.respondent_email) m.set(r.respondent_email.toLowerCase(), r);
    }
    return m;
  }, [responses]);

  // Enrich each inschrijving with its linked response (FK first, email fallback)
  const rows = useMemo(() => {
    return inschrijvingen.map((ins) => {
      const amb = ambById.get(ins.ambassadeur_id);
      let response: FeedbackResponse | null = null;
      if (ins.feedback_response_id) {
        response = responseById.get(ins.feedback_response_id) ?? null;
      }
      if (!response && amb?.email) {
        response = responseByEmail.get(amb.email.toLowerCase()) ?? null;
      }
      return { ins, amb, response };
    });
  }, [inschrijvingen, ambById, responseById, responseByEmail]);

  const total = inschrijvingen.length;
  const briefingCount = inschrijvingen.filter((i) => !!i.briefing_sent_at).length;
  const reminderCount = inschrijvingen.filter((i) => !!i.reminder_sent_at).length;
  const feedbackCount = rows.filter((r) => !!r.response).length;

  const respondents = rows.filter((r) => r.response).map((r) => r.amb).filter(Boolean);
  const avatarsToShow = respondents.slice(0, 5);
  const extra = Math.max(0, respondents.length - avatarsToShow.length);

  // Aggregations
  const scores = SCORE_LABELS.map((s) => ({
    label: s.label,
    value: avg(responses.map((r) => r[s.key] as number | null)),
  }));

  const profileCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of responses) for (const p of r.profiles_met ?? []) m.set(p, (m.get(p) ?? 0) + 1);
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [responses]);

  const quotes = useMemo(
    () => responses.filter((r) => (r.comments?.trim() || r.participate_again_reason?.trim())),
    [responses],
  );

  return (
    <section className="surface-card p-4 sm:p-5 space-y-5">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> Communicatie &amp; Feedback
      </h2>

      {/* Timeline header */}
      <div className="flex flex-wrap gap-3">
        <MetricPill
          icon={Mail}
          label="Briefing verzonden"
          value={total ? `${briefingCount}/${total}` : "—"}
        />
        <MetricPill
          icon={Bell}
          label="Reminder verzonden"
          value={total ? `${reminderCount}/${total}` : "—"}
        />
        <MetricPill icon={CalendarIcon} label="Event" value={fmtDate(eventDate)} />
        <div className="flex-1 min-w-[180px] surface-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="truncate">Feedback ontvangen</span>
          </div>
          <p className="text-2xl font-semibold tabular-nums">{total ? `${feedbackCount}/${total}` : "—"}</p>
          {avatarsToShow.length > 0 && (
            <div className="flex items-center -space-x-2">
              {avatarsToShow.map((a) => (
                <UserAvatar key={a!.id} name={a!.full_name} className="h-7 w-7 ring-2 ring-background" />
              ))}
              {extra > 0 && (
                <span className="ml-3 text-xs text-muted-foreground">+{extra}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Per-ambassadeur table */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Nog geen ingeschreven ambassadeurs.</p>
      ) : (
        <div className="rounded-md border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Naam</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Briefing</TableHead>
                <TableHead>Reminder</TableHead>
                <TableHead>Feedback gevraagd</TableHead>
                <TableHead>Feedback ingediend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ ins, amb, response }) => (
                <TableRow key={ins.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserAvatar name={amb?.full_name ?? "?"} className="h-7 w-7" />
                      <span className="truncate">{amb?.full_name ?? "Onbekend"}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={ins.status} /></TableCell>
                  <TableCell className="text-sm tabular-nums">{fmtDate(ins.briefing_sent_at)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmtDate(ins.reminder_sent_at)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{fmtDate(ins.feedback_request_sent_at)}</TableCell>
                  <TableCell className="text-sm">
                    {response ? (
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums">{fmtDate(response.submitted_at)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setSelectedResponse(response)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Bekijk
                        </Button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Aggregation card */}
      {responses.length > 0 && (
        <div className="surface-card p-4 sm:p-5 space-y-4 bg-muted/30">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {responses.length}/{total || responses.length} reacties verzameld
              </h3>
              <Badge variant="secondary">{Math.round((responses.length / Math.max(total, responses.length)) * 100)}%</Badge>
            </div>
            <Progress value={(responses.length / Math.max(total, responses.length)) * 100} className="h-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scores.map((s) => (
              <ScoreRow key={s.label} label={s.label} value={s.value} />
            ))}
          </div>

          {profileCounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Meest ontmoete profielen
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileCounts.map(([name, count]) => (
                  <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {name} <span className="opacity-70">· {count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {quotes.length > 0 && (
            <Collapsible open={quotesOpen} onOpenChange={setQuotesOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Quote className="h-3.5 w-3.5" /> Citaten ({quotes.length})
                  </span>
                  {quotesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {quotes.map((q) => (
                  <div key={q.id} className="border-l-2 border-primary/40 pl-3 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {q.respondent_name} · {fmtDate(q.submitted_at)}
                    </p>
                    {q.participate_again_reason?.trim() && (
                      <p className="text-sm italic">"{q.participate_again_reason}"</p>
                    )}
                    {q.comments?.trim() && (
                      <p className="text-sm text-muted-foreground">{q.comments}</p>
                    )}
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!selectedResponse} onOpenChange={(open) => !open && setSelectedResponse(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedResponse && (
            <>
              <SheetHeader>
                <SheetTitle>Feedback van {selectedResponse.respondent_name}</SheetTitle>
                <SheetDescription>
                  Ingediend op {fmtDateLong(selectedResponse.submitted_at)}
                  {selectedResponse.respondent_email && <> · {selectedResponse.respondent_email}</>}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-5">
                <div className="space-y-3">
                  <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Scores</h4>
                  {SCORE_LABELS.map((s) => {
                    const v = selectedResponse[s.key] as number | null;
                    return (
                      <ScoreRow key={s.key as string} label={s.label} value={v ?? 0} />
                    );
                  })}
                </div>
                {(selectedResponse.profiles_met?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Ontmoete profielen</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedResponse.profiles_met!.map((p) => (
                        <Badge key={p} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedResponse.participate_again_reason?.trim() && (
                  <div className="space-y-1">
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Reden opnieuw deelnemen</h4>
                    <p className="text-sm whitespace-pre-wrap">{selectedResponse.participate_again_reason}</p>
                  </div>
                )}
                {selectedResponse.comments?.trim() && (
                  <div className="space-y-1">
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Opmerkingen</h4>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{selectedResponse.comments}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}