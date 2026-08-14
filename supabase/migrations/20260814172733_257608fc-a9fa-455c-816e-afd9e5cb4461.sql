
DO $$
DECLARE
  old_id uuid := 'd0baf11e-7023-4190-8547-7a04fc085a04'; -- duplicate (ainsleyburrows)
  new_id uuid := '7cbe9710-f771-4db5-af57-4050d08f154a'; -- active account (ainsleyburrows1)
BEGIN
  -- 1. Remove rows that would violate uniqueness after the merge.
  DELETE FROM public.follows f WHERE (f.follower_id = old_id AND f.following_id = new_id)
     OR (f.follower_id = new_id AND f.following_id = old_id);
  DELETE FROM public.follows f WHERE f.follower_id = old_id
    AND EXISTS (SELECT 1 FROM public.follows g WHERE g.follower_id = new_id AND g.following_id = f.following_id);
  DELETE FROM public.follows f WHERE f.following_id = old_id
    AND EXISTS (SELECT 1 FROM public.follows g WHERE g.following_id = new_id AND g.follower_id = f.follower_id);
  DELETE FROM public.post_likes a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.post_likes b WHERE b.user_id = new_id AND b.post_id = a.post_id);
  DELETE FROM public.post_saves a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.post_saves b WHERE b.user_id = new_id AND b.post_id = a.post_id);
  DELETE FROM public.story_likes a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.story_likes b WHERE b.user_id = new_id AND b.story_id = a.story_id);
  DELETE FROM public.story_saves a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.story_saves b WHERE b.user_id = new_id AND b.story_id = a.story_id);
  DELETE FROM public.event_saves a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.event_saves b WHERE b.user_id = new_id AND b.event_id = a.event_id);
  DELETE FROM public.video_likes a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.video_likes b WHERE b.user_id = new_id AND b.video_id = a.video_id);
  DELETE FROM public.video_saves a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.video_saves b WHERE b.user_id = new_id AND b.video_id = a.video_id);
  DELETE FROM public.close_friends a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.close_friends b WHERE b.user_id = new_id AND b.friend_id = a.friend_id);
  DELETE FROM public.close_friends a WHERE a.friend_id = old_id AND EXISTS (SELECT 1 FROM public.close_friends b WHERE b.friend_id = new_id AND b.user_id = a.user_id);
  DELETE FROM public.organization_followers a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.organization_followers b WHERE b.user_id = new_id AND b.organization_id = a.organization_id);
  DELETE FROM public.organization_members a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.organization_members b WHERE b.user_id = new_id AND b.organization_id = a.organization_id);
  DELETE FROM public.organization_poll_votes a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.organization_poll_votes b WHERE b.user_id = new_id AND b.poll_id = a.poll_id);
  DELETE FROM public.organization_vote_ballots a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.organization_vote_ballots b WHERE b.user_id = new_id AND b.vote_id = a.vote_id);
  DELETE FROM public.organization_comment_likes a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.organization_comment_likes b WHERE b.user_id = new_id AND b.comment_id = a.comment_id);
  DELETE FROM public.user_roles a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.user_roles b WHERE b.user_id = new_id AND b.role = a.role);
  DELETE FROM public.conversation_members a WHERE a.user_id = old_id AND EXISTS (SELECT 1 FROM public.conversation_members b WHERE b.user_id = new_id AND b.conversation_id = a.conversation_id);
  DELETE FROM public.conversations c WHERE (c.user_a = old_id AND c.user_b = new_id) OR (c.user_a = new_id AND c.user_b = old_id);
  DELETE FROM public.conversations c WHERE (c.user_a = old_id OR c.user_b = old_id)
    AND EXISTS (
      SELECT 1 FROM public.conversations d
      WHERE (d.user_a = new_id AND d.user_b = CASE WHEN c.user_a = old_id THEN c.user_b ELSE c.user_a END)
         OR (d.user_b = new_id AND d.user_a = CASE WHEN c.user_a = old_id THEN c.user_b ELSE c.user_a END)
    );
  DELETE FROM public.notification_preferences WHERE user_id = old_id AND EXISTS (SELECT 1 FROM public.notification_preferences WHERE user_id = new_id);
  DELETE FROM public.user_ui_prefs WHERE user_id = old_id AND EXISTS (SELECT 1 FROM public.user_ui_prefs WHERE user_id = new_id);

  -- 2. Move everything else over.
  UPDATE public.posts SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.stories SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.events SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.videos SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.podcast_episodes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.ephemeral_stories SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.post_comments SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.story_comments SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.video_comments SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.post_likes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.post_saves SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.story_likes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.story_saves SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.event_saves SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.video_likes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.video_saves SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.close_friends SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.close_friends SET friend_id = new_id WHERE friend_id = old_id;
  UPDATE public.follows SET follower_id = new_id WHERE follower_id = old_id;
  UPDATE public.follows SET following_id = new_id WHERE following_id = old_id;
  UPDATE public.messages SET sender_id = new_id WHERE sender_id = old_id;
  UPDATE public.conversation_members SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.conversations SET user_a = new_id WHERE user_a = old_id;
  UPDATE public.conversations SET user_b = new_id WHERE user_b = old_id;
  UPDATE public.conversations SET created_by = new_id WHERE created_by = old_id;
  UPDATE public.notifications SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.notifications SET actor_id = new_id WHERE actor_id = old_id;
  UPDATE public.notification_preferences SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_ui_prefs SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organizations SET owner_id = new_id WHERE owner_id = old_id;
  UPDATE public.organization_members SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_followers SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_posts SET author_id = new_id WHERE author_id = old_id;
  UPDATE public.organization_comments SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_comment_likes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_polls SET created_by = new_id WHERE created_by = old_id;
  UPDATE public.organization_poll_votes SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_votes SET created_by = new_id WHERE created_by = old_id;
  UPDATE public.organization_vote_ballots SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.organization_dues_payments SET member_id = new_id WHERE member_id = old_id;
  UPDATE public.organization_dues_payments SET owner_id = new_id WHERE owner_id = old_id;
  UPDATE public.profile_sections SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.profile_wall_comments SET author_id = new_id WHERE author_id = old_id;
  UPDATE public.profile_wall_comments SET profile_id = new_id WHERE profile_id = old_id;
  UPDATE public.artist_inquiries SET artist_id = new_id WHERE artist_id = old_id;
  UPDATE public.artist_inquiries SET sender_id = new_id WHERE sender_id = old_id;
  UPDATE public.tickets SET artist_id = new_id WHERE artist_id = old_id;
  UPDATE public.event_promoters SET organizer_id = new_id WHERE organizer_id = old_id;
  UPDATE public.event_promoters SET promoter_user_id = new_id WHERE promoter_user_id = old_id;
  UPDATE public.email_audiences SET owner_id = new_id WHERE owner_id = old_id;
  UPDATE public.email_audience_contacts SET owner_id = new_id WHERE owner_id = old_id;
  UPDATE public.referral_rewards SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.user_roles SET user_id = new_id WHERE user_id = old_id;
  UPDATE public.profiles SET referred_by = new_id WHERE referred_by = old_id;

  -- 3. Hand the public handle to the active account and retire the duplicate.
  UPDATE public.profiles
     SET username = 'ainsleyburrows-old',
         display_name = 'Ainsley Burrows (old account)',
         hidden_from_showcase = true
   WHERE id = old_id;

  UPDATE public.profiles
     SET username = 'ainsleyburrows',
         is_founder = true
   WHERE id = new_id;
END $$;
