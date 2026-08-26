DO $$
DECLARE
  source_org_id uuid := 'e3c86793-2abc-4788-8184-c5cee3a5b0ae';
  target_org_id uuid := '5fb03dcc-f77d-4199-8e3f-80a3ce87f999';
BEGIN
  INSERT INTO public.organization_posts (
    org_id,
    author_id,
    kind,
    title,
    body,
    media_url,
    video_url,
    media_urls,
    bg_color,
    text_color,
    font_size,
    availability,
    created_at,
    updated_at
  )
  SELECT
    target_org_id,
    author_id,
    kind,
    title,
    body,
    media_url,
    video_url,
    media_urls,
    bg_color,
    text_color,
    font_size,
    availability,
    created_at,
    updated_at
  FROM public.organization_posts source_post
  WHERE source_post.org_id = source_org_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_posts existing_post
      WHERE existing_post.org_id = target_org_id
        AND existing_post.title IS NOT DISTINCT FROM source_post.title
        AND existing_post.body IS NOT DISTINCT FROM source_post.body
        AND existing_post.created_at = source_post.created_at
    );

  INSERT INTO public.organization_comments (
    org_id,
    user_id,
    body,
    parent_id,
    is_muted,
    created_at
  )
  SELECT
    target_org_id,
    user_id,
    body,
    NULL,
    is_muted,
    created_at
  FROM public.organization_comments source_comment
  WHERE source_comment.org_id = source_org_id
    AND source_comment.parent_id IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.organization_comments existing_comment
      WHERE existing_comment.org_id = target_org_id
        AND existing_comment.body IS NOT DISTINCT FROM source_comment.body
        AND existing_comment.created_at = source_comment.created_at
    );
END $$;