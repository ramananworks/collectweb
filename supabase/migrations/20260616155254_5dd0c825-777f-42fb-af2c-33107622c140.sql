
-- Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razorpay_subscription_id text UNIQUE,
  razorpay_plan_id text,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly','yearly')),
  quantity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'created',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  short_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_company ON public.subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view company subscriptions"
ON public.subscriptions FOR SELECT TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'owner'::app_role)
);

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Active-plan helper
CREATE OR REPLACE FUNCTION public.company_has_active_plan(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    -- Free plan: only allow writes if company has exactly 1 user (owner-only)
    WHEN (SELECT plan FROM public.companies WHERE id = _company_id) = 'free'
      THEN (SELECT COUNT(*) FROM public.user_roles WHERE company_id = _company_id) <= 1
    -- Pro/enterprise: must have an active subscription not yet expired
    ELSE EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE company_id = _company_id
        AND status IN ('active','authenticated','pending')
        AND (current_period_end IS NULL OR current_period_end > now())
    )
  END
$$;

-- Convenience helper for current user
CREATE OR REPLACE FUNCTION public.current_user_can_write()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.company_has_active_plan(public.get_user_company_id(auth.uid()))
$$;

-- Update write RLS policies to require active plan
-- invoices
DROP POLICY "Users can insert company invoices" ON public.invoices;
DROP POLICY "Users can update company invoices" ON public.invoices;
DROP POLICY "Owners can delete company invoices" ON public.invoices;
CREATE POLICY "Users can insert company invoices" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can update company invoices" ON public.invoices FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Owners can delete company invoices" ON public.invoices FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role) AND public.current_user_can_write());

-- payments
DROP POLICY "Users can insert company payments" ON public.payments;
DROP POLICY "Users can update company payments" ON public.payments;
DROP POLICY "Owners can delete company payments" ON public.payments;
CREATE POLICY "Users can insert company payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can update company payments" ON public.payments FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Owners can delete company payments" ON public.payments FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(),'owner'::app_role) AND public.current_user_can_write());

-- customers
DROP POLICY "Users can insert company customers" ON public.customers;
DROP POLICY "Users can update company customers" ON public.customers;
DROP POLICY "Users can delete company customers" ON public.customers;
CREATE POLICY "Users can insert company customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can update company customers" ON public.customers FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can delete company customers" ON public.customers FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());

-- areas
DROP POLICY "Users can insert company areas" ON public.areas;
DROP POLICY "Users can update company areas" ON public.areas;
DROP POLICY "Users can delete company areas" ON public.areas;
CREATE POLICY "Users can insert company areas" ON public.areas FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can update company areas" ON public.areas FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can delete company areas" ON public.areas FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());

-- delivery_otps
DROP POLICY "Users can insert company delivery otps" ON public.delivery_otps;
DROP POLICY "Users can update company delivery otps" ON public.delivery_otps;
CREATE POLICY "Users can insert company delivery otps" ON public.delivery_otps FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());
CREATE POLICY "Users can update company delivery otps" ON public.delivery_otps FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.current_user_can_write());

-- Seat-count enforcement on user_roles (block 2nd user if free & no active sub)
CREATE OR REPLACE FUNCTION public.enforce_seat_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cur_plan text;
  cur_count int;
  has_active_sub boolean;
BEGIN
  SELECT plan INTO cur_plan FROM public.companies WHERE id = NEW.company_id;
  SELECT COUNT(*) INTO cur_count FROM public.user_roles WHERE company_id = NEW.company_id;
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE company_id = NEW.company_id
      AND status IN ('active','authenticated','pending')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) INTO has_active_sub;

  IF cur_plan = 'free' AND cur_count >= 1 AND NOT has_active_sub THEN
    RAISE EXCEPTION 'Free plan supports only 1 user. Upgrade to Pro to invite team members.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_seat_limit
BEFORE INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_seat_limit();
