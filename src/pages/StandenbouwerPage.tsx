import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, MapPin, Clock, Ruler, User, StickyNote, CalendarDays } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { nl } from "date-fns/locale";

interface StandEvent {
  id: string;
  name: string;
  date: string;
  location: string | null;
  opbouw_tijd: string | null;
  afbraak_tijd: string | null;
  stand_grootte: string | null;
  contactpersoon_stand: string | null;
  stand_notities: string | null;
}

export default function StandenbouwerPage() {
  const { logout, user } = useAuth();
  const [events, setEvents] = useState<StandEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("evenementen")
        .select("id, name, date, location, opbouw_tijd, afbraak_tijd, stand_grootte, contactpersoon_stand, stand_notities")
        .eq("standenbouwer_nodig", true)
        .order("date", { ascending: true });
      if (!error && data) setEvents(data as StandEvent[]);
      setLoading(false);
    }
    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">CB</div>
          <span className="font-semibold text-sm">CampusBase</span>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-muted-foreground hidden sm:inline">{user.name}</span>}
          <Button variant="outline" size="sm" onClick={logout} className="h-8 gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Uitloggen
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-xl font-semibold mb-6">Evenementen overzicht</h1>

        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse">Laden...</div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Geen evenementen gevonden waar een standenbouwer nodig is.</p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const past = ev.date < today;
              return (
                <Card key={ev.id} className={past ? "opacity-50" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{ev.name}</CardTitle>
                      {past && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          Afgelopen
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Detail icon={CalendarDays} label="Datum" value={format(parseISO(ev.date), "d MMMM yyyy", { locale: nl })} />
                      <Detail icon={MapPin} label="Locatie" value={ev.location} />
                      <Detail icon={Clock} label="Opbouwtijd" value={ev.opbouw_tijd} />
                      <Detail icon={Clock} label="Afbraaktijd" value={ev.afbraak_tijd} />
                      <Detail icon={Ruler} label="Standgrootte" value={ev.stand_grootte} />
                      <Detail icon={User} label="Contactpersoon" value={ev.contactpersoon_stand} />
                    </div>
                    {ev.stand_notities && (
                      <div className="flex gap-2 mt-1 pt-2 border-t border-border">
                        <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <p className="text-muted-foreground text-xs leading-relaxed">{ev.stand_notities}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
