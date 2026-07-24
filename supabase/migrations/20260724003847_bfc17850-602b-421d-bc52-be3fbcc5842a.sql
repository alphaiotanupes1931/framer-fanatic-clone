
-- 1. deleted_at columns
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.stories       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.events        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.videos        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.posts         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at      ON public.profiles(deleted_at)      WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stories_deleted_at       ON public.stories(deleted_at)       WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_deleted_at        ON public.events(deleted_at)        WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_deleted_at ON public.organizations(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_deleted_at        ON public.videos(deleted_at)        WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_deleted_at         ON public.posts(deleted_at)         WHERE deleted_at IS NOT NULL;

-- 2. Restrictive SELECT policies hide soft-deleted rows from non-admins
DROP POLICY IF EXISTS hide_deleted_profiles      ON public.profiles;
DROP POLICY IF EXISTS hide_deleted_stories       ON public.stories;
DROP POLICY IF EXISTS hide_deleted_events        ON public.events;
DROP POLICY IF EXISTS hide_deleted_organizations ON public.organizations;
DROP POLICY IF EXISTS hide_deleted_videos        ON public.videos;
DROP POLICY IF EXISTS hide_deleted_posts         ON public.posts;

CREATE POLICY hide_deleted_profiles ON public.profiles AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hide_deleted_stories ON public.stories AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hide_deleted_events ON public.events AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hide_deleted_organizations ON public.organizations AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hide_deleted_videos ON public.videos AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));
CREATE POLICY hide_deleted_posts ON public.posts AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(),'admin'));

-- 3. Filter deleted_at from SECURITY DEFINER public listing functions
CREATE OR REPLACE FUNCTION public.public_rotating_stories(lim integer DEFAULT 12)
 RETURNS TABLE(id uuid, title text, excerpt text, cover_url text, author_name text, author_username text, author_avatar text, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT s.id, s.title, s.excerpt, s.cover_url,
         COALESCE(p.display_name, p.username), p.username, p.avatar_url, s.created_at
  FROM public.stories s
  LEFT JOIN public.profiles p ON p.id = s.user_id AND p.deleted_at IS NULL
  WHERE COALESCE(s.status,'published')='published' AND s.deleted_at IS NULL
  ORDER BY s.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

CREATE OR REPLACE FUNCTION public.public_artists(lim integer DEFAULT 96, search text DEFAULT NULL, sort_by text DEFAULT 'newest')
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, role text, neighborhood text, bio text, in_baltimore boolean, category text, created_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, COALESCE(p.display_name, p.username), p.username, p.avatar_url, p.role,
         p.neighborhood, p.bio, p.in_baltimore, p.category, p.created_at
  FROM public.profiles p
  WHERE COALESCE(p.banned,false)=false
    AND COALESCE(p.hidden_from_showcase,false)=false
    AND p.deleted_at IS NULL
    AND COALESCE(p.display_name, p.username) IS NOT NULL
    AND (p.role='artist' OR p.category IS NOT NULL OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='artist'))
    AND (search IS NULL OR search='' OR p.display_name ILIKE '%'||search||'%' OR p.username ILIKE '%'||search||'%' OR p.neighborhood ILIKE '%'||search||'%' OR p.bio ILIKE '%'||search||'%')
  ORDER BY
    CASE WHEN sort_by='newest' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN sort_by<>'newest' THEN COALESCE(p.display_name, p.username) END ASC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 500));
$$;

CREATE OR REPLACE FUNCTION public.public_creators(lim integer DEFAULT 50)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role
  FROM public.profiles p
  WHERE COALESCE(p.banned,false)=false AND COALESCE(p.hidden_from_showcase,false)=false AND p.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='artist')
  ORDER BY p.created_at DESC LIMIT GREATEST(1, LEAST(lim, 200));
$$;

CREATE OR REPLACE FUNCTION public.public_profile_by_username(_username text)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, banner_url text, bio text, neighborhood text, role text, category text, website text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.banner_url, p.bio, p.neighborhood, p.role, p.category, p.website
  FROM public.profiles p
  WHERE (lower(p.username)=lower(_username) OR p.id::text=_username)
    AND COALESCE(p.banned,false)=false AND p.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.public_profiles_by_ids(_ids uuid[])
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, neighborhood text, is_founder boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.neighborhood, COALESCE(p.is_founder,false)
  FROM public.profiles p
  WHERE p.id = ANY(_ids) AND COALESCE(p.banned,false)=false AND p.deleted_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.search_all_users(q text DEFAULT '', lim integer DEFAULT 10)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, COALESCE(p.display_name, p.username), p.username, p.avatar_url
  FROM public.profiles p
  WHERE COALESCE(p.banned,false)=false AND p.deleted_at IS NULL AND COALESCE(p.username,'')<>''
    AND (COALESCE(q,'')='' OR p.display_name ILIKE '%'||q||'%' OR p.username ILIKE '%'||q||'%')
  ORDER BY CASE WHEN p.display_name ILIKE q||'%' OR p.username ILIKE q||'%' THEN 0 ELSE 1 END,
           COALESCE(p.display_name, p.username) ASC
  LIMIT GREATEST(1, LEAST(lim, 25));
$$;

CREATE OR REPLACE FUNCTION public.search_creators(q text DEFAULT '', lim integer DEFAULT 24)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, role text, neighborhood text, bio text, in_baltimore boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.role, p.neighborhood, p.bio, p.in_baltimore
  FROM public.profiles p
  WHERE COALESCE(p.banned,false)=false AND COALESCE(p.hidden_from_showcase,false)=false AND p.deleted_at IS NULL
    AND (coalesce(q,'')='' OR p.display_name ILIKE '%'||q||'%' OR p.username ILIKE '%'||q||'%' OR p.neighborhood ILIKE '%'||q||'%' OR p.bio ILIKE '%'||q||'%')
  ORDER BY p.created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(lim, 100));
$$;

CREATE OR REPLACE FUNCTION public.top_creators(lim integer DEFAULT 3)
 RETURNS TABLE(id uuid, display_name text, username text, avatar_url text, category text, role text, score bigint, is_founder boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH candidates AS (
    SELECT p.id, p.display_name, p.username, p.avatar_url, p.category, p.role, p.is_founder, p.created_at,
           CASE WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='artist') THEN 1 ELSE 0 END AS is_artist
    FROM public.profiles p
    WHERE COALESCE(p.banned,false)=false AND COALESCE(p.hidden_from_showcase,false)=false AND p.deleted_at IS NULL
      AND p.avatar_url IS NOT NULL AND COALESCE(p.display_name, p.username) IS NOT NULL
  ),
  post_engagement AS (
    SELECT user_id, SUM(COALESCE(likes_count,0)+COALESCE(comments_count,0))::bigint AS s
    FROM public.posts WHERE deleted_at IS NULL GROUP BY user_id
  ),
  follower_counts AS (
    SELECT following_id AS user_id, COUNT(*)::bigint AS s FROM public.follows GROUP BY following_id
  )
  SELECT c.id, COALESCE(c.display_name, c.username), c.username, c.avatar_url, c.category, c.role,
         (COALESCE(pe.s,0)+COALESCE(fc.s,0))::bigint AS score, COALESCE(c.is_founder,false)
  FROM candidates c
  LEFT JOIN post_engagement pe ON pe.user_id=c.id
  LEFT JOIN follower_counts fc ON fc.user_id=c.id
  ORDER BY c.is_artist DESC, score DESC, c.created_at DESC NULLS LAST, c.id
  LIMIT GREATEST(1, LEAST(lim, 50));
$$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(id uuid, email text, display_name text, username text, avatar_url text, role text, neighborhood text, in_baltimore boolean, banned boolean, hidden_from_showcase boolean, created_at timestamptz, last_seen_at timestamptz, is_admin boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.email, p.display_name, p.username, p.avatar_url, p.role,
         p.neighborhood, p.in_baltimore, p.banned, p.hidden_from_showcase,
         p.created_at, p.last_seen_at,
         EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='admin')
  FROM public.profiles p
  WHERE public.is_admin_caller() AND p.deleted_at IS NULL
  ORDER BY p.created_at DESC;
$$;

-- 4. Replace admin_delete_* with soft-deletes
CREATE OR REPLACE FUNCTION public.admin_delete_profile(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.profiles SET deleted_at = now(), updated_at = now() WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_event(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.events SET deleted_at = now(), updated_at = now() WHERE id = _id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_delete_organization(_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.organizations SET deleted_at = now(), updated_at = now() WHERE id = _id;
END; $$;

-- 5. Generic soft-delete / restore / purge / list
CREATE OR REPLACE FUNCTION public.admin_soft_delete(_kind text, _id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CASE _kind
    WHEN 'profile'      THEN UPDATE public.profiles      SET deleted_at=now(), updated_at=now() WHERE id=_id;
    WHEN 'post'         THEN UPDATE public.posts         SET deleted_at=now() WHERE id=_id;
    WHEN 'story'        THEN UPDATE public.stories       SET deleted_at=now(), updated_at=now() WHERE id=_id;
    WHEN 'event'        THEN UPDATE public.events        SET deleted_at=now(), updated_at=now() WHERE id=_id;
    WHEN 'organization' THEN UPDATE public.organizations SET deleted_at=now(), updated_at=now() WHERE id=_id;
    WHEN 'video'        THEN UPDATE public.videos        SET deleted_at=now() WHERE id=_id;
    ELSE RAISE EXCEPTION 'invalid kind %', _kind;
  END CASE;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_restore_content(_kind text, _id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CASE _kind
    WHEN 'profile'      THEN UPDATE public.profiles      SET deleted_at=NULL, updated_at=now() WHERE id=_id;
    WHEN 'post'         THEN UPDATE public.posts         SET deleted_at=NULL WHERE id=_id;
    WHEN 'story'        THEN UPDATE public.stories       SET deleted_at=NULL, updated_at=now() WHERE id=_id;
    WHEN 'event'        THEN UPDATE public.events        SET deleted_at=NULL, updated_at=now() WHERE id=_id;
    WHEN 'organization' THEN UPDATE public.organizations SET deleted_at=NULL, updated_at=now() WHERE id=_id;
    WHEN 'video'        THEN UPDATE public.videos        SET deleted_at=NULL WHERE id=_id;
    ELSE RAISE EXCEPTION 'invalid kind %', _kind;
  END CASE;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_purge_content(_kind text, _id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CASE _kind
    WHEN 'profile'      THEN DELETE FROM auth.users WHERE id=_id;
    WHEN 'post'         THEN DELETE FROM public.posts         WHERE id=_id;
    WHEN 'story'        THEN DELETE FROM public.stories       WHERE id=_id;
    WHEN 'event'        THEN DELETE FROM public.events        WHERE id=_id;
    WHEN 'organization' THEN DELETE FROM public.organizations WHERE id=_id;
    WHEN 'video'        THEN DELETE FROM public.videos        WHERE id=_id;
    ELSE RAISE EXCEPTION 'invalid kind %', _kind;
  END CASE;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_trash()
 RETURNS TABLE(kind text, id uuid, title text, owner_id uuid, owner_name text, deleted_at timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 'profile'::text, p.id, COALESCE(p.display_name, p.username, p.email), p.id, COALESCE(p.display_name, p.username), p.deleted_at
    FROM public.profiles p WHERE p.deleted_at IS NOT NULL AND public.is_admin_caller()
  UNION ALL
  SELECT 'post', po.id, LEFT(COALESCE(po.content,'(no text)'), 100), po.user_id,
         (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=po.user_id), po.deleted_at
    FROM public.posts po WHERE po.deleted_at IS NOT NULL AND public.is_admin_caller()
  UNION ALL
  SELECT 'story', s.id, s.title, s.user_id,
         (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=s.user_id), s.deleted_at
    FROM public.stories s WHERE s.deleted_at IS NOT NULL AND public.is_admin_caller()
  UNION ALL
  SELECT 'event', e.id, e.title, e.user_id,
         (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=e.user_id), e.deleted_at
    FROM public.events e WHERE e.deleted_at IS NOT NULL AND public.is_admin_caller()
  UNION ALL
  SELECT 'organization', o.id, o.name, o.owner_id,
         (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=o.owner_id), o.deleted_at
    FROM public.organizations o WHERE o.deleted_at IS NOT NULL AND public.is_admin_caller()
  UNION ALL
  SELECT 'video', v.id, v.title, v.user_id,
         (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=v.user_id), v.deleted_at
    FROM public.videos v WHERE v.deleted_at IS NOT NULL AND public.is_admin_caller()
  ORDER BY 6 DESC;
$$;
