import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { mockSchools, mockEvents } from "@/data/mockData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GraduationCap, CalendarDays, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

// Province center coordinates for Belgium
const PROVINCE_COORDS: Record<string, [number, number]> = {
  "Antwerpen": [51.22, 4.40],
  "Brussel": [50.85, 4.35],
  "Henegouwen": [50.45, 3.95],
  "Limburg": [50.93, 5.34],
  "Luik": [50.63, 5.57],
  "Luxemburg": [49.82, 5.47],
  "Namen": [50.47, 4.87],
  "Oost-Vlaanderen": [51.04, 3.73],
  "Vlaams-Brabant": [50.88, 4.70],
  "Waals-Brabant": [50.67, 4.52],
  "West-Vlaanderen": [51.05, 3.08],
};

// City coordinates for known locations
const CITY_COORDS: Record<string, [number, number]> = {
  "Leuven": [50.8798, 4.7005],
  "Gent": [51.0543, 3.7174],
  "Louvain-la-Neuve": [50.6681, 4.6118],
  "Mechelen": [51.0259, 4.4777],
  "Brussel": [50.8503, 4.3517],
  "BeCentral, Brussel": [50.8453, 4.3567],
  "Tour & Taxis, Brussel": [50.8625, 4.3490],
  "ICC Gent": [51.0380, 3.7250],
  "Aula KU Leuven": [50.8775, 4.7005],
  "VUB Campus Etterbeek": [50.8225, 4.3925],
  "HOGENT Campus Schoonmeersen": [51.0350, 3.7020],
  "Forum UCLouvain": [50.6695, 4.6150],
};

function createIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.27 21.73 0 14 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "custom-map-pin",
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });
}

const schoolIcon = createIcon("hsl(189, 78%, 26%)");
const eventIcon = createIcon("hsl(28, 87%, 51%)");

type FilterMode = "both" | "schools" | "events";

export default function BelgiumMap() {
  const [filter, setFilter] = useState<FilterMode>("both");

  const schoolMarkers = useMemo(() => {
    if (filter === "events") return [];
    return mockSchools
      .map((s) => {
        const coords = CITY_COORDS[s.city] ?? PROVINCE_COORDS[s.province];
        if (!coords) return null;
        return { ...s, coords, kind: "school" as const };
      })
      .filter(Boolean);
  }, [filter]);

  const eventMarkers = useMemo(() => {
    if (filter === "schools") return [];
    return mockEvents
      .map((e) => {
        const coords = CITY_COORDS[e.location] ?? (e.school_id
          ? (() => {
              const school = mockSchools.find((s) => s.id === e.school_id);
              return school ? (CITY_COORDS[school.city] ?? PROVINCE_COORDS[school.province]) : null;
            })()
          : null);
        if (!coords) return null;
        return { ...e, coords, kind: "event" as const };
      })
      .filter(Boolean);
  }, [filter]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2>België overzicht</h2>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as FilterMode)}
          size="sm"
        >
          <ToggleGroupItem value="both" aria-label="Beide">
            <Layers className="h-4 w-4 mr-1.5" />
            Beide
          </ToggleGroupItem>
          <ToggleGroupItem value="schools" aria-label="Scholen">
            <GraduationCap className="h-4 w-4 mr-1.5" />
            Scholen
          </ToggleGroupItem>
          <ToggleGroupItem value="events" aria-label="Evenementen">
            <CalendarDays className="h-4 w-4 mr-1.5" />
            Evenementen
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="h-[400px] relative z-0">
        <MapContainer
          center={[50.5, 4.47]}
          zoom={8}
          className="h-full w-full"
          scrollWheelZoom={false}
          style={{ background: "hsl(195, 12%, 95%)" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {schoolMarkers.map((s) => s && (
            <Marker key={`school-${s.id}`} position={s.coords} icon={schoolIcon}>
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 capitalize">{s.type} · {s.city}</p>
                  <Link to={`/scholen/${s.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                    Details bekijken →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}

          {eventMarkers.map((e) => e && (
            <Marker key={`event-${e.id}`} position={e.coords} icon={eventIcon}>
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-semibold">{e.name}</p>
                  <p className="text-muted-foreground text-xs mt-0.5 capitalize">{e.type} · {new Date(e.date).toLocaleDateString("nl-BE")}</p>
                  <Link to={`/evenementen/${e.id}`} className="text-xs text-primary hover:underline mt-1 inline-block">
                    Details bekijken →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
