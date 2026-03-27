import { useState, useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import L from "leaflet";
import { useScholen } from "@/hooks/useScholen";
import { useEvenementen } from "@/hooks/useEvenementen";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { GraduationCap, CalendarDays, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

const CITY_COORDS: Record<string, [number, number]> = {
  "Leuven": [50.8798, 4.7005],
  "Gent": [51.0543, 3.7174],
  "Brussel": [50.8503, 4.3517],
  "Antwerpen": [51.2194, 4.4025],
  "Luik": [50.6326, 5.5797],
  "Namen": [50.4674, 4.8720],
  "Hasselt": [50.9311, 5.3378],
  "Brugge": [51.2093, 3.2247],
  "Kortrijk": [50.8280, 3.2650],
  "Mons": [50.4542, 3.9522],
};

export default function BelgiumMap() {
  const { scholen } = useScholen();
  const { evenementen } = useEvenementen();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const isMobile = useIsMobile();
  const [layer, setLayer] = useState<"scholen" | "evenementen" | "beide">("beide");

  const updateMarkers = useCallback(() => {
    if (!leafletMap.current || !markersRef.current) return;
    markersRef.current.clearLayers();

    const showScholen = layer === "scholen" || layer === "beide";
    const showEvents = layer === "evenementen" || layer === "beide";

    if (showScholen) {
      scholen.forEach((s) => {
        const coords = CITY_COORDS[s.city];
        if (!coords) return;
        const marker = L.circleMarker(coords, { radius: 7, fillColor: "#0E6575", color: "#fff", weight: 2, fillOpacity: 0.9 });
        marker.bindPopup(`<strong>${s.name}</strong><br/>${s.city}<br/><em>${s.type}</em>`);
        markersRef.current!.addLayer(marker);
      });
    }

    if (showEvents) {
      evenementen.forEach((e) => {
        const school = e.school_id ? scholen.find((s) => s.id === e.school_id) : null;
        const city = school?.city || e.location.split(",").pop()?.trim() || "";
        const coords = CITY_COORDS[city];
        if (!coords) return;
        const offset: [number, number] = [coords[0] + 0.008, coords[1] + 0.008];
        const marker = L.circleMarker(offset, { radius: 6, fillColor: "#ef7c14", color: "#fff", weight: 2, fillOpacity: 0.9 });
        marker.bindPopup(`<strong>${e.name}</strong><br/>${new Date(e.date).toLocaleDateString("nl-BE")}<br/>${e.location}`);
        markersRef.current!.addLayer(marker);
      });
    }
  }, [scholen, evenementen, layer]);

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    const map = L.map(mapRef.current, { zoomControl: !isMobile, attributionControl: false }).setView([50.5, 4.5], isMobile ? 7 : 8);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 18 }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    leafletMap.current = map;
    return () => { map.remove(); leafletMap.current = null; };
  }, [isMobile]);

  useEffect(() => { updateMarkers(); }, [updateMarkers]);

  return (
    <div className="surface-card overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-semibold">België — Scholen & Evenementen</h2>
        <ToggleGroup type="single" value={layer} onValueChange={(v) => v && setLayer(v as typeof layer)} size="sm">
          <ToggleGroupItem value="scholen" className="gap-1 text-xs"><GraduationCap className="h-3.5 w-3.5" /><span className="hidden sm:inline">Scholen</span></ToggleGroupItem>
          <ToggleGroupItem value="evenementen" className="gap-1 text-xs"><CalendarDays className="h-3.5 w-3.5" /><span className="hidden sm:inline">Events</span></ToggleGroupItem>
          <ToggleGroupItem value="beide" className="gap-1 text-xs"><Layers className="h-3.5 w-3.5" /><span className="hidden sm:inline">Beide</span></ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div ref={mapRef} className="h-[280px] sm:h-[400px]" />
    </div>
  );
}
