DO $$ BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_documents') THEN
    -- SEC-PT2-F1: Fix cross-org document deletion RLS policy gap
-- The old DELETE policy allowed ADMIN/SUPER_ADMIN to delete documents from ANY org.
-- The new policy requires the document's organization_id to match the user's org.

DROP POLICY IF EXISTS "Users can delete their own documents or admins can delete any"
    ON patient_documents;

CREATE POLICY "Users can delete own documents or org admins can delete"
    ON patient_documents FOR DELETE
    USING (
        (
            uploaded_by = auth.uid()
            OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
        )
        AND organization_id = (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

  END IF;
END $$;
