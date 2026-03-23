-- Sprint 5 Group 6: secure acknowledgements with claim-linked RLS

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'acknowledgements'
  ) THEN
    EXECUTE 'ALTER TABLE public.acknowledgements ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "acknowledgements_select" ON public.acknowledgements';
    EXECUTE $policy$
      CREATE POLICY "acknowledgements_select" ON public.acknowledgements
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.billing_claims bc
            WHERE bc.id = acknowledgements.claim_id
              AND bc.organization_id = public.get_user_organization_id()
          )
        )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "acknowledgements_manage" ON public.acknowledgements';
    EXECUTE $policy$
      CREATE POLICY "acknowledgements_manage" ON public.acknowledgements
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.billing_claims bc
            WHERE bc.id = acknowledgements.claim_id
              AND bc.organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN (''ADMIN'', ''SUPER_ADMIN'')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.billing_claims bc
            WHERE bc.id = acknowledgements.claim_id
              AND bc.organization_id = public.get_user_organization_id()
              AND public.get_user_role() IN (''ADMIN'', ''SUPER_ADMIN'')
          )
        )
    $policy$;
  END IF;
END
$$;
