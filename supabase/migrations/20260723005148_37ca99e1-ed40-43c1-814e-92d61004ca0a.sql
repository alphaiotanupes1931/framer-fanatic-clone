ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS featured_at timestamptz;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS featured_at timestamptz;

UPDATE public.posts SET featured_at = COALESCE(featured_at, created_at, now()) WHERE featured = true;
UPDATE public.stories SET featured_at = COALESCE(featured_at, created_at, now()) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_posts_featured_order ON public.posts (featured DESC, featured_at DESC, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_stories_featured_order ON public.stories (featured DESC, featured_at DESC, created_at DESC) WHERE status = 'published';

CREATE OR REPLACE FUNCTION public.admin_toggle_content_pin(_content_type text, _content_id uuid, _pinned boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pinned_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _content_type = 'post' THEN
    IF _pinned THEN
      SELECT count(*) INTO pinned_count FROM public.posts WHERE featured = true AND id <> _content_id AND is_deleted = false;
      IF pinned_count >= 3 THEN
        RAISE EXCEPTION 'You can only pin 3 posts at a time. Unpin one first.';
      END IF;
      UPDATE public.posts SET featured = true, featured_at = now() WHERE id = _content_id AND is_deleted = false;
    ELSE
      UPDATE public.posts SET featured = false, featured_at = NULL WHERE id = _content_id;
    END IF;
  ELSIF _content_type = 'story' THEN
    IF _pinned THEN
      SELECT count(*) INTO pinned_count FROM public.stories WHERE featured = true AND id <> _content_id AND status = 'published';
      IF pinned_count >= 3 THEN
        RAISE EXCEPTION 'You can only pin 3 stories at a time. Unpin one first.';
      END IF;
      UPDATE public.stories SET featured = true, featured_at = now() WHERE id = _content_id AND status = 'published';
    ELSE
      UPDATE public.stories SET featured = false, featured_at = NULL WHERE id = _content_id;
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid content type';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_toggle_content_pin(text, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_content_pin(text, uuid, boolean) TO authenticated, service_role;