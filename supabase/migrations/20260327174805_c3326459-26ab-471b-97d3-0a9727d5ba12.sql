
-- ===========================================
-- TABLES
-- ===========================================

-- Scholen
CREATE TABLE public.scholen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'universiteit',
  province text NOT NULL,
  city text NOT NULL,
  website text DEFAULT '',
  language text NOT NULL DEFAULT 'NL',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'actief',
  created_at timestamptz DEFAULT now()
);

-- Contacten
CREATE TABLE public.contacten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.scholen(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  email text DEFAULT '',
  phone text DEFAULT '',
  role text DEFAULT '',
  department text DEFAULT '',
  notes text DEFAULT '',
  linkedin_url text DEFAULT ''
);

-- Opleidingen
CREATE TABLE public.opleidingen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.scholen(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  faculty text DEFAULT '',
  study_level text NOT NULL DEFAULT 'bachelor',
  field_of_study text DEFAULT '',
  student_count integer
);

-- Evenementen
CREATE TABLE public.evenementen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'jobbeurs',
  date date NOT NULL,
  start_time time,
  end_time time,
  setup_date date,
  setup_time time,
  location text DEFAULT '',
  school_id uuid REFERENCES public.scholen(id) ON DELETE SET NULL,
  responsible text DEFAULT '',
  team_members text[] DEFAULT '{}',
  elia_contact text DEFAULT '',
  budget numeric,
  status text NOT NULL DEFAULT 'gepland',
  description text DEFAULT '',
  stand_type text DEFAULT '',
  stand_size text DEFAULT '',
  notes text DEFAULT ''
);

-- Contracten
CREATE TABLE public.contracten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.scholen(id) ON DELETE CASCADE NOT NULL,
  contract_type text NOT NULL DEFAULT 'partnership',
  start_date date NOT NULL,
  end_date date NOT NULL,
  renewal_date date,
  status text NOT NULL DEFAULT 'in onderhandeling',
  value numeric,
  document_url text DEFAULT '',
  notes text DEFAULT '',
  description text DEFAULT ''
);

-- Taken
CREATE TABLE public.taken (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  school_id uuid REFERENCES public.scholen(id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.evenementen(id) ON DELETE SET NULL,
  assigned_to text DEFAULT '',
  due_date date,
  priority text NOT NULL DEFAULT 'normaal',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Junction: event <-> opleiding
CREATE TABLE public.event_opleidingen (
  event_id uuid REFERENCES public.evenementen(id) ON DELETE CASCADE,
  opleiding_id uuid REFERENCES public.opleidingen(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, opleiding_id)
);

-- Junction: contract <-> event
CREATE TABLE public.contract_evenementen (
  contract_id uuid REFERENCES public.contracten(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.evenementen(id) ON DELETE CASCADE,
  PRIMARY KEY (contract_id, event_id)
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  avatar_url text DEFAULT ''
);

-- User roles (separate table per security guidelines)
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- ===========================================
-- RLS
-- ===========================================
ALTER TABLE public.scholen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opleidingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evenementen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracten ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taken ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_opleidingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_evenementen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- All data tables: authenticated users have full access
CREATE POLICY "auth_full_access" ON public.scholen FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.contacten FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.opleidingen FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.evenementen FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.contracten FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.taken FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.event_opleidingen FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_full_access" ON public.contract_evenementen FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles: readable by all authenticated, managed by admins
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ===========================================
-- TRIGGER: auto-create profile on signup
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- SEED DATA
-- ===========================================

INSERT INTO public.scholen (id, name, type, province, city, website, language, notes, status, created_at) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'KU Leuven', 'universiteit', 'Vlaams-Brabant', 'Leuven', 'https://kuleuven.be', 'NL', 'Belangrijke partner voor engineering', 'actief', '2026-01-15'),
  ('a1b2c3d4-0001-4000-8000-000000000002', 'HOGENT', 'hogeschool', 'Oost-Vlaanderen', 'Gent', 'https://hogent.be', 'NL', '', 'actief', '2026-02-01');

INSERT INTO public.contacten (id, school_id, name, email, phone, role, department, notes, linkedin_url) VALUES
  ('a1b2c3d4-0002-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Jan Peeters', 'jan.peeters@kuleuven.be', '+32 16 32 40 10', 'Career Services Manager', 'Dienst Studentenvoorzieningen', '', 'https://linkedin.com/in/janpeeters'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000002', 'Sara Van Damme', 'sara.vandamme@hogent.be', '+32 9 243 87 87', 'Verantwoordelijke Jobbeurzen', '', '', '');

INSERT INTO public.opleidingen (id, school_id, name, faculty, study_level, field_of_study, student_count) VALUES
  ('a1b2c3d4-0003-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'Burgerlijk Ingenieur', 'Faculteit Ingenieurswetenschappen', 'master', 'Engineering', 450),
  ('a1b2c3d4-0003-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000002', 'Elektromechanica', 'Departement Technologie', 'bachelor', 'Elektromechanica', 150);

INSERT INTO public.evenementen (id, name, type, date, start_time, end_time, setup_date, setup_time, location, school_id, responsible, team_members, elia_contact, budget, status, description, stand_type, stand_size, notes) VALUES
  ('a1b2c3d4-0004-4000-8000-000000000001', 'Career Day KU Leuven', 'jobbeurs', '2026-04-10', '09:00', '16:00', '2026-04-09', '14:00', 'Aula KU Leuven', 'a1b2c3d4-0001-4000-8000-000000000001', 'Ellen Geerts', ARRAY['Naomi Geyskens', 'Matthias Peeters'], 'Ellen Geerts', 3500, 'bevestigd', 'Jaarlijkse jobbeurs met focus op engineering en IT studenten.', 'jobbeurs stand', 'groot 6m²+', ''),
  ('a1b2c3d4-0004-4000-8000-000000000002', 'Campus Presentatie HOGENT', 'campus presentatie', '2026-05-05', '11:00', '13:00', '2026-05-05', '09:30', 'HOGENT Campus Schoonmeersen', 'a1b2c3d4-0001-4000-8000-000000000002', 'Naomi Geyskens', ARRAY['Eline ten Cate'], 'Naomi Geyskens', 800, 'gepland', 'Presentatie over carrièremogelijkheden bij Elia.', 'presentatie', 'klein 2m²', '');

INSERT INTO public.contracten (id, school_id, contract_type, start_date, end_date, renewal_date, status, value, document_url, notes, description) VALUES
  ('a1b2c3d4-0005-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'partnership', '2026-01-01', '2027-12-31', '2027-10-01', 'actief', 15000, '', 'Jaarlijkse partnerschapsovereenkomst', 'Strategisch partnerschap met KU Leuven voor employer branding activiteiten.'),
  ('a1b2c3d4-0005-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000002', 'sponsoring', '2026-01-01', '2026-06-30', '2026-05-15', 'actief', 5000, '', 'Verloopt binnenkort', 'Sponsoring jobbeurs HOGENT.');

INSERT INTO public.taken (id, title, description, school_id, event_id, assigned_to, due_date, priority, status, created_at) VALUES
  ('a1b2c3d4-0006-4000-8000-000000000001', 'Stand materiaal bestellen voor Career Day KU Leuven', 'Roll-up banners, brochures en give-aways bestellen.', 'a1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0004-4000-8000-000000000001', 'Matthias Peeters', '2026-03-28', 'hoog', 'open', '2026-03-20'),
  ('a1b2c3d4-0006-4000-8000-000000000002', 'Follow-up HOGENT contactpersoon', 'Bedankmail sturen na campus presentatie.', 'a1b2c3d4-0001-4000-8000-000000000002', 'a1b2c3d4-0004-4000-8000-000000000002', 'Naomi Geyskens', '2026-05-10', 'normaal', 'afgerond', '2026-03-15');

INSERT INTO public.event_opleidingen (event_id, opleiding_id) VALUES
  ('a1b2c3d4-0004-4000-8000-000000000001', 'a1b2c3d4-0003-4000-8000-000000000001'),
  ('a1b2c3d4-0004-4000-8000-000000000002', 'a1b2c3d4-0003-4000-8000-000000000002');

INSERT INTO public.contract_evenementen (contract_id, event_id) VALUES
  ('a1b2c3d4-0005-4000-8000-000000000001', 'a1b2c3d4-0004-4000-8000-000000000001'),
  ('a1b2c3d4-0005-4000-8000-000000000002', 'a1b2c3d4-0004-4000-8000-000000000002');
