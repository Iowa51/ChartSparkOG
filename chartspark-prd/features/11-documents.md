# PRD-11 — Document Management

**Version:** 1.0
**Track:** E
**Mode:** OG-EDIT REQUIRED (chart-side) + portal integration
**Week:** 11
**Status:** Spec ready

---

## Why this exists

Behavioral health practices receive paper documents constantly: insurance cards, ID, releases of information (ROI), prior records, court orders, school IEPs. Staff scan these and need to attach them to the patient chart. ICANotes+ has a document management module; ChartSparkOG has none. Without this, staff use email attachments and shared drives — a HIPAA risk.

## Success criteria

A staff member can:
- Upload a scanned document or photo to a patient chart
- Categorize it (insurance card, ID, ROI, prior records, court order, IEP, other)
- Add a free-text description
- Mark it as expiring (e.g., ROI expires 1 year)
- Search documents across patients by category and date range

A clinician can:
- See all documents for a patient
- Download/view in browser
- Audit who uploaded and when

A patient (via portal, PRD-02) can:
- Upload documents to share with their care team

## Data model

```sql
CREATE TABLE patient_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_by_role TEXT NOT NULL CHECK (uploaded_by_role IN ('clinician', 'staff', 'patient_portal')),
  storage_path TEXT NOT NULL, -- Supabase Storage path
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'insurance_card', 'id', 'roi', 'prior_records', 'court_order', 'iep', 'lab_result', 'imaging', 'other'
  )),
  description TEXT,
  expires_on DATE, -- for ROI, etc.
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- soft delete
);

CREATE INDEX idx_documents_patient ON patient_documents(org_id, patient_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expiring ON patient_documents(org_id, expires_on) WHERE expires_on IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
-- Org-scoped policies, USING + WITH CHECK
```

## Storage

Supabase Storage with a private bucket `patient-documents`:
- Files at path `org_id/patient_id/document_id-filename.ext`
- Bucket policy: no public read; signed URLs only, 5-minute expiry
- Max upload: 25MB
- Allowed mime types: PDF, JPEG, PNG, TIFF, DOCX

## OG-EDIT REQUIRED

**Files:**
- `supabase/migrations/<ts>_patient_documents.sql`
- `src/app/(app)/patients/[id]/documents/page.tsx` (NEW)
- `src/components/clinical/DocumentList.tsx` (NEW)
- `src/components/clinical/DocumentUpload.tsx` (NEW)
- `src/app/api/documents/route.ts` (NEW + nested)

**Re-pentest scope:** Upload endpoint (file size limit, mime validation, virus scan if available), signed URL expiry, RLS.

## Acceptance criteria

- [ ] Upload via clinician chart UI works (PDF, JPEG, PNG)
- [ ] Upload via portal works (depends on PRD-02 portal)
- [ ] Categorization + description fields work
- [ ] Expiring document dashboard shows docs expiring in next 30/60/90 days
- [ ] Signed URL download works; URLs expire in 5 min
- [ ] Soft delete; admin can restore within 30 days
- [ ] RLS prevents cross-org or cross-patient access
- [ ] No PHI in filenames in logs (log document IDs, not filenames)
- [ ] Security gate passes

## Risks

- **Virus scanning:** Supabase Storage doesn't ship with AV by default. Add ClamAV scan as a Vercel function trigger on upload, or use a vendor (e.g., AWS Lambda with ClamAV layer). Decision: defer to v1.1 if not blocking pilot.
- **File size DoS:** enforce 25MB limit at API and at Supabase bucket policy level.

## Skills

`master/PRD-MASTER.md`, `using-skills.md`, `security-first.md`, `og-edit-protocol.md`, `api-endpoints.md`, `frontend-patterns.md`, `rls-testing.md`, `testing-patterns.md`
