create policy "post-media org documents read" on storage.objects for select using (
  bucket_id = 'post-media' and exists (
    select 1 from public.organization_documents d
    where d.file_url ilike '%' || objects.name || '%' and public.can_view_org(d.org_id)
  )
);