CREATE POLICY "post-media shop and exhibition read" ON storage.objects FOR SELECT
USING (
  bucket_id = 'post-media' AND (
    EXISTS (SELECT 1 FROM public.organization_products p WHERE p.image_url ILIKE '%' || objects.name || '%' AND public.can_view_org(p.org_id))
    OR EXISTS (SELECT 1 FROM public.organization_exhibitions e WHERE e.cover_url ILIKE '%' || objects.name || '%' AND public.can_view_org(e.org_id))
    OR EXISTS (SELECT 1 FROM public.organization_exhibition_images i WHERE i.media_url ILIKE '%' || objects.name || '%' AND public.can_view_org(i.org_id))
  )
);