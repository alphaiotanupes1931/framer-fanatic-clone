
ALTER TABLE public.conversations ALTER COLUMN user_a DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN user_b DROP NOT NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = _conv AND user_id = _uid
  ) OR EXISTS (
    SELECT 1 FROM public.conversations c WHERE c.id = _conv AND (c.user_a = _uid OR c.user_b = _uid)
  );
$$;

DROP POLICY IF EXISTS "members select own conv" ON public.conversation_members;
CREATE POLICY "members select own conv" ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "creator adds members" ON public.conversation_members;
CREATE POLICY "creator adds members" ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid())
  );

DROP POLICY IF EXISTS "member updates self" ON public.conversation_members;
CREATE POLICY "member updates self" ON public.conversation_members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "member leaves" ON public.conversation_members;
CREATE POLICY "member leaves" ON public.conversation_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "convo participants view" ON public.conversations;
CREATE POLICY "convo participants view" ON public.conversations FOR SELECT TO authenticated
  USING (
    auth.uid() = user_a OR auth.uid() = user_b OR
    public.is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "convo participants insert" ON public.conversations;
CREATE POLICY "convo participants insert" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    (NOT is_group AND (auth.uid() = user_a OR auth.uid() = user_b)) OR
    (is_group AND auth.uid() = created_by)
  );

DROP POLICY IF EXISTS "convo participants update" ON public.conversations;
CREATE POLICY "convo participants update" ON public.conversations FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_a OR auth.uid() = user_b OR
    public.is_conversation_member(id, auth.uid())
  );

DROP POLICY IF EXISTS "messages viewable" ON public.messages;
CREATE POLICY "messages viewable" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "sender insert messages" ON public.messages;
CREATE POLICY "sender insert messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_member(conversation_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; ua uuid; ub uuid; grp boolean;
BEGIN
  SELECT user_a, user_b, is_group INTO ua, ub, grp FROM public.conversations WHERE id = NEW.conversation_id;
  IF grp THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    SELECT m.user_id, NEW.sender_id, 'message', NEW.conversation_id
    FROM public.conversation_members m
    WHERE m.conversation_id = NEW.conversation_id AND m.user_id <> NEW.sender_id;
  ELSE
    recipient := CASE WHEN NEW.sender_id = ua THEN ub ELSE ua END;
    IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, target_id)
      VALUES (recipient, NEW.sender_id, 'message', NEW.conversation_id);
    END IF;
  END IF;
  RETURN NEW;
END $$;
