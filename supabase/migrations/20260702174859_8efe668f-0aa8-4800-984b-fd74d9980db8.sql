
-- Auto-notification triggers

-- Follow -> notify followed user
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (NEW.following_id, NEW.follower_id, 'follow', NEW.follower_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_follow ON public.follows;
CREATE TRIGGER trg_notify_on_follow AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Post like -> notify post author
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT user_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (author, NEW.user_id, 'post_like', NEW.post_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_post_like ON public.post_likes;
CREATE TRIGGER trg_notify_on_post_like AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_like();

-- Post comment -> notify post author
CREATE OR REPLACE FUNCTION public.notify_on_post_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT user_id INTO author FROM public.posts WHERE id = NEW.post_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (author, NEW.user_id, 'post_comment', NEW.post_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_on_post_comment AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_post_comment();

-- Story like -> notify story author
CREATE OR REPLACE FUNCTION public.notify_on_story_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT user_id INTO author FROM public.stories WHERE id = NEW.story_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (author, NEW.user_id, 'story_like', NEW.story_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_story_like ON public.story_likes;
CREATE TRIGGER trg_notify_on_story_like AFTER INSERT ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_story_like();

-- Story comment -> notify story author
CREATE OR REPLACE FUNCTION public.notify_on_story_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE author uuid;
BEGIN
  SELECT user_id INTO author FROM public.stories WHERE id = NEW.story_id;
  IF author IS NOT NULL AND author <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (author, NEW.user_id, 'story_comment', NEW.story_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_story_comment ON public.story_comments;
CREATE TRIGGER trg_notify_on_story_comment AFTER INSERT ON public.story_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_story_comment();

-- New message -> notify other participant
CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient uuid; ua uuid; ub uuid;
BEGIN
  SELECT user_a, user_b INTO ua, ub FROM public.conversations WHERE id = NEW.conversation_id;
  recipient := CASE WHEN NEW.sender_id = ua THEN ub ELSE ua END;
  IF recipient IS NOT NULL AND recipient <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, target_id)
    VALUES (recipient, NEW.sender_id, 'message', NEW.conversation_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_on_message ON public.messages;
CREATE TRIGGER trg_notify_on_message AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_message();
