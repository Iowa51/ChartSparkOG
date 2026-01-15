-- ChartSpark Missing Tables SQL Script
-- Run this in the Supabase SQL Editor to add missing tables
-- Generated: 2026-01-14

-- =============================================
-- PROFILES TABLE (referenced by /api/patients, /api/notes, etc.)
-- This is an alias/view for the users table for compatibility
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'USER',
  specialty TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Admins can view profiles in their org
CREATE POLICY "Admins can view org profiles" ON profiles FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- =============================================
-- CLINICAL_NOTES TABLE (referenced by /api/notes routes)
-- The schema uses 'notes', but API routes use 'clinical_notes'
-- =============================================
CREATE TABLE IF NOT EXISTS clinical_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id),
  encounter_id UUID REFERENCES encounters(id),
  template_id UUID,
  
  -- SOAP Sections
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  
  -- Complete note text
  content TEXT,
  
  -- Billing
  cpt_codes TEXT[] DEFAULT '{}',
  icd10_codes TEXT[] DEFAULT '{}',
  billing_amount DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'signed', 'amended')),
  signed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_org ON clinical_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_provider ON clinical_notes(provider_id);

-- Enable RLS
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Users can view notes in their org
CREATE POLICY "Users can view org notes" ON clinical_notes FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can create notes
CREATE POLICY "Users can create notes" ON clinical_notes FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can update their own notes
CREATE POLICY "Users can update own notes" ON clinical_notes FOR UPDATE TO authenticated
  USING (provider_id = auth.uid());

-- =============================================
-- BILLING TABLE (referenced by /api/billing)
-- =============================================
CREATE TABLE IF NOT EXISTS billing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  note_id UUID REFERENCES clinical_notes(id),
  
  -- Billing details
  cpt_code TEXT NOT NULL,
  icd10_codes TEXT[] DEFAULT '{}',
  amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'denied', 'paid')),
  submitted_at TIMESTAMPTZ,
  
  -- Payer info
  payer_name TEXT,
  claim_number TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_org ON billing(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);

-- Enable RLS
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- Users can view billing in their org
CREATE POLICY "Users can view org billing" ON billing FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can create billing entries
CREATE POLICY "Users can create billing" ON billing FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- =============================================
-- APPOINTMENTS TABLE (referenced by /api/appointments)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id),
  
  -- Appointment details
  appointment_type TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  
  -- Status
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Notes
  reason TEXT,
  notes TEXT,
  
  -- Telehealth
  is_telehealth BOOLEAN DEFAULT FALSE,
  room_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_provider ON appointments(provider_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Users can view appointments in their org
CREATE POLICY "Users can view org appointments" ON appointments FOR SELECT TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can create appointments
CREATE POLICY "Users can create appointments" ON appointments FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- Users can update appointments
CREATE POLICY "Users can update org appointments" ON appointments FOR UPDATE TO authenticated
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- =============================================
-- Summary: This script adds 4 tables that are referenced by API routes
-- but may be missing from your Supabase instance:
-- 1. profiles - User profile info (organization_id lookup)
-- 2. clinical_notes - Clinical documentation
-- 3. billing - Insurance billing records
-- 4. appointments - Scheduling
-- =============================================
