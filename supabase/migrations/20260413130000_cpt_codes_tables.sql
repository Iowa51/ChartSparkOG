-- Source: CMS Physician Fee Schedule 2025/2026
-- Medicare rates are national baseline estimates. Actual reimbursement
-- varies by geographic locality (MAC) and contracted payer rates.
-- DO NOT present these as guaranteed reimbursement amounts.
-- Update annually from: https://www.cms.gov/medicare/payment/fee-schedules/physician

-- ============================================================
-- Table: cpt_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS cpt_codes (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text        UNIQUE NOT NULL,
  description           text        NOT NULL,
  category              text        NOT NULL CHECK (category IN (
                          'evaluation', 'individual_therapy', 'therapy_addon',
                          'group_therapy', 'family_therapy', 'crisis',
                          'testing', 'collaborative_care', 'medication_management'
                        )),
  session_type          text,
  min_duration_minutes  integer,
  max_duration_minutes  integer,
  is_addon              boolean     DEFAULT false,
  requires_cpt          text,
  is_active             boolean     DEFAULT true,
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ============================================================
-- Table: cpt_reimbursement_rates
-- ============================================================
CREATE TABLE IF NOT EXISTS cpt_reimbursement_rates (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  cpt_code       text         NOT NULL REFERENCES cpt_codes(code),
  payer_type     text         NOT NULL CHECK (payer_type IN (
                   'medicare', 'medicaid', 'commercial', 'self_pay'
                 )),
  rate_dollars   numeric(8,2) NOT NULL,
  rate_basis     text         DEFAULT 'estimated' CHECK (rate_basis IN ('estimated', 'contracted')),
  effective_date date         DEFAULT current_date,
  source         text         DEFAULT 'CMS_PFS_2025',
  notes          text,
  created_at     timestamptz  DEFAULT now(),
  updated_at     timestamptz  DEFAULT now(),
  UNIQUE(cpt_code, payer_type, effective_date)
);

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_reimbursement_rates ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass RLS
CREATE POLICY "service_role_bypass_cpt_codes"
  ON cpt_codes
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_bypass_cpt_reimbursement_rates"
  ON cpt_reimbursement_rates
  USING (auth.role() = 'service_role');

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_cpt_codes_code     ON cpt_codes(code);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_active   ON cpt_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_crr_cpt_code       ON cpt_reimbursement_rates(cpt_code);
CREATE INDEX IF NOT EXISTS idx_crr_payer_type     ON cpt_reimbursement_rates(payer_type);

-- ============================================================
-- Seed: cpt_codes (21 codes)
-- ============================================================
INSERT INTO cpt_codes
  (code, description, category, min_duration_minutes, max_duration_minutes, is_addon, requires_cpt)
VALUES
  ('90791', 'Psychiatric diagnostic evaluation',                              'evaluation',           60,   NULL, false, NULL),
  ('90792', 'Psychiatric diagnostic eval with medical services',              'evaluation',           60,   NULL, false, NULL),
  ('90832', 'Individual psychotherapy 30 min',                                'individual_therapy',   16,   37,   false, NULL),
  ('90833', 'Psychotherapy add-on 30 min (with E&M)',                         'therapy_addon',        16,   37,   true,  NULL),
  ('90834', 'Individual psychotherapy 45 min',                                'individual_therapy',   38,   52,   false, NULL),
  ('90836', 'Psychotherapy add-on 45 min (with E&M)',                         'therapy_addon',        38,   52,   true,  NULL),
  ('90837', 'Individual psychotherapy 60 min',                                'individual_therapy',   53,   NULL, false, NULL),
  ('90838', 'Psychotherapy add-on 53+ min (with E&M)',                        'therapy_addon',        53,   NULL, true,  NULL),
  ('90839', 'Crisis psychotherapy first 60 min',                              'crisis',               30,   74,   false, NULL),
  ('90840', 'Crisis psychotherapy each additional 30 min',                    'crisis',               30,   NULL, true,  NULL),
  ('90846', 'Family psychotherapy without patient',                           'family_therapy',       26,   NULL, false, NULL),
  ('90847', 'Family psychotherapy with patient',                              'family_therapy',       26,   NULL, false, NULL),
  ('90853', 'Group psychotherapy per patient',                                'group_therapy',        45,   NULL, false, NULL),
  ('96130', 'Psychological testing evaluation first hour',                    'testing',              60,   NULL, false, NULL),
  ('96131', 'Psychological testing evaluation additional hour',               'testing',              60,   NULL, true,  NULL),
  ('96136', 'Psychological testing administration 30 min',                    'testing',              30,   NULL, false, NULL),
  ('96137', 'Psychological testing admin additional 30 min',                  'testing',              30,   NULL, true,  NULL),
  ('99213', 'E&M established patient medication management',                  'medication_management',15,   NULL, false, NULL),
  ('99484', 'Behavioral health care management 20+ min',                      'collaborative_care',   20,   NULL, false, NULL),
  ('99492', 'Initial psychiatric collaborative care 70 min',                  'collaborative_care',   70,   NULL, false, NULL),
  ('99493', 'Subsequent psychiatric collaborative care 60 min',               'collaborative_care',   60,   NULL, false, NULL)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Seed: cpt_reimbursement_rates
-- Medicare = CMS PFS 2025/2026 national baseline (estimated)
-- Medicaid  = Medicare × 0.70 (rounded to 2 decimal places)
-- Commercial = Medicare × 1.40 (rounded to 2 decimal places)
-- Self-pay   = Medicare × 1.10 (rounded to 2 decimal places)
-- ============================================================
INSERT INTO cpt_reimbursement_rates (cpt_code, payer_type, rate_dollars, rate_basis, source)
VALUES
  -- 90791 | Medicare 166.91
  ('90791', 'medicare',   166.91, 'estimated', 'CMS_PFS_2025'),
  ('90791', 'medicaid',   116.84, 'estimated', 'CMS_PFS_2025'),
  ('90791', 'commercial', 233.67, 'estimated', 'CMS_PFS_2025'),
  ('90791', 'self_pay',   183.60, 'estimated', 'CMS_PFS_2025'),

  -- 90792 | Medicare 202.00
  ('90792', 'medicare',   202.00, 'estimated', 'CMS_PFS_2025'),
  ('90792', 'medicaid',   141.40, 'estimated', 'CMS_PFS_2025'),
  ('90792', 'commercial', 282.80, 'estimated', 'CMS_PFS_2025'),
  ('90792', 'self_pay',   222.20, 'estimated', 'CMS_PFS_2025'),

  -- 90832 | Medicare 79.00
  ('90832', 'medicare',    79.00, 'estimated', 'CMS_PFS_2025'),
  ('90832', 'medicaid',    55.30, 'estimated', 'CMS_PFS_2025'),
  ('90832', 'commercial', 110.60, 'estimated', 'CMS_PFS_2025'),
  ('90832', 'self_pay',    86.90, 'estimated', 'CMS_PFS_2025'),

  -- 90833 | Medicare 82.00
  ('90833', 'medicare',    82.00, 'estimated', 'CMS_PFS_2025'),
  ('90833', 'medicaid',    57.40, 'estimated', 'CMS_PFS_2025'),
  ('90833', 'commercial', 114.80, 'estimated', 'CMS_PFS_2025'),
  ('90833', 'self_pay',    90.20, 'estimated', 'CMS_PFS_2025'),

  -- 90834 | Medicare 126.00
  ('90834', 'medicare',   126.00, 'estimated', 'CMS_PFS_2025'),
  ('90834', 'medicaid',    88.20, 'estimated', 'CMS_PFS_2025'),
  ('90834', 'commercial', 176.40, 'estimated', 'CMS_PFS_2025'),
  ('90834', 'self_pay',   138.60, 'estimated', 'CMS_PFS_2025'),

  -- 90836 | Medicare 93.00
  ('90836', 'medicare',    93.00, 'estimated', 'CMS_PFS_2025'),
  ('90836', 'medicaid',    65.10, 'estimated', 'CMS_PFS_2025'),
  ('90836', 'commercial', 130.20, 'estimated', 'CMS_PFS_2025'),
  ('90836', 'self_pay',   102.30, 'estimated', 'CMS_PFS_2025'),

  -- 90837 | Medicare 154.29
  ('90837', 'medicare',   154.29, 'estimated', 'CMS_PFS_2025'),
  ('90837', 'medicaid',   108.00, 'estimated', 'CMS_PFS_2025'),
  ('90837', 'commercial', 216.01, 'estimated', 'CMS_PFS_2025'),
  ('90837', 'self_pay',   169.72, 'estimated', 'CMS_PFS_2025'),

  -- 90838 | Medicare 110.00
  ('90838', 'medicare',   110.00, 'estimated', 'CMS_PFS_2025'),
  ('90838', 'medicaid',    77.00, 'estimated', 'CMS_PFS_2025'),
  ('90838', 'commercial', 154.00, 'estimated', 'CMS_PFS_2025'),
  ('90838', 'self_pay',   121.00, 'estimated', 'CMS_PFS_2025'),

  -- 90839 | Medicare 190.00
  ('90839', 'medicare',   190.00, 'estimated', 'CMS_PFS_2025'),
  ('90839', 'medicaid',   133.00, 'estimated', 'CMS_PFS_2025'),
  ('90839', 'commercial', 266.00, 'estimated', 'CMS_PFS_2025'),
  ('90839', 'self_pay',   209.00, 'estimated', 'CMS_PFS_2025'),

  -- 90840 | Medicare 94.00
  ('90840', 'medicare',    94.00, 'estimated', 'CMS_PFS_2025'),
  ('90840', 'medicaid',    65.80, 'estimated', 'CMS_PFS_2025'),
  ('90840', 'commercial', 131.60, 'estimated', 'CMS_PFS_2025'),
  ('90840', 'self_pay',   103.40, 'estimated', 'CMS_PFS_2025'),

  -- 90846 | Medicare 104.00
  ('90846', 'medicare',   104.00, 'estimated', 'CMS_PFS_2025'),
  ('90846', 'medicaid',    72.80, 'estimated', 'CMS_PFS_2025'),
  ('90846', 'commercial', 145.60, 'estimated', 'CMS_PFS_2025'),
  ('90846', 'self_pay',   114.40, 'estimated', 'CMS_PFS_2025'),

  -- 90847 | Medicare 104.00
  ('90847', 'medicare',   104.00, 'estimated', 'CMS_PFS_2025'),
  ('90847', 'medicaid',    72.80, 'estimated', 'CMS_PFS_2025'),
  ('90847', 'commercial', 145.60, 'estimated', 'CMS_PFS_2025'),
  ('90847', 'self_pay',   114.40, 'estimated', 'CMS_PFS_2025'),

  -- 90853 | Medicare 50.00
  ('90853', 'medicare',    50.00, 'estimated', 'CMS_PFS_2025'),
  ('90853', 'medicaid',    35.00, 'estimated', 'CMS_PFS_2025'),
  ('90853', 'commercial',  70.00, 'estimated', 'CMS_PFS_2025'),
  ('90853', 'self_pay',    55.00, 'estimated', 'CMS_PFS_2025'),

  -- 96130 | Medicare 122.00
  ('96130', 'medicare',   122.00, 'estimated', 'CMS_PFS_2025'),
  ('96130', 'medicaid',    85.40, 'estimated', 'CMS_PFS_2025'),
  ('96130', 'commercial', 170.80, 'estimated', 'CMS_PFS_2025'),
  ('96130', 'self_pay',   134.20, 'estimated', 'CMS_PFS_2025'),

  -- 96131 | Medicare 87.00
  ('96131', 'medicare',    87.00, 'estimated', 'CMS_PFS_2025'),
  ('96131', 'medicaid',    60.90, 'estimated', 'CMS_PFS_2025'),
  ('96131', 'commercial', 121.80, 'estimated', 'CMS_PFS_2025'),
  ('96131', 'self_pay',    95.70, 'estimated', 'CMS_PFS_2025'),

  -- 96136 | Medicare 72.00
  ('96136', 'medicare',    72.00, 'estimated', 'CMS_PFS_2025'),
  ('96136', 'medicaid',    50.40, 'estimated', 'CMS_PFS_2025'),
  ('96136', 'commercial', 100.80, 'estimated', 'CMS_PFS_2025'),
  ('96136', 'self_pay',    79.20, 'estimated', 'CMS_PFS_2025'),

  -- 96137 | Medicare 52.00
  ('96137', 'medicare',    52.00, 'estimated', 'CMS_PFS_2025'),
  ('96137', 'medicaid',    36.40, 'estimated', 'CMS_PFS_2025'),
  ('96137', 'commercial',  72.80, 'estimated', 'CMS_PFS_2025'),
  ('96137', 'self_pay',    57.20, 'estimated', 'CMS_PFS_2025'),

  -- 99213 | Medicare 93.00
  ('99213', 'medicare',    93.00, 'estimated', 'CMS_PFS_2025'),
  ('99213', 'medicaid',    65.10, 'estimated', 'CMS_PFS_2025'),
  ('99213', 'commercial', 130.20, 'estimated', 'CMS_PFS_2025'),
  ('99213', 'self_pay',   102.30, 'estimated', 'CMS_PFS_2025'),

  -- 99484 | Medicare 62.00
  ('99484', 'medicare',    62.00, 'estimated', 'CMS_PFS_2025'),
  ('99484', 'medicaid',    43.40, 'estimated', 'CMS_PFS_2025'),
  ('99484', 'commercial',  86.80, 'estimated', 'CMS_PFS_2025'),
  ('99484', 'self_pay',    68.20, 'estimated', 'CMS_PFS_2025'),

  -- 99492 | Medicare 171.00
  ('99492', 'medicare',   171.00, 'estimated', 'CMS_PFS_2025'),
  ('99492', 'medicaid',   119.70, 'estimated', 'CMS_PFS_2025'),
  ('99492', 'commercial', 239.40, 'estimated', 'CMS_PFS_2025'),
  ('99492', 'self_pay',   188.10, 'estimated', 'CMS_PFS_2025'),

  -- 99493 | Medicare 139.00
  ('99493', 'medicare',   139.00, 'estimated', 'CMS_PFS_2025'),
  ('99493', 'medicaid',    97.30, 'estimated', 'CMS_PFS_2025'),
  ('99493', 'commercial', 194.60, 'estimated', 'CMS_PFS_2025'),
  ('99493', 'self_pay',   152.90, 'estimated', 'CMS_PFS_2025')

ON CONFLICT (cpt_code, payer_type, effective_date) DO NOTHING;
