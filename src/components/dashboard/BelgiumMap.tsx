import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import L from "leaflet";
import { mockSchools, mockEvents } from "@/data/mockData";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GraduationCap, CalendarDays, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

const CITY_COORDS: Record<string, [number, number]> = {
  "Leuven": [50.8798, 4.7005],
  "Gent": [51.0543, 3.7174],
  "Louvain-la-Neuve": [50.6681, 4.6118],
  "Mechelen": [51.0259, 4.4777],
  "Brussel": [50.8503, 4.3517],
};

const LOCATION_COORDS: Record<string, [number, number]> = {
  "Aula KU Leuven": [50.8775, 4.7005],
  "ICC Gent": [51.0380, 3.7250],
  "BeCentral, Brussel": [50.8453, 4.3567],
  "VUB Campus Etterbeek": [50.8225, 4.3925],
  "HOGENT Campus Schoonmeersen": [51.0350, 3.7020],
  "Forum UCLouvain": [50.6695, 4.6150],
  "Tour & Taxis, Brussel": [50.8625, 4.3490],
};

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

function makeSvgIcon(color: string) {
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

const schoolIcon = makeSvgIcon("hsl(189, 78%, 26%)");
const eventIcon = makeSvgIcon("hsl(28, 87%, 51%)");

type FilterMode = "both" | "schools" | "events";

export default function BelgiumMap() {
  const [filter, setFilter] = useState<FilterMode>("both");
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<{ schools: L.LayerGroup; events: L.LayerGroup }>({
    schools: L.layerGroup(),
    events: L.layerGroup(),
  });

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [50.5, 4.47],
      zoom: 8,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com">CARTO</a>',
    }).addTo(map);

    // Add school markers
    mockSchools.forEach((s) => {
      const coords = CITY_COORDS[s.city] ?? PROVINCE_COORDS[s.province];
      if (!coords) return;
      L.marker(coords, { icon: schoolIcon })
        .bindPopup(`
          <div style="min-width:160px">
            <p style="font-weight:600;margin:0">${s.name}</p>
            <p style="color:#666;font-size:12px;margin:2px 0 4px">${s.type} · ${s.city}</p>
            <a href="/scholen/${s.id}" style="font-size:12px">Details bekijken →</a>
          </div>
        `)
        .addTo(layersRef.current.schools);
    });

    // Add event markers
    mockEvents.forEach((e) => {
      const coords =
        LOCATION_COORDS[e.location] ??
        (() => {
          if (!e.school_id) return null;
          const school = mockSchools.find((s) => s.id === e.school_id);
          return school ? (CITY_COORDS[school.city] ?? PROVINCE_COORDS[school.province]) : null;
        })();
      if (!coords) return;
      L.marker(coords, { icon: eventIcon })
        .bindPopup(`
          <div style="min-width:160px">
            <p style="font-weight:600;margin:0">${e.name}</p>
            <p style="color:#666;font-size:12px;margin:2px 0 4px">${e.type} · ${new Date(e.date).toLocaleDateString("nl-BE")}</p>
            <a href="/evenementen/${e.id}" style="font-size:12px">Details bekijken →</a>
          </div>
        `)
        .addTo(layersRef.current.events);
    });

    layersRef.current.schools.addTo(map);
    layersRef.current.events.addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle layers based on filter
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const { schools, events } = layersRef.current;

    if (filter === "both" || filter === "schools") {
      if (!map.hasLayer(schools)) map.addLayer(schools);
    } else {
      map.removeLayer(schools);
    }

    if (filter === "both" || filter === "events") {
      if (!map.hasLayer(events)) map.addLayer(events);
    } else {
      map.removeLayer(events);
    }
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
      <div ref={containerRef} className="h-[400px]" style={{ zIndex: 0 }} />
    </div>
  );
}
