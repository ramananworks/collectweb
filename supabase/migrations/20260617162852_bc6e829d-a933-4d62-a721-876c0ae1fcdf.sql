DROP POLICY IF EXISTS "Users can insert company customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update company customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete company customers" ON public.customers;

CREATE POLICY "Managers can insert company customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Managers can update company customers"
ON public.customers FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Managers can delete company customers"
ON public.customers FOR DELETE TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (public.has_role(auth.uid(), 'owner'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role))
);

DROP POLICY IF EXISTS "Users can insert company invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update company invoices" ON public.invoices;

CREATE POLICY "Authorized roles can insert company invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);

CREATE POLICY "Authorized roles can update company invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);

DROP POLICY IF EXISTS "Users can insert company payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update company payments" ON public.payments;

CREATE POLICY "Authorized roles can insert company payments"
ON public.payments FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'collection_staff'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);

CREATE POLICY "Authorized roles can update company payments"
ON public.payments FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'collection_staff'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);

DROP POLICY IF EXISTS "Users can insert company delivery otps" ON public.delivery_otps;
DROP POLICY IF EXISTS "Users can update company delivery otps" ON public.delivery_otps;

CREATE POLICY "Authorized roles can insert company delivery otps"
ON public.delivery_otps FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);

CREATE POLICY "Authorized roles can update company delivery otps"
ON public.delivery_otps FOR UPDATE TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.current_user_can_write()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'delivery_staff'::app_role)
  )
);