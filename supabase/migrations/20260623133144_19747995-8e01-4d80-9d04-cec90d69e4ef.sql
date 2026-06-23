
-- ROLES -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('attendee', 'artist', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'attendee')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'attendee' FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- PROFILES additions -----------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_status text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS is_baltimore_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geo_lat double precision,
  ADD COLUMN IF NOT EXISTS geo_lng double precision;

-- EVENTS additions -------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS capacity integer,
  ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_price_cents_nonneg') THEN
    ALTER TABLE public.events ADD CONSTRAINT events_price_cents_nonneg CHECK (price_cents >= 0);
  END IF;
END $$;

-- Replace event INSERT/UPDATE policies to require 'artist' role
DROP POLICY IF EXISTS "users create their events" ON public.events;
DROP POLICY IF EXISTS "users update their events" ON public.events;
DROP POLICY IF EXISTS "Only artists can create events" ON public.events;
DROP POLICY IF EXISTS "Only artists can update their events" ON public.events;

CREATE POLICY "Only artists can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'));

CREATE POLICY "Only artists can update their events"
  ON public.events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'artist'))
  WITH CHECK (auth.uid() = user_id);

-- TICKETS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  buyer_total_cents integer NOT NULL,
  artist_net_cents integer NOT NULL,
  platform_tax_cents integer NOT NULL,
  stripe_fee_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Buyers and artists view tickets" ON public.tickets;
CREATE POLICY "Buyers and artists view tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = artist_id);

DROP TRIGGER IF EXISTS tickets_set_updated_at ON public.tickets;
CREATE TRIGGER tickets_set_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- POSTS / REPLIES: only artists may write -------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='posts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can create posts" ON public.posts';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create posts" ON public.posts';
    EXECUTE 'DROP POLICY IF EXISTS "users create their posts" ON public.posts';
    EXECUTE 'DROP POLICY IF EXISTS "Only artists can create posts" ON public.posts';
    EXECUTE 'CREATE POLICY "Only artists can create posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''artist''))';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='replies') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated can create replies" ON public.replies';
    EXECUTE 'DROP POLICY IF EXISTS "Users can create replies" ON public.replies';
    EXECUTE 'DROP POLICY IF EXISTS "users create their replies" ON public.replies';
    EXECUTE 'DROP POLICY IF EXISTS "Only artists can create replies" ON public.replies';
    EXECUTE 'CREATE POLICY "Only artists can create replies" ON public.replies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''artist''))';
  END IF;
END $$;
