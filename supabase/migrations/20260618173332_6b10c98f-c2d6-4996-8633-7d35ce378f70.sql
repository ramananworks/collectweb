
-- 1) Tighten areas writes to owner/manager only
DROP POLICY IF EXISTS "Users can insert company areas" ON public.areas;
DROP POLICY IF EXISTS "Users can update company areas" ON public.areas;
DROP POLICY IF EXISTS "Users can delete company areas" ON public.areas;

CREATE POLICY "Owners and managers can insert company areas"
ON public.areas FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Owners and managers can update company areas"
ON public.areas FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

CREATE POLICY "Owners and managers can delete company areas"
ON public.areas FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- 2) Add WITH CHECK on UPDATE to prevent company_id reassignment

DROP POLICY IF EXISTS "Managers can update company customers" ON public.customers;
CREATE POLICY "Managers can update company customers"
ON public.customers FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Authorized roles can update company invoices" ON public.invoices;
CREATE POLICY "Authorized roles can update company invoices"
ON public.invoices FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'delivery_staff'::app_role))
)
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Authorized roles can update company payments" ON public.payments;
CREATE POLICY "Authorized roles can update company payments"
ON public.payments FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'collection_staff'::app_role) OR has_role(auth.uid(), 'delivery_staff'::app_role))
)
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Owners and managers can update company delivery otps" ON public.delivery_otps;
CREATE POLICY "Owners and managers can update company delivery otps"
ON public.delivery_otps FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND current_user_can_write()
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
)
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Owners can update own company" ON public.companies;
CREATE POLICY "Owners can update own company"
ON public.companies FOR UPDATE
USING (
  id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role)
)
WITH CHECK (id = get_user_company_id(auth.uid()));

-- 3) Cross-company FK validation triggers

CREATE OR REPLACE FUNCTION public.validate_invoice_customer_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cust_company uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  SELECT company_id INTO cust_company FROM public.customers WHERE id = NEW.customer_id;
  IF cust_company IS NULL OR cust_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Customer % does not belong to company %', NEW.customer_id, NEW.company_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_invoice_customer_company ON public.invoices;
CREATE TRIGGER trg_validate_invoice_customer_company
BEFORE INSERT OR UPDATE OF customer_id, company_id ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_customer_company();

CREATE OR REPLACE FUNCTION public.validate_payment_invoice_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv_company uuid;
BEGIN
  IF NEW.invoice_id IS NULL THEN RETURN NEW; END IF;
  SELECT company_id INTO inv_company FROM public.invoices WHERE id = NEW.invoice_id;
  IF inv_company IS NULL OR inv_company <> NEW.company_id THEN
    RAISE EXCEPTION 'Invoice % does not belong to company %', NEW.invoice_id, NEW.company_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_payment_invoice_company ON public.payments;
CREATE TRIGGER trg_validate_payment_invoice_company
BEFORE INSERT OR UPDATE OF invoice_id, company_id ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.validate_payment_invoice_company();

CREATE OR REPLACE FUNCTION public.validate_delivery_otp_refs_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_company uuid;
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    SELECT company_id INTO ref_company FROM public.invoices WHERE id = NEW.invoice_id;
    IF ref_company IS NULL OR ref_company <> NEW.company_id THEN
      RAISE EXCEPTION 'Invoice % does not belong to company %', NEW.invoice_id, NEW.company_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    SELECT company_id INTO ref_company FROM public.customers WHERE id = NEW.customer_id;
    IF ref_company IS NULL OR ref_company <> NEW.company_id THEN
      RAISE EXCEPTION 'Customer % does not belong to company %', NEW.customer_id, NEW.company_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_delivery_otp_refs_company ON public.delivery_otps;
CREATE TRIGGER trg_validate_delivery_otp_refs_company
BEFORE INSERT OR UPDATE OF invoice_id, customer_id, company_id ON public.delivery_otps
FOR EACH ROW EXECUTE FUNCTION public.validate_delivery_otp_refs_company();
