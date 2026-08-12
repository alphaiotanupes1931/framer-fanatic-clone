ALTER TABLE public.organization_comments
  ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.organization_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS organization_comments_org_created_idx ON public.organization_comments (org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.organization_comment_likes (
  comment_id uuid NOT NULL REFERENCES public.organization_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.organization_comment_likes TO authenticated;
GRANT SELECT ON public.organization_comment_likes TO anon;
GRANT ALL ON public.organization_comment_likes TO service_role;

ALTER TABLE public.organization_comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment likes"
  ON public.organization_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments"
  ON public.organization_comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their like"
  ON public.organization_comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Page owners can moderate comments"
  ON public.organization_comments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );