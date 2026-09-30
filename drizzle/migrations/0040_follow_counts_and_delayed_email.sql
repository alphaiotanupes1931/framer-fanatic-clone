CREATE OR REPLACE FUNCTION public.public_follow_counts(_user_id uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT count(*) FROM public.follows WHERE following_id = _user_id),
         (SELECT count(*) FROM public.follows WHERE follower_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.public_follow_counts(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enqueue_email_delayed(queue_name text, payload jsonb, delay_seconds integer)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload, GREATEST(delay_seconds, 0));
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload, GREATEST(delay_seconds, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_email_delayed(text, jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email_delayed(text, jsonb, integer) TO service_role;