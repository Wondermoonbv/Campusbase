import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, CalendarDays, School, Users, CheckCircle2, Clock, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";
import { stripHtml } from "@/lib/sanitize";

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
}

export default function AmbassadeurPortaalPage() {
  const [step, setStep] = useState<"identify" | "register" | "overview">("identify");
  const [email, setEmail] = useState("");
  const [ambassadeur, setAmbassadeur] = useState<Ambassadeur | null>(null);
  const [regForm, setRegForm] = useState({ full_name: "", email: "", department: "" });
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const setActionLoading = (key: string, value: boolean) => {
    setActionLoadingMap(prev => ({ ...prev, [key]: value }));
  };

  const loadEvents = useCallback(async (ambId: string) => {
    setEventsLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const { data: evts, error: evtErr } = await supabase
        .from("evenementen")
        .select("id, name, date, location, school_id, max_ambassadeurs")
        .gte("date", today)
        .neq("status", "geannuleerd")
        .order("date", { ascending: true });

      if (evtErr) throw evtErr;

      // Get school names
      const schoolIds = [...new Set((evts || []).map(e => e.school_id).filter(Boolean))] as string[];
      let schoolMap: Record<string, string> = {};
      if (schoolIds.length > 0) {
        const { data: schools } = await supabase
          .from("scholen")
          .select("id, name")
          .in("id", schoolIds);
        schoolMap = Object.fromEntries((schools || []).map(s => [s.id, s.name]));
      }

      // Get ALL signups for counting, and ambassador's own signups separately
      const eventIds = (evts || []).map(e => e.id);

      const [{ data: allSignups }, { data: mySignups }] = await Promise.all([
        supabase
          .from("event_inschrijvingen")
          .select("evenement_id, status")
          .in("evenement_id", eventIds)
          .neq("status", "afgemeld"),
        supabase
          .from("event_inschrijvingen")
          .select("id, evenement_id, status")
          .eq("ambassadeur_id", ambId)
          .in("evenement_id", eventIds),
      ]);

      const portalEvents: PortalEvent[] = (evts || []).map(e => {
        const signupCount = (allSignups || []).filter(s => s.evenement_id === e.id).length;
        const mySignup = (mySignups || []).find(s => s.evenement_id === e.id);
        return {
          id: e.id,
          name: e.name,
          date: e.date,
          location: e.location || "",
          school_name: e.school_id ? schoolMap[e.school_id] || null : null,
          max_ambassadeurs: e.max_ambassadeurs,
          signup_count: signupCount,
          my_status: mySignup?.status || null,
          my_inschrijving_id: mySignup?.id || null,
        };
      });

      setEvents(portalEvents);
    } catch {
      toast.error("Kon events niet laden.");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = stripHtml(email).toLowerCase().trim();
    if (!cleanEmail) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ambassadeurs")
        .select("id, full_name, email, department")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAmbassadeur(data as Ambassadeur);
        setStep("overview");
        await loadEvents(data.id);
      } else {
        setRegForm({ full_name: "", email: cleanEmail, department: "" });
        setStep("register");
      }
    } catch {
      toast.error("Er ging iets mis. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

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
        .select("id, full_name, email, department")
        .single();

      if (error) throw error;
      setAmbassadeur(data as Ambassadeur);
      setStep("overview");
      await loadEvents(data.id);
      toast.success("Welkom! Je bent geregistreerd als ambassadeur.");
    } catch {
      toast.error("Registratie mislukt. Probeer opnieuw.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (eventId: string) => {
    if (!ambassadeur) return;
    setActionLoading(eventId, true);
    try {
      const ev = events.find(e => e.id === eventId);
      if (ev?.max_ambassadeurs && ev.signup_count >= ev.max_ambassadeurs) {
        toast.error("Maximum aantal inschrijvingen bereikt voor dit event.");
        return;
      }

      const { error } = await supabase
        .from("event_inschrijvingen")
        .insert({
          evenement_id: eventId,
          ambassadeur_id: ambassadeur.id,
          status: "ingeschreven",
        });

      if (error) throw error;
      toast.success("Je bent ingeschreven!");
      await loadEvents(ambassadeur.id);
    } catch {
      toast.error("Inschrijving mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const handleCancel = async (inschrijvingId: string, eventId: string) => {
    if (!ambassadeur) return;
    setActionLoading(eventId, true);
    try {
      const { error } = await supabase
        .from("event_inschrijvingen")
        .update({ status: "afgemeld" })
        .eq("id", inschrijvingId);

      if (error) throw error;
      toast.success("Je bent afgemeld.");
      await loadEvents(ambassadeur.id);
    } catch {
      toast.error("Afmelden mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const handleReSignup = async (inschrijvingId: string, eventId: string) => {
    if (!ambassadeur) return;
    setActionLoading(eventId, true);
    try {
      const ev = events.find(e => e.id === eventId);
      if (ev?.max_ambassadeurs && ev.signup_count >= ev.max_ambassadeurs) {
        toast.error("Maximum aantal inschrijvingen bereikt voor dit event.");
        return;
      }

      const { error } = await supabase
        .from("event_inschrijvingen")
        .update({ status: "ingeschreven" })
        .eq("id", inschrijvingId);

      if (error) throw error;
      toast.success("Je bent opnieuw ingeschreven!");
      await loadEvents(ambassadeur.id);
    } catch {
      toast.error("Herinschrijving mislukt.");
    } finally {
      setActionLoading(eventId, false);
    }
  };

  const statusBadge = (status: string | null) => {
    switch (status) {
      case "ingeschreven":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"><Clock className="h-3 w-3 mr-1" />Ingeschreven</Badge>;
      case "bevestigd":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3 mr-1" />Bevestigd</Badge>;
      case "backup":
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100"><AlertCircle className="h-3 w-3 mr-1" />Backup</Badge>;
      case "afgemeld":
        return <Badge className="bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100">Afgemeld</Badge>;
      case "uitgenodigd":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"><Mail className="h-3 w-3 mr-1" />Uitgenodigd</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="w-full py-4 px-4 sm:px-6" style={{ backgroundColor: BRAND.petrol }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-semibold leading-tight">Ambassadeur Portaal</h1>
            <p className="text-white/70 text-xs">Elia Campus Events</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {step === "identify" && (
          <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900">Welkom</h2>
                <p className="text-sm text-muted-foreground mt-1">Vul je e-mailadres in om je events te bekijken</p>
              </div>
              <form onSubmit={handleIdentify} className="space-y-4">
                <div>
                  <Label htmlFor="portal-email">E-mailadres</Label>
                  <Input
                    id="portal-email"
                    type="email"
                    required
                    placeholder="naam@bedrijf.be"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: BRAND.petrol }}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Verder
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "register" && (
          <Card className="max-w-md mx-auto shadow-md">
            <CardContent className="pt-6 pb-6 space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-xl font-semibold text-gray-900">Registreren</h2>
                <p className="text-sm text-muted-foreground mt-1">We kennen je nog niet. Vul je gegevens aan om je te registreren.</p>
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
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("identify")}>Terug</Button>
                  <Button type="submit" className="flex-1" disabled={loading} style={{ backgroundColor: BRAND.petrol }}>
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Registreren
                  </Button>
                </div>
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
              <Button variant="outline" size="sm" onClick={() => { setStep("identify"); setAmbassadeur(null); setEmail(""); }}>
                Afmelden
              </Button>
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
                  const isFull = ev.max_ambassadeurs !== null && ev.signup_count >= ev.max_ambassadeurs;
                  const isActioning = !!actionLoadingMap[ev.id];

                  return (
                    <Card key={ev.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <h4 className="font-semibold text-gray-900 text-base">{ev.name}</h4>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {new Date(ev.date).toLocaleDateString("nl-BE", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                              </span>
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />{ev.location}
                                </span>
                              )}
                              {ev.school_name && (
                                <span className="flex items-center gap-1">
                                  <School className="h-3.5 w-3.5" />{ev.school_name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {ev.signup_count}{ev.max_ambassadeurs !== null ? `/${ev.max_ambassadeurs}` : ""} plaatsen
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ev.my_status && statusBadge(ev.my_status)}

                            {/* No registration → show signup button */}
                            {!ev.my_status && (
                              <Button
                                size="sm"
                                disabled={isFull || isActioning}
                                onClick={() => handleSignup(ev.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                {isFull ? "Volzet" : "Inschrijven"}
                              </Button>
                            )}

                            {/* Uitgenodigd → show signup button */}
                            {ev.my_status === "uitgenodigd" && ev.my_inschrijving_id && (
                              <Button
                                size="sm"
                                disabled={isFull || isActioning}
                                onClick={() => handleReSignup(ev.my_inschrijving_id!, ev.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                {isFull ? "Volzet" : "Inschrijven"}
                              </Button>
                            )}

                            {/* Ingeschreven → cancel button */}
                            {ev.my_status === "ingeschreven" && ev.my_inschrijving_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActioning}
                                onClick={() => handleCancel(ev.my_inschrijving_id!, ev.id)}
                              >
                                {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                Afmelden
                              </Button>
                            )}

                            {/* Afgemeld → re-signup button */}
                            {ev.my_status === "afgemeld" && ev.my_inschrijving_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isFull || isActioning}
                                onClick={() => handleReSignup(ev.my_inschrijving_id!, ev.id)}
                              >
                                {isActioning && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                {isFull ? "Volzet" : "Opnieuw inschrijven"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Elia Group — Ambassadeur Portaal
      </footer>
    </div>
  );
}
