// Centralized Dutch labels for event enum values

export const REGIO_LABELS: Record<string, string> = {
  brussel: "Brussel",
  antwerpen: "Antwerpen",
  vlaams_brabant: "Vlaams-Brabant",
  west_vlaanderen: "West-Vlaanderen",
  limburg: "Limburg",
  oost_vlaanderen: "Oost-Vlaanderen",
  waals_brabant: "Waals-Brabant",
  henegouwen: "Henegouwen",
};

export const TAAL_LABELS: Record<string, string> = {
  nl: "Nederlands",
  fr: "Frans",
  en: "Engels",
  meertalig: "Meertalig",
};

export const DOELGROEP_LABELS: Record<string, string> = {
  bachelor: "Bachelor",
  master: "Master",
  beide: "Beide",
  graduaat: "Graduaat",
};

export const REGISTRATIE_TYPE_LABELS: Record<string, string> = {
  partnership: "Via partnership",
  ad_hoc: "Ad hoc",
};

export const FOLLOW_UP_LABELS: Record<string, string> = {
  to_do: "Te doen",
  in_orde: "In orde",
  nvt: "N.v.t.",
};

export const ORGANISATIE_TYPE_LABELS: Record<string, string> = {
  school: "School",
  studentenvereniging: "Studentenvereniging",
  werkgeversorganisatie: "Werkgeversorganisatie",
  overheid: "Overheid",
  andere: "Andere",
};

export function followUpColor(status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "to_do": return "destructive";
    case "in_orde": return "default";
    case "nvt": return "secondary";
    default: return "outline";
  }
}

export function followUpVariant(status: string | null | undefined): string {
  switch (status) {
    case "to_do": return "bg-amber-100 text-amber-800 border-amber-200";
    case "in_orde": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "nvt": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-100 text-gray-500 border-gray-200";
  }
}
