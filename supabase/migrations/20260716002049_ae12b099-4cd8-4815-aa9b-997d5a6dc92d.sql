CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invite_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create invites" ON public.invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Users can view their own invites" ON public.invites FOR SELECT TO authenticated USING (auth.uid() = invited_by);
CREATE INDEX idx_invites_invited_by ON public.invites(invited_by);