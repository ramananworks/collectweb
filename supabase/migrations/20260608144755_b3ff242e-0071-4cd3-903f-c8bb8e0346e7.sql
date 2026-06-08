
-- 1. delivery_otps: restrict SELECT to owner/manager only
DROP POLICY IF EXISTS "Users can read company delivery otps" ON public.delivery_otps;
CREATE POLICY "Owners and managers can read company delivery otps"
ON public.delivery_otps
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

-- 2. invoices: restrict DELETE to owner only
DROP POLICY IF EXISTS "Users can delete company invoices" ON public.invoices;
CREATE POLICY "Owners can delete company invoices"
ON public.invoices
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'owner'::app_role)
);

-- 3. payments: restrict DELETE to owner only
DROP POLICY IF EXISTS "Users can delete company payments" ON public.payments;
CREATE POLICY "Owners can delete company payments"
ON public.payments
FOR DELETE
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'owner'::app_role)
);

-- 4. Revoke public EXECUTE on SECURITY DEFINER helper functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_company_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(uuid) TO authenticated, service_role;
