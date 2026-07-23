GRANT SELECT ON TABLE public.organizations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.organizations TO authenticated;
GRANT ALL ON TABLE public.organizations TO service_role;