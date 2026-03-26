import type { School, Contact, Program, Contract, Event, SchoolEventParticipation, EventProgram, Task } from "@/types/crm";

// Mock data for development — will be replaced with Supabase queries
export const mockSchools: School[] = [
  { id: "1", name: "KU Leuven", type: "universiteit", province: "Vlaams-Brabant", city: "Leuven", website: "https://kuleuven.be", language: "NL", notes: "Belangrijke partner voor engineering", status: "actief", created_at: "2026-01-15" },
  { id: "2", name: "HOGENT", type: "hogeschool", province: "Oost-Vlaanderen", city: "Gent", website: "https://hogent.be", language: "NL", notes: "", status: "actief", created_at: "2026-02-01" },
];

export const mockContacts: Contact[] = [
  { id: "1", school_id: "1", name: "Jan Peeters", email: "jan.peeters@kuleuven.be", phone: "+32 16 32 40 10", role: "Career Services Manager", department: "Dienst Studentenvoorzieningen", notes: "", linkedin_url: "https://linkedin.com/in/janpeeters" },
  { id: "2", school_id: "2", name: "Sara Van Damme", email: "sara.vandamme@hogent.be", phone: "+32 9 243 87 87", role: "Verantwoordelijke Jobbeurzen", department: "", notes: "", linkedin_url: "" },
];

export const mockPrograms: Program[] = [
  { id: "1", school_id: "1", name: "Burgerlijk Ingenieur", faculty: "Faculteit Ingenieurswetenschappen", study_level: "master", field_of_study: "Engineering", student_count: 450 },
  { id: "2", school_id: "2", name: "Elektromechanica", faculty: "Departement Technologie", study_level: "bachelor", field_of_study: "Elektromechanica", student_count: 150 },
];

export const mockContracts: Contract[] = [
  { id: "1", school_id: "1", contract_type: "partnership", start_date: "2026-01-01", end_date: "2027-12-31", renewal_date: "2027-10-01", status: "actief", value: 15000, document_url: "", notes: "Jaarlijkse partnerschapsovereenkomst", description: "Strategisch partnerschap met KU Leuven voor employer branding activiteiten.", linked_event_ids: ["1"] },
  { id: "2", school_id: "2", contract_type: "sponsoring", start_date: "2026-01-01", end_date: "2026-06-30", renewal_date: "2026-05-15", status: "actief", value: 5000, document_url: "", notes: "Verloopt binnenkort", description: "Sponsoring jobbeurs HOGENT.", linked_event_ids: ["2"] },
];

export const mockEvents: Event[] = [
  { id: "1", name: "Career Day KU Leuven", type: "jobbeurs", date: "2026-04-10", start_time: "09:00", end_time: "16:00", setup_date: "2026-04-09", setup_time: "14:00", location: "Aula KU Leuven", school_id: "1", responsible: "Ellen Geerts", team_members: ["Naomi Geyskens", "Matthias Peeters"], elia_contact: "Ellen Geerts", budget: 3500, status: "bevestigd", description: "Jaarlijkse jobbeurs met focus op engineering en IT studenten.", stand_type: "jobbeurs stand", stand_size: "groot 6m²+", notes: "" },
  { id: "2", name: "Campus Presentatie HOGENT", type: "campus presentatie", date: "2026-05-05", start_time: "11:00", end_time: "13:00", setup_date: "2026-05-05", setup_time: "09:30", location: "HOGENT Campus Schoonmeersen", school_id: "2", responsible: "Naomi Geyskens", team_members: ["Eline ten Cate"], elia_contact: "Naomi Geyskens", budget: 800, status: "gepland", description: "Presentatie over carrièremogelijkheden bij Elia.", stand_type: "presentatie", stand_size: "klein 2m²", notes: "" },
];

export const mockEventPrograms: EventProgram[] = [
  { event_id: "1", program_id: "1" },
  { event_id: "2", program_id: "2" },
];

export const mockParticipations: SchoolEventParticipation[] = [
  { id: "1", school_id: "1", event_id: "1", staff_count: 3, student_contacts: 0, follow_up_done: false, rating: null },
  { id: "2", school_id: "2", event_id: "2", staff_count: 2, student_contacts: 0, follow_up_done: false, rating: null },
];

export const mockTasks: Task[] = [
  { id: "t1", title: "Stand materiaal bestellen voor Career Day KU Leuven", description: "Roll-up banners, brochures en give-aways bestellen.", school_id: "1", event_id: "1", assigned_to: "Matthias Peeters", due_date: "2026-03-28", priority: "hoog", status: "open", created_at: "2026-03-20" },
  { id: "t2", title: "Follow-up HOGENT contactpersoon", description: "Bedankmail sturen na campus presentatie.", school_id: "2", event_id: "2", assigned_to: "Naomi Geyskens", due_date: "2026-05-10", priority: "normaal", status: "afgerond", created_at: "2026-03-15" },
];
