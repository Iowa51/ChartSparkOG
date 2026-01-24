-- Update Elite tier price from $299 to $199
-- Run this in Supabase SQL Editor to fix the pricing

UPDATE subscription_tiers 
SET 
    monthly_price = 19900,  -- $199.00
    annual_price = 191000   -- $1,910.00 (roughly 20% off annual)
WHERE code = 'ELITE';

-- Verify the update
SELECT code, name, monthly_price, annual_price FROM subscription_tiers;
