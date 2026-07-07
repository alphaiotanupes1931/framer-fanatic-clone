
CREATE POLICY "story-covers public read" ON storage.objects FOR SELECT USING (bucket_id = 'story-covers');
CREATE POLICY "story-covers authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'story-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "story-covers owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'story-covers' AND owner = auth.uid());
CREATE POLICY "story-covers owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'story-covers' AND owner = auth.uid());
