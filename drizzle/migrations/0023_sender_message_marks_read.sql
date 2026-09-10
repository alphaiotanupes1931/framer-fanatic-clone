CREATE OR REPLACE FUNCTION public.sync_conversation_after_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at,
      last_message_preview = left(NEW.content, 140),
      -- The sender has obviously seen their own message, so advance their own
      -- read marker. Only the recipient sees it as new.
      last_read_at_a = CASE WHEN user_a = NEW.sender_id THEN NEW.created_at ELSE last_read_at_a END,
      last_read_at_b = CASE WHEN user_b = NEW.sender_id THEN NEW.created_at ELSE last_read_at_b END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;