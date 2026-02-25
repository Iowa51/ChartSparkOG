-- Patient Documents: Table + RLS + Storage Bucket
-- Run this in Supabase SQL Editor

-- 1. Create the patient_documents table
CREATE TABLE IF NOT EXISTS patient_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('photo_id', 'insurance_card_front', 'insurance_card_back', 'other')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient_id ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_organization_id ON patient_documents(organization_id);

-- 3. Enable RLS
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (org-scoped)
CREATE POLICY "Users can view documents in their org"
    ON patient_documents FOR SELECT
    USING (organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can insert documents in their org"
    ON patient_documents FOR INSERT
    WITH CHECK (organization_id = (
        SELECT organization_id FROM users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can delete their own documents or admins can delete any"
    ON patient_documents FOR DELETE
    USING (
        uploaded_by = auth.uid()
        OR (SELECT role FROM users WHERE id = auth.uid()) IN ('ADMIN', 'SUPER_ADMIN')
    );

-- 5. Create the storage bucket (run separately if needed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'patient-documents',
    'patient-documents',
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS policies
CREATE POLICY "Authenticated users can upload patient documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view patient documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own patient documents"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'patient-documents' AND auth.role() = 'authenticated');
