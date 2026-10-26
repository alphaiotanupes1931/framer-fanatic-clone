-- Allow the new "audio" post type in posts_validate_type_visibility
CREATE OR REPLACE FUNCTION public.posts_validate_type_visibility()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.post_type NOT IN ('text','photo','video','music','audio') THEN
    RAISE EXCEPTION 'invalid post_type %', NEW.post_type;
  END IF;
  IF NEW.visibility NOT IN ('public','followers','close_friends','only_me') THEN
    RAISE EXCEPTION 'invalid visibility %', NEW.visibility;
  END IF;
  RETURN NEW;
END; $$;