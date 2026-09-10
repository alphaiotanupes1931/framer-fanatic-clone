-- 1. Hide sensitive profile columns from public/authenticated table reads
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, created_at, updated_at, role, latitude, longitude, in_baltimore, avatar_url, onboarded, username, bio, website, neighborhood, banner_url, city, is_baltimore_verified, banned, category, hidden_from_showcase, is_founder, must_reset_password, neighborhood_names, referred_by) ON public.profiles TO anon, authenticated;

-- 2. Follow graph requires authentication
DROP POLICY IF EXISTS "follows publicly viewable" ON public.follows;

-- 3. Per-user poll votes / ballots no longer world readable
DROP POLICY IF EXISTS "Poll votes viewable by everyone" ON public.organization_poll_votes;
CREATE POLICY "Poll votes viewable by voter or org staff"
ON public.organization_poll_votes FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_polls p
    WHERE p.id = organization_poll_votes.poll_id
      AND (
        public.is_org_staff(p.org_id)
        OR public.organization_owner_id(p.org_id) = auth.uid()
      )
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Ballots viewable by everyone" ON public.organization_vote_ballots;
CREATE POLICY "Ballots viewable by voter or org staff"
ON public.organization_vote_ballots FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.organization_votes v
    WHERE v.id = organization_vote_ballots.vote_id
      AND (
        public.is_org_staff(v.org_id)
        OR public.organization_owner_id(v.org_id) = auth.uid()
      )
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Pin search_path on remaining SECURITY DEFINER functions
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq, extensions;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq, extensions;

-- 5. Remove needless EXECUTE on privileged SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_clear_stripe_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_stripe_logs(integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.event_buyer_contacts(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_in_ticket(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_profile() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_share_recipients(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_all_users(text, integer) FROM anon;
