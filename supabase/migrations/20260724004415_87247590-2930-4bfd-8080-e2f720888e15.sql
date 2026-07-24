ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured_at timestamptz;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS featured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_posts_featured_order ON public.posts (featured DESC, featured_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_featured_order ON public.stories (featured DESC, featured_at DESC, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_toggle_content_pin(_content_type text, _content_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE pinned_count int;
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _content_type NOT IN ('post','story') THEN RAISE EXCEPTION 'invalid content type'; END IF;

  IF _content_type = 'post' THEN
    IF _pinned THEN
      SELECT count(*) INTO pinned_count FROM public.posts WHERE featured = true AND id <> _content_id;
      IF pinned_count >= 3 THEN RAISE EXCEPTION 'Maximum of 3 featured posts allowed'; END IF;
      UPDATE public.posts SET featured = true, featured_at = now() WHERE id = _content_id;
    ELSE
      UPDATE public.posts SET featured = false, featured_at = NULL WHERE id = _content_id;
    END IF;
  ELSE
    IF _pinned THEN
      SELECT count(*) INTO pinned_count FROM public.stories WHERE featured = true AND id <> _content_id;
      IF pinned_count >= 3 THEN RAISE EXCEPTION 'Maximum of 3 featured stories allowed'; END IF;
      UPDATE public.stories SET featured = true, featured_at = now() WHERE id = _content_id;
    ELSE
      UPDATE public.stories SET featured = false, featured_at = NULL WHERE id = _content_id;
    END IF;
  END IF;
END; $$;

REVOKE ALL ON FUNCTION public.admin_toggle_content_pin(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_content_pin(text, uuid, boolean) TO authenticated, service_role;