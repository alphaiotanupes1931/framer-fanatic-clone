ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.stories       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.events        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.videos        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.posts         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.admin_soft_delete(_kind text, _id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_caller() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CASE _kind
    WHEN 'profile'      THEN UPDATE public.profiles      SET deleted_at=now() WHERE id=_id;
    WHEN 'post'         THEN UPDATE public.posts         SET deleted_at=now(), is_deleted=true WHERE id=_id;
    WHEN 'story'        THEN UPDATE public.stories       SET deleted_at=now() WHERE id=_id;
    WHEN 'event'        THEN UPDATE public.events        SET deleted_at=now() WHERE id=_id;
    WHEN 'organization' THEN UPDATE public.organizations SET deleted_at=now() WHERE id=_id;
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
    WHEN 'profile'      THEN UPDATE public.profiles      SET deleted_at=NULL WHERE id=_id;
    WHEN 'post'         THEN UPDATE public.posts         SET deleted_at=NULL, is_deleted=false WHERE id=_id;
    WHEN 'story'        THEN UPDATE public.stories       SET deleted_at=NULL WHERE id=_id;
    WHEN 'event'        THEN UPDATE public.events        SET deleted_at=NULL WHERE id=_id;
    WHEN 'organization' THEN UPDATE public.organizations SET deleted_at=NULL WHERE id=_id;
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
  SELECT * FROM (
    SELECT 'profile'::text, p.id, COALESCE(p.display_name, p.username, p.email), p.id, COALESCE(p.display_name, p.username), p.deleted_at
      FROM public.profiles p WHERE p.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'post', po.id, LEFT(COALESCE(po.content,'(no text)'), 100), po.user_id,
           (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=po.user_id),
           COALESCE(po.deleted_at, po.created_at)
      FROM public.posts po WHERE po.deleted_at IS NOT NULL OR COALESCE(po.is_deleted,false)
    UNION ALL
    SELECT 'story', s.id, s.title, s.user_id,
           (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=s.user_id), s.deleted_at
      FROM public.stories s WHERE s.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'event', e.id, e.title, e.user_id,
           (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=e.user_id), e.deleted_at
      FROM public.events e WHERE e.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'organization', o.id, o.name, o.owner_id,
           (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=o.owner_id), o.deleted_at
      FROM public.organizations o WHERE o.deleted_at IS NOT NULL
    UNION ALL
    SELECT 'video', v.id, v.title, v.user_id,
           (SELECT COALESCE(pr.display_name, pr.username) FROM public.profiles pr WHERE pr.id=v.user_id), v.deleted_at
      FROM public.videos v WHERE v.deleted_at IS NOT NULL
  ) t
  WHERE public.is_admin_caller()
  ORDER BY 6 DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_trash() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_soft_delete(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_restore_content(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_purge_content(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_list_trash() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_soft_delete(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_content(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_purge_content(text, uuid) TO authenticated, service_role;
NOTIFY pgrst, 'reload schema';