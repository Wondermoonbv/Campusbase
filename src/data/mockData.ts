import type { School, Program, Contract, Event, SchoolEventParticipation } from "@/types/crm";

// Mock data for development — will be replaced with Supabase queries
export const mockSchools: School[] = [
  {
    id: "1", name: "KU Leuven", type: "universiteit", province: "Vlaams-Brabant", city: "Leuven",
    website: "https://kuleuven.be", contact_name: "Jan Peeters", contact_email: "jan.peeters@kuleuven.be",
    contact_phone: "+32 16 32 40 10", language: "NL", notes: "Belangrijke partner voor engineering", status: "actief", created_at: "2024-01-15",
  },
  {
    id: "2", name: "UGent", type: "universiteit", province: "Oost-Vlaanderen", city: "Gent",
    website: "https://ugent.be", contact_name: "Marie De Smet", contact_email: "marie.desmet@ugent.be",
    contact_phone: "+32 9 331 01 01", language: "NL", notes: "", status: "actief", created_at: "2024-02-10",
  },
  {
    id: "3", name: "UCLouvain", type: "universiteit", province: "Waals-Brabant", city: "Louvain-la-Neuve",
    website: "https://uclouvain.be", contact_name: "Pierre Dubois", contact_email: "pierre.dubois@uclouvain.be",
    contact_phone: "+32 10 47 21 11", language: "FR", notes: "Franstalig partnerschap", status: "actief", created_at: "2024-03-05",
  },
  {
    id: "4", name: "Thomas More", type: "hogeschool", province: "Antwerpen", city: "Mechelen",
    website: "https://thomasmore.be", contact_name: "Lien Janssens", contact_email: "lien.janssens@thomasmore.be",
    contact_phone: "+32 15 36 91 00", language: "NL", notes: "", status: "prospect", created_at: "2024-04-20",
  },
  {
    id: "5", name: "VUB", type: "universiteit", province: "Brussel", city: "Brussel",
    website: "https://vub.be", contact_name: "Koen Willems", contact_email: "koen.willems@vub.be",
    contact_phone: "+32 2 629 21 11", language: "NL", notes: "Engineering faculteit focus", status: "actief", created_at: "2024-01-20",
  },
  {
    id: "6", name: "HOGENT", type: "hogeschool", province: "Oost-Vlaanderen", city: "Gent",
    website: "https://hogent.be", contact_name: "Sara Van Damme", contact_email: "sara.vandamme@hogent.be",
    contact_phone: "+32 9 243 87 87", language: "NL", notes: "", status: "actief", created_at: "2024-05-01",
  },
  {
    id: "7", name: "ULB", type: "universiteit", province: "Brussel", city: "Brussel",
    website: "https://ulb.be", contact_name: "Sophie Laurent", contact_email: "sophie.laurent@ulb.be",
    contact_phone: "+32 2 650 21 11", language: "FR", notes: "", status: "inactief", created_at: "2023-11-15",
  },
];

export const mockPrograms: Program[] = [
  { id: "1", school_id: "1", name: "Burgerlijk Ingenieur", faculty: "Faculteit Ingenieurswetenschappen", study_level: "master", field_of_study: "Engineering", student_count: 450 },
  { id: "2", school_id: "1", name: "Informatica", faculty: "Faculteit Wetenschappen", study_level: "master", field_of_study: "IT / Informatica", student_count: 320 },
  { id: "3", school_id: "2", name: "Elektrotechniek", faculty: "Faculteit Ingenieurswetenschappen", study_level: "master", field_of_study: "Engineering", student_count: 280 },
  { id: "4", school_id: "4", name: "Elektromechanica", faculty: "Departement Technologie", study_level: "bachelor", field_of_study: "Elektromechanica", student_count: 150 },
  { id: "5", school_id: "5", name: "Computer Science", faculty: "Faculty of Sciences", study_level: "master", field_of_study: "IT / Informatica", student_count: 200 },
];

export const mockContracts: Contract[] = [
  { id: "1", school_id: "1", contract_type: "partnership", start_date: "2024-01-01", end_date: "2025-12-31", renewal_date: "2025-10-01", status: "actief", value: 15000, document_url: "", notes: "Jaarlijkse partnerschapsovereenkomst" },
  { id: "2", school_id: "2", contract_type: "stage-overeenkomst", start_date: "2024-03-01", end_date: "2025-02-28", renewal_date: "2025-01-15", status: "actief", value: null, document_url: "", notes: "" },
  { id: "3", school_id: "3", contract_type: "sponsoring", start_date: "2023-09-01", end_date: "2024-08-31", renewal_date: "2024-06-01", status: "verlopen", value: 5000, document_url: "", notes: "Sponsoring ingenieursgala" },
  { id: "4", school_id: "5", contract_type: "partnership", start_date: "2024-06-01", end_date: "2026-05-31", renewal_date: "2026-03-01", status: "actief", value: 20000, document_url: "", notes: "" },
  { id: "5", school_id: "4", contract_type: "partnership", start_date: "2025-01-01", end_date: "2025-06-30", renewal_date: "2025-05-01", status: "in onderhandeling", value: 8000, document_url: "", notes: "Nieuw partnerschap in bespreking" },
];

export const mockEvents: Event[] = [
  { id: "1", name: "Jobbeurs KU Leuven", type: "jobbeurs", date: "2026-03-15", location: "Aula KU Leuven", school_id: "1", responsible: "Anna Verhoeven", budget: 3500, status: "afgelopen", notes: "" },
  { id: "2", name: "Career Day UGent", type: "jobbeurs", date: "2026-04-10", location: "ICC Gent", school_id: "2", responsible: "Tom De Graef", budget: 4200, status: "bevestigd", notes: "Stand nr. 42" },
  { id: "3", name: "Hackathon Energy of the Future", type: "hackathon", date: "2026-05-20", location: "BeCentral, Brussel", school_id: null, responsible: "Sarah Mertens", budget: 8000, status: "gepland", notes: "Multi-school event" },
  { id: "4", name: "Workshop Smart Grids VUB", type: "workshop", date: "2026-04-25", location: "VUB Campus Etterbeek", school_id: "5", responsible: "Anna Verhoeven", budget: 1500, status: "bevestigd", notes: "" },
  { id: "5", name: "Campus Presentatie HOGENT", type: "campus presentatie", date: "2026-05-05", location: "HOGENT Campus Schoonmeersen", school_id: "6", responsible: "Tom De Graef", budget: 800, status: "gepland", notes: "" },
  { id: "6", name: "Jobbeurs UCLouvain", type: "jobbeurs", date: "2026-04-18", location: "Forum UCLouvain", school_id: "3", responsible: "Sarah Mertens", budget: 3000, status: "bevestigd", notes: "" },
  { id: "7", name: "Ingenieursbeurs Brussel", type: "jobbeurs", date: "2026-06-12", location: "Tour & Taxis, Brussel", school_id: null, responsible: "Anna Verhoeven", budget: 6000, status: "gepland", notes: "" },
];

export const mockParticipations: SchoolEventParticipation[] = [
  { id: "1", school_id: "1", event_id: "1", staff_count: 4, student_contacts: 85, follow_up_done: true, rating: 4 },
  { id: "2", school_id: "2", event_id: "2", staff_count: 3, student_contacts: 0, follow_up_done: false, rating: null },
  { id: "3", school_id: "1", event_id: "3", staff_count: 2, student_contacts: 0, follow_up_done: false, rating: null },
  { id: "4", school_id: "5", event_id: "3", staff_count: 2, student_contacts: 0, follow_up_done: false, rating: null },
];
