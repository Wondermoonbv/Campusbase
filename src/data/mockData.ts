import type { School, Contact, Program, Contract, Event, SchoolEventParticipation, EventProgram, Task } from "@/types/crm";

// Mock data for development — will be replaced with Supabase queries
export const mockSchools: School[] = [
  { id: "1", name: "KU Leuven", type: "universiteit", province: "Vlaams-Brabant", city: "Leuven", website: "https://kuleuven.be", language: "NL", notes: "Belangrijke partner voor engineering", status: "actief", created_at: "2024-01-15" },
  { id: "2", name: "UGent", type: "universiteit", province: "Oost-Vlaanderen", city: "Gent", website: "https://ugent.be", language: "NL", notes: "", status: "actief", created_at: "2024-02-10" },
  { id: "3", name: "UCLouvain", type: "universiteit", province: "Waals-Brabant", city: "Louvain-la-Neuve", website: "https://uclouvain.be", language: "FR", notes: "Franstalig partnerschap", status: "actief", created_at: "2024-03-05" },
  { id: "4", name: "Thomas More", type: "hogeschool", province: "Antwerpen", city: "Mechelen", website: "https://thomasmore.be", language: "NL", notes: "", status: "prospect", created_at: "2024-04-20" },
  { id: "5", name: "VUB", type: "universiteit", province: "Brussel", city: "Brussel", website: "https://vub.be", language: "NL", notes: "Engineering faculteit focus", status: "actief", created_at: "2024-01-20" },
  { id: "6", name: "HOGENT", type: "hogeschool", province: "Oost-Vlaanderen", city: "Gent", website: "https://hogent.be", language: "NL", notes: "", status: "actief", created_at: "2024-05-01" },
  { id: "7", name: "ULB", type: "universiteit", province: "Brussel", city: "Brussel", website: "https://ulb.be", language: "FR", notes: "", status: "inactief", created_at: "2023-11-15" },
];

export const mockContacts: Contact[] = [
  { id: "1", school_id: "1", name: "Jan Peeters", email: "jan.peeters@kuleuven.be", phone: "+32 16 32 40 10", role: "Career Services Manager", department: "Dienst Studentenvoorzieningen", notes: "", linkedin_url: "https://linkedin.com/in/janpeeters" },
  { id: "2", school_id: "1", name: "Els Wouters", email: "els.wouters@kuleuven.be", phone: "+32 16 32 55 00", role: "Stagecoördinator", department: "Faculteit Ingenieurswetenschappen", notes: "Hoofdcontact voor stage-overeenkomsten", linkedin_url: "" },
  { id: "3", school_id: "2", name: "Marie De Smet", email: "marie.desmet@ugent.be", phone: "+32 9 331 01 01", role: "Employer Relations", department: "Career Center", notes: "", linkedin_url: "" },
  { id: "4", school_id: "3", name: "Pierre Dubois", email: "pierre.dubois@uclouvain.be", phone: "+32 10 47 21 11", role: "Responsable Relations Entreprises", department: "Service Carrières", notes: "Franstalig", linkedin_url: "" },
  { id: "5", school_id: "4", name: "Lien Janssens", email: "lien.janssens@thomasmore.be", phone: "+32 15 36 91 00", role: "Stagecoördinator", department: "", notes: "", linkedin_url: "" },
  { id: "6", school_id: "5", name: "Koen Willems", email: "koen.willems@vub.be", phone: "+32 2 629 21 11", role: "Career Advisor", department: "Career Center", notes: "Engineering faculteit focus", linkedin_url: "" },
  { id: "7", school_id: "6", name: "Sara Van Damme", email: "sara.vandamme@hogent.be", phone: "+32 9 243 87 87", role: "Verantwoordelijke Jobbeurzen", department: "", notes: "", linkedin_url: "" },
  { id: "8", school_id: "7", name: "Sophie Laurent", email: "sophie.laurent@ulb.be", phone: "+32 2 650 21 11", role: "Relations Entreprises", department: "Service des Stages", notes: "", linkedin_url: "" },
];

export const mockPrograms: Program[] = [
  { id: "1", school_id: "1", name: "Burgerlijk Ingenieur", faculty: "Faculteit Ingenieurswetenschappen", study_level: "master", field_of_study: "Engineering", student_count: 450 },
  { id: "2", school_id: "1", name: "Informatica", faculty: "Faculteit Wetenschappen", study_level: "master", field_of_study: "IT / Informatica", student_count: 320 },
  { id: "3", school_id: "2", name: "Elektrotechniek", faculty: "Faculteit Ingenieurswetenschappen", study_level: "master", field_of_study: "Engineering", student_count: 280 },
  { id: "4", school_id: "4", name: "Elektromechanica", faculty: "Departement Technologie", study_level: "bachelor", field_of_study: "Elektromechanica", student_count: 150 },
  { id: "5", school_id: "5", name: "Computer Science", faculty: "Faculty of Sciences", study_level: "master", field_of_study: "IT / Informatica", student_count: 200 },
];

export const mockContracts: Contract[] = [
  { id: "1", school_id: "1", contract_type: "partnership", start_date: "2024-01-01", end_date: "2025-12-31", renewal_date: "2025-10-01", status: "actief", value: 15000, document_url: "", notes: "Jaarlijkse partnerschapsovereenkomst", description: "Strategisch partnerschap met KU Leuven voor employer branding activiteiten, inclusief toegang tot jobbeurzen en campus presentaties.", linked_event_ids: ["1"] },
  { id: "2", school_id: "2", contract_type: "stage-overeenkomst", start_date: "2024-03-01", end_date: "2025-02-28", renewal_date: "2025-01-15", status: "actief", value: null, document_url: "", notes: "", description: "Kaderovereenkomst voor stage-plaatsingen vanuit UGent engineering faculteit.", linked_event_ids: ["2"] },
  { id: "3", school_id: "3", contract_type: "sponsoring", start_date: "2023-09-01", end_date: "2024-08-31", renewal_date: "2024-06-01", status: "verlopen", value: 5000, document_url: "", notes: "Sponsoring ingenieursgala", description: "Sponsoring van het jaarlijkse ingenieursgala aan UCLouvain.", linked_event_ids: ["6"] },
  { id: "4", school_id: "5", contract_type: "partnership", start_date: "2024-06-01", end_date: "2026-05-31", renewal_date: "2026-03-01", status: "actief", value: 20000, document_url: "", notes: "", description: "Uitgebreid partnerschap met VUB, focus op engineering en IT-opleidingen.", linked_event_ids: ["4"] },
  { id: "5", school_id: "4", contract_type: "partnership", start_date: "2025-01-01", end_date: "2025-06-30", renewal_date: "2025-05-01", status: "in onderhandeling", value: 8000, document_url: "", notes: "Nieuw partnerschap in bespreking", description: "Nieuw partnerschap met Thomas More voor elektromechanica studenten.", linked_event_ids: [] },
];

export const mockEvents: Event[] = [
  { id: "1", name: "Jobbeurs KU Leuven", type: "jobbeurs", date: "2026-03-15", start_time: "09:00", end_time: "16:00", setup_date: "2026-03-14", setup_time: "14:00", location: "Aula KU Leuven", school_id: "1", responsible: "Ellen Geerts", team_members: ["Naomi Geyskens", "Sarah Zekhnini"], elia_contact: "Ellen Geerts", budget: 3500, status: "afgelopen", description: "Jaarlijkse jobbeurs met focus op engineering en IT studenten.", stand_type: "jobbeurs stand", stand_size: "groot 6m²+", notes: "" },
  { id: "2", name: "Career Day UGent", type: "jobbeurs", date: "2026-04-10", start_time: "10:00", end_time: "17:00", setup_date: "2026-04-10", setup_time: "07:30", location: "ICC Gent", school_id: "2", responsible: "Matthias Peeters", team_members: ["Ellen Geerts"], elia_contact: "Matthias Peeters", budget: 4200, status: "bevestigd", description: "Career Day georganiseerd door UGent Career Center.", stand_type: "jobbeurs stand", stand_size: "medium 4m²", notes: "Stand nr. 42" },
  { id: "3", name: "Hackathon Energy of the Future", type: "hackathon", date: "2026-05-20", start_time: "09:00", end_time: "18:00", setup_date: "", setup_time: "", location: "BeCentral, Brussel", school_id: null, responsible: "Sarah Zekhnini", team_members: ["Elie ten Cate", "Matthias Peeters"], elia_contact: "Sarah Zekhnini", budget: 8000, status: "gepland", description: "Multi-school hackathon rond energie-innovatie.", stand_type: "anders", stand_size: "anders", notes: "Multi-school event" },
  { id: "4", name: "Workshop Smart Grids VUB", type: "workshop", date: "2026-04-25", start_time: "13:30", end_time: "16:30", setup_date: "", setup_time: "", location: "VUB Campus Etterbeek", school_id: "5", responsible: "Ellen Geerts", team_members: [], elia_contact: "Ellen Geerts", budget: 1500, status: "bevestigd", description: "Interactieve workshop over smart grids voor master studenten.", stand_type: "workshop", stand_size: "anders", notes: "" },
  { id: "5", name: "Campus Presentatie HOGENT", type: "campus presentatie", date: "2026-05-05", start_time: "11:00", end_time: "13:00", setup_date: "2026-05-05", setup_time: "09:30", location: "HOGENT Campus Schoonmeersen", school_id: "6", responsible: "Naomi Geyskens", team_members: [], elia_contact: "Naomi Geyskens", budget: 800, status: "gepland", description: "Presentatie over carrièremogelijkheden bij Elia.", stand_type: "presentatie", stand_size: "klein 2m²", notes: "" },
  { id: "6", name: "Jobbeurs UCLouvain", type: "jobbeurs", date: "2026-04-18", start_time: "10:00", end_time: "16:00", setup_date: "2026-04-17", setup_time: "16:00", location: "Forum UCLouvain", school_id: "3", responsible: "Sarah Zekhnini", team_members: ["Ellen Geerts"], elia_contact: "Sarah Zekhnini", budget: 3000, status: "bevestigd", description: "Forum des entreprises UCLouvain.", stand_type: "jobbeurs stand", stand_size: "medium 4m²", notes: "" },
  { id: "7", name: "Ingenieursbeurs Brussel", type: "jobbeurs", date: "2026-06-12", start_time: "09:00", end_time: "17:00", setup_date: "2026-06-11", setup_time: "15:00", location: "Tour & Taxis, Brussel", school_id: null, responsible: "Ellen Geerts", team_members: ["Matthias Peeters", "Sarah Zekhnini", "Elie ten Cate"], elia_contact: "Ellen Geerts", budget: 6000, status: "gepland", description: "Grote multi-school ingenieursbeurs in Brussel.", stand_type: "jobbeurs stand", stand_size: "groot 6m²+", notes: "" },
];

export const mockEventPrograms: EventProgram[] = [
  { event_id: "1", program_id: "1" },  // Jobbeurs KU Leuven → Burgerlijk Ingenieur
  { event_id: "1", program_id: "2" },  // Jobbeurs KU Leuven → Informatica
  { event_id: "2", program_id: "3" },  // Career Day UGent → Elektrotechniek
  { event_id: "3", program_id: "2" },  // Hackathon → Informatica KU Leuven
  { event_id: "3", program_id: "5" },  // Hackathon → Computer Science VUB
  { event_id: "4", program_id: "5" },  // Workshop Smart Grids VUB → Computer Science
  { event_id: "5", program_id: "4" },  // Campus Presentatie HOGENT → Elektromechanica
];

export const mockParticipations: SchoolEventParticipation[] = [
  { id: "1", school_id: "1", event_id: "1", staff_count: 4, student_contacts: 85, follow_up_done: true, rating: 4 },
  { id: "2", school_id: "2", event_id: "2", staff_count: 3, student_contacts: 0, follow_up_done: false, rating: null },
  { id: "3", school_id: "1", event_id: "3", staff_count: 2, student_contacts: 0, follow_up_done: false, rating: null },
  { id: "4", school_id: "5", event_id: "3", staff_count: 2, student_contacts: 0, follow_up_done: false, rating: null },
];

export const mockTasks: Task[] = [
  { id: "t1", title: "Stand materiaal bestellen voor Career Day UGent", description: "Roll-up banners, brochures en give-aways bestellen.", school_id: "2", event_id: "2", assigned_to: "Matthias Peeters", due_date: "2026-03-28", priority: "hoog", status: "open", created_at: "2026-03-20" },
  { id: "t2", title: "Contactpersoon UCLouvain opvolgen", description: "Nieuwe sponsoring bespreken voor volgend academiejaar.", school_id: "3", event_id: null, assigned_to: "Sarah Zekhnini", due_date: "2026-04-01", priority: "normaal", status: "open", created_at: "2026-03-18" },
  { id: "t3", title: "Hackathon jury samenstellen", description: "", school_id: null, event_id: "3", assigned_to: "Sarah Zekhnini", due_date: "2026-04-15", priority: "hoog", status: "in behandeling", created_at: "2026-03-15" },
  { id: "t4", title: "VUB partnerschap evaluatie voorbereiden", description: "KPI's en resultaten verzamelen voor tussentijdse evaluatie.", school_id: "5", event_id: null, assigned_to: "Ellen Geerts", due_date: "2026-04-10", priority: "normaal", status: "open", created_at: "2026-03-19" },
  { id: "t5", title: "Presentatie slides updaten voor HOGENT", description: "", school_id: "6", event_id: "5", assigned_to: "Naomi Geyskens", due_date: "2026-04-20", priority: "laag", status: "open", created_at: "2026-03-22" },
  { id: "t6", title: "Follow-up KU Leuven jobbeurs", description: "Bedankmail sturen en contacten opvolgen.", school_id: "1", event_id: "1", assigned_to: "Ellen Geerts", due_date: "2026-03-20", priority: "hoog", status: "afgerond", created_at: "2026-03-16" },
  { id: "t7", title: "Budget aanvraag ingenieursbeurs Brussel", description: "Budget voorstel indienen bij management.", school_id: null, event_id: "7", assigned_to: "Elie ten Cate", due_date: "2026-04-05", priority: "normaal", status: "in behandeling", created_at: "2026-03-17" },
  { id: "t8", title: "Thomas More contract finaliseren", description: "Laatste versie contract nalezen en doorsturen.", school_id: "4", event_id: null, assigned_to: "Matthias Peeters", due_date: "2026-03-30", priority: "hoog", status: "open", created_at: "2026-03-21" },
];
