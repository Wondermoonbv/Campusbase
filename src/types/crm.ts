// Types for the Campus Recruitment CRM

export type SchoolType = "universiteit" | "hogeschool" | "secundair";
export type OrganisatieType = "school" | "studentenvereniging" | "werkgeversorganisatie" | "overheid" | "andere";
export type Language = "NL" | "FR" | "EN";
export type SchoolStatus = "actief" | "inactief" | "prospect";
export type StudyLevel = "bachelor" | "master" | "graduaat";
export type ContractType = "partnership" | "sponsoring" | "stage-overeenkomst" | "andere";
export type StandType = "jobbeurs stand" | "infotafel" | "presentatie" | "workshop" | "anders";
export type StandSize = "klein 2m²" | "medium 4m²" | "groot 6m²+" | "anders";
export type ContractStatus = "actief" | "verlopen" | "in onderhandeling";
export type EventType = "jobbeurs" | "campus presentatie" | "workshop" | "hackathon" | "andere";
export type EventStatus = "gepland" | "bevestigd" | "afgelopen" | "geannuleerd";

export interface School {
  id: string;
  name: string;
  type: OrganisatieType;
  school_type: SchoolType;
  province: string;
  city: string;
  website: string;
  language: Language;
  notes: string;
  status: SchoolStatus;
  created_at: string;
  contacts?: Contact[];
}

export interface Contact {
  id: string;
  organisatie_id: string | null;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  notes: string;
  linkedin_url: string;
}

export interface Program {
  id: string;
  organisatie_id: string;
  name: string;
  faculty: string;
  study_level: StudyLevel;
  field_of_study: string;
  student_count: number | null;
  school?: School;
}

export interface Contract {
  id: string;
  organisatie_id: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string;
  renewal_date: string;
  status: ContractStatus;
  value: number | null;
  document_url: string;
  notes: string;
  description: string;
  school?: School;
  linked_event_ids?: string[];
}

export type Regio = 'brussel' | 'antwerpen' | 'vlaams_brabant' | 'west_vlaanderen' | 'limburg' | 'oost_vlaanderen' | 'waals_brabant' | 'henegouwen';
export type Taal = 'nl' | 'fr' | 'en' | 'meertalig';
export type DoelgroepNiveau = 'bachelor' | 'master' | 'beide' | 'graduaat';
export type RegistratieType = 'partnership' | 'ad_hoc';
export type FollowUpStatus = 'to_do' | 'in_orde' | 'nvt';

export interface Event {
  id: string;
  name: string;
  type: EventType;
  date: string;
  start_time: string;
  end_time: string;
  setup_date: string;
  setup_time: string;
  location: string;
  organisator_id: string | null;
  responsible: string;
  team_members: string[];
  elia_contact: string;
  budget: number | null;
  status: EventStatus;
  description: string;
  stand_type: StandType;
  stand_size: StandSize;
  notes: string;
  school?: School;
  target_program_ids?: string[];
   regio?: Regio | null;
   taal?: Taal | null;
   doelgroep_niveau?: DoelgroepNiveau | null;
   contactpersoon_id?: string | null;
   registratie_type?: RegistratieType | null;
   follow_up_status?: FollowUpStatus;
 }

 export interface EventWithContactpersoon extends Event {
   contactpersoon?: Contact | null;
 }

export interface EventProgram {
  event_id: string;
  program_id: string;
}

export interface SchoolEventParticipation {
  id: string;
  school_id: string;
  event_id: string;
  staff_count: number;
  student_contacts: number;
  follow_up_done: boolean;
  rating: number | null;
  school?: School;
  event?: Event;
}

export const PROVINCES = [
  "Antwerpen",
  "Brussel",
  "Henegouwen",
  "Limburg",
  "Luik",
  "Luxemburg",
  "Namen",
  "Oost-Vlaanderen",
  "Vlaams-Brabant",
  "Waals-Brabant",
  "West-Vlaanderen",
];

export const FIELDS_OF_STUDY = [
  "Engineering",
  "IT / Informatica",
  "Business / Economie",
  "Wetenschappen",
  "Elektromechanica",
  "Energie",
  "Recht",
  "Communicatie",
  "Andere",
];

export type TaskPriority = "laag" | "normaal" | "hoog";
export type TaskStatus = "open" | "in behandeling" | "afgerond";

export interface Task {
  id: string;
  title: string;
  description: string;
  organisatie_id: string | null;
  event_id: string | null;
  assigned_to: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
}
