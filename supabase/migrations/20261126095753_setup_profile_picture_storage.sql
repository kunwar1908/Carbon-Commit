INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS profile_pictures_public_read ON storage.objects;
CREATE POLICY profile_pictures_public_read
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS profile_pictures_authenticated_upload ON storage.objects;
CREATE POLICY profile_pictures_authenticated_upload
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS profile_pictures_authenticated_update ON storage.objects;
CREATE POLICY profile_pictures_authenticated_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS profile_pictures_authenticated_delete ON storage.objects;
CREATE POLICY profile_pictures_authenticated_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
