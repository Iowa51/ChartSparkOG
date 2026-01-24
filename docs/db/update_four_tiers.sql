-- Update subscription tiers to include NORMAL and PRO
-- Run this in Supabase SQL Editor

-- First, update STARTER to NORMAL
UPDATE subscription_tiers 
SET 
    code = 'NORMAL',
    name = 'Normal',
    description = 'Essential clinical tools for solo practitioners',
    monthly_price = 9900,  -- $99.00
    annual_price = 95000,  -- $950.00
    features = '["AI Clinical Notes", "Voice-to-Text AI Scribe", "Patient Management", "Appointment Calendar", "Telehealth Integration", "Clinical Templates", "Quick Phrases", "Geriatric Assessments", "Basic Analytics", "Email Support"]'
WHERE code = 'STARTER';

-- Add PRO tier
INSERT INTO subscription_tiers (code, name, description, monthly_price, annual_price, features) VALUES
('PRO', 'Pro', 'AI-powered clinical intelligence', 14900, 143000, '["Everything in Normal", "AI Medical Coding", "AI Treatment Planning", "AI Diagnostic Assistant", "Advanced Analytics Dashboard", "Custom Report Builder", "Priority Email Support"]')
ON CONFLICT (code) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    features = EXCLUDED.features;

-- Update ELITE tier features
UPDATE subscription_tiers 
SET 
    description = 'Full integration suite for growing practices',
    features = '["Everything in Pro", "E-Prescribe Integration", "EHR Integration Hub", "API Access", "Custom Integrations", "Dedicated Account Manager", "Priority Phone Support", "Custom Branding"]'
WHERE code = 'ELITE';

-- Add MANAGED_BILLING tier
INSERT INTO subscription_tiers (code, name, description, monthly_price, annual_price, features) VALUES
('MANAGED_BILLING', 'Managed Billing', 'Full-service medical billing', 14900, 143000, '["Automated Claims Generation", "Real-time Claim Validation", "Clearinghouse Integration", "ERA/835 Payment Processing", "Revenue Analytics Dashboard", "Denial Management & Appeals", "Monthly Financial Reports", "Dedicated Billing Specialist"]')
ON CONFLICT (code) DO UPDATE SET
    monthly_price = EXCLUDED.monthly_price,
    annual_price = EXCLUDED.annual_price,
    features = EXCLUDED.features;

-- Verify all tiers
SELECT code, name, monthly_price, description FROM subscription_tiers ORDER BY monthly_price;
