CREATE TABLE public.organization_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'album',
  title text NOT NULL,
  description text,
  cover_url text,
  release_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_releases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_releases TO authenticated;
GRANT ALL ON public.organization_releases TO service_role;
ALTER TABLE public.organization_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Releases are viewable by everyone" ON public.organization_releases FOR SELECT USING (true);
CREATE POLICY "Owners can insert releases" ON public.organization_releases FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can update releases" ON public.organization_releases FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can delete releases" ON public.organization_releases FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE TRIGGER update_organization_releases_updated_at BEFORE UPDATE ON public.organization_releases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  release_id uuid REFERENCES public.organization_releases(id) ON DELETE CASCADE,
  title text NOT NULL,
  audio_url text NOT NULL,
  cover_url text,
  duration_seconds integer,
  track_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_tracks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_tracks TO authenticated;
GRANT ALL ON public.organization_tracks TO service_role;
ALTER TABLE public.organization_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tracks are viewable by everyone" ON public.organization_tracks FOR SELECT USING (true);
CREATE POLICY "Owners can insert tracks" ON public.organization_tracks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can update tracks" ON public.organization_tracks FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can delete tracks" ON public.organization_tracks FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE TRIGGER update_organization_tracks_updated_at BEFORE UPDATE ON public.organization_tracks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.organization_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organization_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_videos TO authenticated;
GRANT ALL ON public.organization_videos TO service_role;
ALTER TABLE public.organization_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org videos are viewable by everyone" ON public.organization_videos FOR SELECT USING (true);
CREATE POLICY "Owners can insert org videos" ON public.organization_videos FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can update org videos" ON public.organization_videos FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "Owners can delete org videos" ON public.organization_videos FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE TRIGGER update_organization_videos_updated_at BEFORE UPDATE ON public.organization_videos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_org_releases_org ON public.organization_releases(org_id, sort_order);
CREATE INDEX idx_org_tracks_release ON public.organization_tracks(release_id, track_number);
CREATE INDEX idx_org_tracks_org ON public.organization_tracks(org_id);
CREATE INDEX idx_org_videos_org ON public.organization_videos(org_id, sort_order);