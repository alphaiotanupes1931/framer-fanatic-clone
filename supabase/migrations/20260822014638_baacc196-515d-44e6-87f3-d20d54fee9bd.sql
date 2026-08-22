ALTER TABLE public.organization_comments
  ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.organization_posts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS organization_comments_post_id_idx
  ON public.organization_comments(post_id, created_at);

CREATE OR REPLACE FUNCTION public.search_mentionables(q text, lim integer DEFAULT 8)
RETURNS TABLE(id uuid, handle text, name text, avatar_url text, kind text, subtype text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (
    SELECT p.id,
           p.username AS handle,
           COALESCE(p.display_name, p.username) AS name,
           p.avatar_url,
           'user'::text AS kind,
           NULL::text AS subtype
    FROM public.profiles p
    WHERE p.username IS NOT NULL
      AND COALESCE(p.banned, false) = false
      AND (
        p.username ILIKE q || '%'
        OR p.display_name ILIKE q || '%'
        OR p.username ILIKE '%' || q || '%'
      )
    ORDER BY (p.username ILIKE q || '%') DESC, p.username
    LIMIT GREATEST(lim, 1)
  )
  UNION ALL
  (
    SELECT o.id,
           o.slug AS handle,
           o.name,
           o.avatar_url,
           'org'::text AS kind,
           o.type AS subtype
    FROM public.organizations o
    WHERE COALESCE(o.is_public, true) = true
      AND (o.slug ILIKE q || '%' OR o.name ILIKE '%' || q || '%')
    ORDER BY (o.slug ILIKE q || '%') DESC, o.name
    LIMIT GREATEST(lim, 1)
  )
$$;

GRANT EXECUTE ON FUNCTION public.search_mentionables(text, integer) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.resolve_handle(_handle text)
RETURNS TABLE(kind text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  (SELECT 'user'::text, p.username FROM public.profiles p WHERE lower(p.username) = lower(_handle) LIMIT 1)
  UNION ALL
  (SELECT 'org'::text, o.slug FROM public.organizations o WHERE lower(o.slug) = lower(_handle) LIMIT 1)
$$;

GRANT EXECUTE ON FUNCTION public.resolve_handle(text) TO authenticated, anon;