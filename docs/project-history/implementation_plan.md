# ChartSpark - Implementation Plan (Updated)

## New Requirements Added

> [!IMPORTANT]
> **4 Critical Additions** incorporated into this plan:
> 1. Progress Note Template (primary for insurance billing)
> 2. Custom Templates (org-level management)
> 3. Multi-Level Billing Dashboard (role-based views)
> 4. Platform Fee System (per-note charges)

---

## Updated Database Schema

### Core Tables (Original)
```sql
organizations, users, features, organization_features, user_features,
patients, encounters, notes, prescriptions, appointments, audit_logs
```

### New/Updated Fields

#### `organizations` (updated)
```sql
ALTER TABLE organizations ADD COLUMN platform_fee_percentage DECIMAL(5,2) DEFAULT 1.0;
ALTER TABLE organizations ADD COLUMN fee_collection_method TEXT DEFAULT 'charge_separately'
  CHECK (fee_collection_method IN ('deduct_from_billing', 'charge_separately'));
```

#### `users` (updated)
```sql
ALTER TABLE users ADD COLUMN custom_fee_percentage DECIMAL(5,2) NULL;
-- If set, overrides org default
```

#### `note_templates` (NEW)
```sql
CREATE TABLE note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL, -- SOAP sections config
  cpt_suggestions TEXT[], -- Suggested CPT codes
  is_default BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false, -- Progress Note = system template
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### `notes` (updated)
```sql
ALTER TABLE notes ADD COLUMN template_id UUID REFERENCES note_templates(id);
ALTER TABLE notes ADD COLUMN billing_amount DECIMAL(10,2);
ALTER TABLE notes ADD COLUMN platform_fee DECIMAL(10,2);
ALTER TABLE notes ADD COLUMN fee_percentage DECIMAL(5,2);
```

#### `platform_fees` (NEW - tracking)
```sql
CREATE TABLE platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  billing_amount DECIMAL(10,2) NOT NULL,
  fee_percentage DECIMAL(5,2) NOT NULL,
  fee_amount DECIMAL(10,2) NOT NULL,
  collected_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'waived'))
);
```

---

## Progress Note Template

**Primary template for insurance billing:**

```json
{
  "name": "Progress Note",
  "structure": {
    "subjective": { "label": "Subjective", "required": true },
    "objective": { "label": "Objective", "required": true },
    "assessment": { "label": "Assessment", "required": true },
    "plan": { "label": "Plan", "required": true }
  },
  "cpt_suggestions": ["99213", "99214", "99215"],
  "is_system": true
}
```

AI optimization focuses on:
- Medical necessity language
- Time documentation
- Complexity indicators
- ICD-10 linkage

---

## Multi-Level Billing Dashboard

### USER View
- Own notes generated count
- Own billing codes used
- Own revenue total

### ADMIN View
- All users in organization
- Billing totals per user
- Organization total revenue
- Filter: user, date range

### SUPER_ADMIN View
- All organizations
- Billing per org, per user
- Platform-wide totals
- Filter: org, user, date range
- **Platform fees collected**

---

## Phase 3 Updates

### Templates Module
- [ ] Add "Progress Note" as default system template
- [ ] Template CRUD for Admins
- [ ] Template assignment to organizations

### Billing Dashboard
- [ ] USER role view (own stats)
- [ ] ADMIN role view (org stats)
- [ ] SUPER_ADMIN view (platform stats + fees)
- [ ] Fee tracking and display

### Note Editor
- [ ] Link notes to templates
- [ ] Calculate and store platform fees
- [ ] CPT code suggestions from template

---

## Verification Plan

### Automated
```bash
npm run build  # TypeScript check
npm run lint   # ESLint
```

### Manual
1. Create note with Progress Note template
2. Verify CPT suggestions appear
3. Check billing dashboard shows correct role-based data
4. Verify fee calculations in SUPER_ADMIN view
