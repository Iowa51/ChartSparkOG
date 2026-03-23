-- Migration: Billing Idempotency (M3)
-- Date: 2026-01-27
-- Purpose: Prevent duplicate invoice generation with idempotency keys

-- Add idempotency_key column to invoices table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'idempotency_key'
    ) THEN
        ALTER TABLE public.invoices 
        ADD COLUMN idempotency_key TEXT UNIQUE;
        
        CREATE INDEX idx_invoices_idempotency_key 
        ON public.invoices(idempotency_key) 
        WHERE idempotency_key IS NOT NULL;
    END IF;
END $$;

-- Drop any existing versions of the function first
DROP FUNCTION IF EXISTS public.create_invoice_idempotent(TEXT, UUID, UUID, UUID, DECIMAL, TEXT);
DROP FUNCTION IF EXISTS public.create_invoice_idempotent(TEXT, UUID, UUID, UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.create_invoice_idempotent(TEXT, UUID, UUID);

-- Create idempotent invoice creation function
CREATE OR REPLACE FUNCTION public.create_invoice_idempotent(
    p_idempotency_key TEXT,
    p_organization_id UUID,
    p_patient_id UUID,
    p_encounter_id UUID DEFAULT NULL,
    p_amount DECIMAL DEFAULT 0,
    p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_invoice RECORD;
    v_new_invoice RECORD;
BEGIN
    -- Check for existing invoice with this idempotency key
    SELECT * INTO v_existing_invoice
    FROM public.invoices
    WHERE idempotency_key = p_idempotency_key;
    
    -- If found, return the existing invoice (idempotent behavior)
    IF v_existing_invoice.id IS NOT NULL THEN
        RETURN json_build_object(
            'success', true,
            'invoice_id', v_existing_invoice.id,
            'status', v_existing_invoice.status,
            'already_existed', true
        );
    END IF;
    
    -- Create new invoice with idempotency key
    INSERT INTO public.invoices (
        idempotency_key,
        organization_id,
        patient_id,
        encounter_id,
        amount,
        description,
        status,
        created_at
    ) VALUES (
        p_idempotency_key,
        p_organization_id,
        p_patient_id,
        p_encounter_id,
        p_amount,
        p_description,
        'pending',
        NOW()
    )
    RETURNING * INTO v_new_invoice;
    
    RETURN json_build_object(
        'success', true,
        'invoice_id', v_new_invoice.id,
        'status', v_new_invoice.status,
        'already_existed', false
    );
    
EXCEPTION WHEN unique_violation THEN
    -- Race condition: another request created the invoice first
    SELECT * INTO v_existing_invoice
    FROM public.invoices
    WHERE idempotency_key = p_idempotency_key;
    
    RETURN json_build_object(
        'success', true,
        'invoice_id', v_existing_invoice.id,
        'status', v_existing_invoice.status,
        'already_existed', true
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_invoice_idempotent(TEXT, UUID, UUID, UUID, DECIMAL, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_invoice_idempotent IS 
'Creates an invoice idempotently using an idempotency key. 
If an invoice with the same key exists, returns the existing invoice.
Safe for retry scenarios and prevents duplicate billing.';
