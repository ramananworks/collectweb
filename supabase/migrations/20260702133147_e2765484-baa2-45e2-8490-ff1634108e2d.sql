
-- 1. Scope has_role() to the user's current company
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.company_id = public.get_user_company_id(_user_id)
  )
$$;

-- 2. Add SELECT policy so delivery_staff can read OTPs for invoices they are delivering
CREATE POLICY "Delivery staff can view OTPs for their invoices"
ON public.delivery_otps
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'delivery_staff')
  AND invoice_id IN (
    SELECT id FROM public.invoices
    WHERE company_id = public.get_user_company_id(auth.uid())
      AND (delivered_by = auth.uid() OR delivered_by IS NULL)
  )
);
