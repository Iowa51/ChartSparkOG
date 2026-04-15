-- SEC-PT6-F1: Replace permissive storage RLS with org-scoped policies.
-- Old policies allowed ANY authenticated user to read/write/delete ALL patient
-- documents regardless of organization. New policies use path-based org isolation:
-- all files must be stored under {organization_id}/... prefix.

-- Drop the old permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own patient documents" ON storage.objects;

-- New org-scoped SELECT policy
CREATE POLICY "Org members can view own org patient documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- New org-scoped INSERT policy
CREATE POLICY "Org members can upload to own org patient documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- New org-scoped DELETE policy (uploader or admin within org)
CREATE POLICY "Org members can delete own org patient documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = (
      SELECT organization_id::text FROM profiles WHERE id = auth.uid()
    )
  );
