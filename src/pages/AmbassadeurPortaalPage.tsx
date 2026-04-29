import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Loader2, MapPin, CalendarDays, School, Users, CheckCircle2, Clock, AlertCircle, Mail, Link2, CalendarPlus, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { stripHtml } from "@/lib/sanitize";
import { generateICS } from "@/lib/ics";

const BRAND = { petrol: "#0E6575" };

interface Ambassadeur {
  id: string;
  full_name: string;
  email: string;
  department: string;
}

interface PortalEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  school_name: string | null;
  max_ambassadeurs: number | null;
  signup_count: number;
  my_status: string | null;
  my_inschrijving_id: string | null;
  start_time: string | null;
  end_time: string | null;
  setup_time: string | null;
  contactpersoon: string | null;
  description: string | null;
}

interface PastEvent {
  id: string;
  name: string;
  date: string;
  location: string;
  my_status: string | null;
  feedback_form_id: string | null;
  feedback_given: boolean;
}

const STORAGE_KEY = "ambassadeur_portal_token";

export default function AmbassadeurPortaalPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"loading" | "register" | "overview" | "invalid" | "expired">("loading");
  const [ambassadeur, setAmbassadeur] = useState<Ambassadeur | null>(null);
  const [currentToken, setCurrentToken] = useState<string>("");
  const [regForm, setRegForm] = useState({ full_name: "", email: "", department: "" });
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<PastEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const setActionLoading = (key: string, value: boolean) => {
    setActionLoadingMap(prev => ({ ...prev, [key]: value }));
  };

  const loginWithToken = useCallback(async (token: string): Promise<boolean> => {
    setEventsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-ambassador-lookup", {
        body: { accessToken: token },
      });
      if (error || !data?.ambassador) {
        // Detect expired-token signal from the edge function
        const errMsg = (error as { message?: string } | null)?.message ?? "";
        const ctx = (error as { context?: { expired?: boolean } } | null)?.context;
        if (ctx?.expired || (data as { expired?: boolean } | null)?.expired || /verlopen/i.test(errMsg)) {
          localStorage.removeItem(STORAGE_KEY);
          setStep("expired");
        }
        return false;
      }

      const amb = data.ambassador as Ambassadeur;
      setAmbassadeur(amb);
      setCurrentToken(token);
      localStorage.setItem(STORAGE_KEY, token);
      window.history.replaceState(null, "", `${window.location.pathname}?token=${token}`);
      setStep("overview");

      // Build events + past events from the single edge function response
      const today = new Date().toISOString().split("T")[0];
      const allEvents = (data.events ?? []) as Array<{
        id: string;
        name: string;
        date: string;
        location: string | null;
        start_time: string | null;
        end_time: string | null;
        status: string;
        max_ambassadeurs: number | null;
        setup_time: string | null;
        teardown_time: string | null;
        short_code: string | null;
      }>;
      const enrollments = (data.enrollments ?? []) as Array<{
        id: string;
        evenement_id: string;
        status: string;
      }>;
      const feedbackForms = (data.feedbackForms ?? []) as Array<{
        id: string;
        evenement_id: string;
      }>;
      const feedbackResponses = (data.feedbackResponses ?? []) as Array<{
        id: string;
        form_id: string;
      }>;

      const myEnrollmentByEvent = new Map<string, { id: string; status: string }>();
      enrollments.forEach(e => myEnrollmentByEvent.set(e.evenement_id, { id: e.id, status: e.status }));

      const upcoming: PortalEvent[] = allEvents
        .filter(e => e.date >= today)
        .map(e => {
          const mine = myEnrollmentByEvent.get(e.id);
          return {
            id: e.id,
            name: e.name,
            date: e.date,
            location: e.location || "",
            school_name: null,
            max_ambassadeurs: e.max_ambassadeurs,
            // Signup count is not exposed via the public lookup; show only own status.
            signup_count: 0,
            my_status: mine?.status ?? null,
            my_inschrijving_id: mine?.id ?? null,
            start_time: e.start_time,
            end_time: e.end_time,
            setup_time: e.setup_time,
            contactpersoon: null,
            description: null,
          };
        });

      setEvents(upcoming);

      const past: PastEvent[] = allEvents
        .filter(e => e.date < today)
        .filter(e => myEnrollmentByEvent.get(e.id)?.status === "bevestigd")
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5)
        .map(e => {
          const form = feedbackForms.find(f => f.evenement_id === e.id);
          const hasGivenFeedback = form
            ? feedbackResponses.some(r => r.form_id === form.id)
            : false;
          return {
            id: e.id,
            name: e.name,
            date: e.date,
            location: e.location || "",
            my_status: "bevestigd",
            feedback_form_id: form?.id ?? null,
            feedback_given: hasGivenFeedback,
          };
        });

      setPastEvents(past);
      return true;
    } catch (err) {
      console.error("Ambassador lookup failed:", err);
      return false;
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const refreshPortal = useCallback(async () => {
    if (!currentToken) return;
    await loginWithToken(currentToken);
  }, [currentToken, loginWithToken]);

  // Init: check URL token → localStorage token → show register
  useEffect(() => {
    const urlToken = searchParams.get("token");
    const savedToken = localStorage.getItem(STORAGE_KEY);
    const token = urlToken || savedToken;

    if (!token) {
      setStep("register");
      return;
    }

    (async () => {
      const ok = await loginWithToken(token);
      if (!ok) {
        localStorage.removeItem(STORAGE_KEY);
        if (urlToken) {
          setStep("invalid");
        } else {
          setStep("register");
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = stripHtml(regForm.full_name).trim();
    const dept = stripHtml(regForm.department).trim();
    const cleanEmail = stripHtml(regForm.email).toLowerCase().trim();
    if (!name || !cleanEmail) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ambassadeurs")
        .insert({ full_name: name, email: cleanEmail, department: dept })
        .select("access_token")
        .single();

      if (error) throw error;

      const newToken = (data as { access_token: string }).access_token;
      const ok = await loginWithToken(newToken);
      if (!ok) throw new Error("Token niet geldig na registratie.");
      toast.success("Welkom! Bewaar deze link om in de toekomst direct toegang te krijgen tot je portaal.", { duration: 8000 });
    } catch {
      toast.error("Registratie mislukt. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAmbassadeur(null);
    setCurrentToken("");
    setEvents([]);
    window.history.replaceState(null, "", window.location.pathname);
    setStep("register");
  };

  const handleSignup = async (eventId: string) => {
    if (!ambassadeur || !currentToken) return;
    setActionLoading(eventId, true);
    try {
      const { data, error } = await supabase.functions.invoke("public-event-rsvp", {
        body: {
          accessToken: currentToken,
          evenementId: eventId,
          action: "signup",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.alreadyEnrolled) {
        toast.info("Je was al ingeschreven voor dit event.");
        return;
      }
      toast.success("Je bent ingeschreven!");
      await refreshPortal();
    } catch {
      toast.error("Inschrijving mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const handleCancel = async (inschrijvingId: string, eventId: string) => {
    if (!ambassadeur || !currentToken) return;
    setActionLoading(eventId, true);
    try {
      const { data, error } = await supabase.functions.invoke("public-event-rsvp", {
        body: {
          accessToken: currentToken,
          evenementId: eventId,
          inschrijvingId: inschrijvingId,
          action: "cancel",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Je bent afgemeld.");
      await refreshPortal();
    } catch {
      toast.error("Afmelden mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const handleReSignup = async (inschrijvingId: string, eventId: string) => {
    if (!ambassadeur || !currentToken) return;
    setActionLoading(eventId, true);
    try {
      const { data, error } = await supabase.functions.invoke("public-event-rsvp", {
        body: {
          accessToken: currentToken,
          evenementId: eventId,
          inschrijvingId: inschrijvingId,
          action: "resignup",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Je bent opnieuw ingeschreven!");
      await refreshPortal();
    } catch {
      toast.error("Herinschrijving mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const copyPortalLink = () => {
    if (!currentToken) return;
    const link = `${window.location.origin}/ambassadeur-portaal?token=${currentToken}`;
    navigator.clipboard.writeText(link);
    toast.success("Je persoonlijke portaallink is gekopieerd!");
  };

  const canDownloadIcs = (status: string | null) =>
    status === "ingeschreven" || status === "bevestigd";

  const downloadIcs = (ev: PortalEvent) => {
    const descParts: string[] = [];
    if (ev.school_name) descParts.push(`School: ${ev.school_name}`);
    if (ev.setup_time) descParts.push(`Opbouwtijd: ${ev.setup_time}`);
    if (ev.contactpersoon) descParts.push(`Contactpersoon: ${ev.contactpersoon}`);
    if (ev.description) descParts.push(ev.description);

    const ics = generateICS({
      name: ev.name,
      date: ev.date,
      start_time: ev.start_time,
      end_time: ev.end_time,
      location: ev.location || undefined,
      description: descParts.join("\n") || undefined,
    });

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ev.name.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Agenda-bestand gedownload");
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "uitgenodigd":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"><Mail className="h-3 w-3 mr-1" />Uitgenodigd</Badge>;
      case "ingeschreven":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Ingeschreven</Badge>;
      case "bevestigd":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Bevestigd ✓</Badge>;
      case "backup":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100"><AlertCircle className="h-3 w-3 mr-1" />Reservelijst</Badge>;
      case "afgemeld":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">Afgemeld</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (t: string | null) => t ? t.slice(0, 5) : null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-50">
      <header className="w-full py-4 px-4 sm:px-6" style={{ backgroundColor: BRAND.petrol }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-semibold leading-tight">Elia Campus Events</h1>
            <p className="text-white/70 text-xs">Ambassadeur Portaal</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {step === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {step === "invalid" && (
          <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-gray-900">Ongeldige link</h2>
              <p className="text-sm text-muted-foreground">
                Deze link is niet geldig. Neem contact op met het campus recruitment team voor een nieuwe link.
              </p>
              <Button variant="outline" onClick={() => setStep("register")}>
                Nieuw registreren
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "expired" && (
          <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6 pb-6 text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-semibold text-gray-900">Link verlopen</h2>
              <p className="text-sm text-muted-foreground">
                Je link is verlopen. Neem contact op met het Elia campus recruitment team voor een nieuwe link.
              </p>
              <a
                href="mailto:campusbase@campusbase.be"
                className="inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4"
                style={{ color: BRAND.petrol }}
              >
                <Mail className="h-4 w-4" />
                campusbase@campusbase.be
              </a>
            </CardContent>
          </Card>
        )}

        {step === "register" && (
          <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900">Registreren als ambassadeur</h2>
                <p className="text-sm text-muted-foreground mt-1">Vul je gegevens in om je te registreren. Je krijgt een persoonlijke link voor toekomstige toegang.</p>
              </div>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="reg-name">Naam *</Label>
                  <Input id="reg-name" required value={regForm.full_name} onChange={e => setRegForm({ ...regForm, full_name: e.target.value })} className="mt-1" maxLength={200} />
                </div>
                <div>
                  <Label htmlFor="reg-email">E-mailadres *</Label>
                  <Input id="reg-email" type="email" required value={regForm.email} onChange={e => setRegForm({ ...regForm, email: e.target.value })} className="mt-1" maxLength={255} />
                </div>
                <div>
                  <Label htmlFor="reg-dept">Afdeling</Label>
                  <Input id="reg-dept" value={regForm.department} onChange={e => setRegForm({ ...regForm, department: e.target.value })} className="mt-1" maxLength={200} />
                </div>
                <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: BRAND.petrol }}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Registreren
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "overview" && ambassadeur && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Hallo, {ambassadeur.full_name}</h2>
                <p className="text-sm text-muted-foreground">{ambassadeur.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={copyPortalLink} title="Kopieer je persoonlijke portaallink">
                  <Link2 className="h-4 w-4 mr-1" /> Link kopiëren
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Afmelden
                </Button>
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900">Aankomende campus events</h3>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p>Er zijn momenteel geen aankomende events.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {events.map(ev => {
                  const isActioning = !!actionLoadingMap[ev.id];

                  return (
                    <Card key={ev.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5 space-y-3">
                        {/* Header: naam + badge */}
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-foreground text-lg leading-tight">{ev.name}</h4>
                          {ev.my_status && (
                            <div className="shrink-0">
                              {statusBadge(ev.my_status)}
                            </div>
                          )}
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            {new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                            {(formatTime(ev.start_time) || formatTime(ev.end_time)) && (
                              <span className="ml-1">
                                {formatTime(ev.start_time)}{formatTime(ev.end_time) ? ` – ${formatTime(ev.end_time)}` : ""}
                              </span>
                            )}
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />{ev.location}
                            </span>
                          )}
                          {ev.school_name && (
                            <span className="flex items-center gap-1.5">
                              <School className="h-3.5 w-3.5 shrink-0" />{ev.school_name}
                            </span>
                          )}
                          {ev.setup_time && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 shrink-0" />Opbouw: {ev.setup_time}
                            </span>
                          )}
                          {ev.contactpersoon && (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 shrink-0" />{ev.contactpersoon}
                            </span>
                          )}
                          {ev.max_ambassadeurs !== null && (
                            <span className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 shrink-0" />
                              max. {ev.max_ambassadeurs} plaatsen
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-xs italic text-muted-foreground">
                            {ev.description.length > 120 ? ev.description.slice(0, 120) + "…" : ev.description}
                          </p>
                        )}

                        {/* Status toelichting */}
                        {ev.my_status && (() => {
                          const subtitles: Record<string, string> = {
                            uitgenodigd: "Je bent uitgenodigd. Schrijf je in om je interesse te bevestigen.",
                            ingeschreven: "Je inschrijving is ontvangen. Het team bevestigt binnenkort.",
                            bevestigd: "Je bent bevestigd voor dit event!",
                            backup: "Je staat op de reservelijst. We contacteren je als er een plaats vrijkomt.",
                            afgemeld: "Je hebt je afgemeld voor dit event.",
                          };
                          return subtitles[ev.my_status] ? (
                            <p className="text-xs italic text-muted-foreground">{subtitles[ev.my_status]}</p>
                          ) : null;
                        })()}

                        {/* Separator */}
                        <div className="border-t border-border/50" />

                        {/* Actie-rij */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          {!ev.my_status && (
                            <Button
                              size="sm"
                              disabled={isActioning}
                              onClick={() => handleSignup(ev.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                            >
                              {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                              Inschrijven
                            </Button>
                          )}

                          {ev.my_status === "uitgenodigd" && ev.my_inschrijving_id && (
                            <Button
                              size="sm"
                              disabled={isActioning}
                              onClick={() => handleReSignup(ev.my_inschrijving_id!, ev.id)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                            >
                              {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                              Inschrijven
                            </Button>
                          )}

                          {ev.my_status === "ingeschreven" && ev.my_inschrijving_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActioning}
                              onClick={() => handleCancel(ev.my_inschrijving_id!, ev.id)}
                              className="w-full sm:w-auto"
                            >
                              {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                              Afmelden
                            </Button>
                          )}

                          {ev.my_status === "afgemeld" && ev.my_inschrijving_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActioning}
                              onClick={() => handleReSignup(ev.my_inschrijving_id!, ev.id)}
                              className="w-full sm:w-auto"
                            >
                              {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                              Opnieuw inschrijven
                            </Button>
                          )}

                          {canDownloadIcs(ev.my_status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadIcs(ev)}
                              className="w-full sm:w-auto"
                            >
                              <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                              Toevoegen aan agenda
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Afgelopen events */}
            {pastEvents.length > 0 && (
              <div className="space-y-3 mt-8">
                <h3 className="text-lg font-medium text-muted-foreground">Afgelopen events</h3>
                {pastEvents.map(ev => (
                  <Card key={ev.id} className="shadow-sm opacity-75">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-medium text-muted-foreground">{ev.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {new Date(ev.date).toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" })}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {ev.feedback_given ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" /> Feedback gegeven ✓
                            </span>
                          ) : ev.feedback_form_id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/feedback/${ev.feedback_form_id}?name=${encodeURIComponent(ambassadeur!.full_name)}&email=${encodeURIComponent(ambassadeur!.email)}`, "_blank")}
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> Geef feedback
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Elia Group — Campus Recruitment
      </footer>
    </div>
    </TooltipProvider>
  );
}
