
-- 1. Add super_admin enum value
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Allow user_roles.company_id to be null for platform-level roles
ALTER TABLE public.user_roles ALTER COLUMN company_id DROP NOT NULL;

-- 3. Helper: is_super_admin (uses text cast so it works even before enum value is committed in some tools)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'super_admin'
  )
$$;

-- 4. Super-admin RLS policies (read-all) on tenant tables
CREATE POLICY "Super admins read all companies" ON public.companies
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins update all companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins write all subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all customers" ON public.customers
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all invoices" ON public.invoices
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins read all areas" ON public.areas
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- 5. Admin actions

CREATE OR REPLACE FUNCTION public.admin_grant_complimentary_plan(
  _company_id uuid,
  _months integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_end timestamptz;
  plan_kind text;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _months IS NULL OR _months < 1 OR _months > 60 THEN
    RAISE EXCEPTION 'months must be between 1 and 60';
  END IF;
  new_end := now() + (_months || ' months')::interval;
  plan_kind := CASE WHEN _months >= 12 THEN 'yearly' ELSE 'monthly' END;

  INSERT INTO public.subscriptions
    (company_id, plan_type, quantity, status, current_period_start, current_period_end, raw)
  VALUES
    (_company_id, plan_kind, 1, 'active', now(), new_end,
     jsonb_build_object('complimentary', true, 'granted_by', auth.uid(), 'granted_at', now(), 'months', _months));

  UPDATE public.companies
     SET plan = 'pro', plan_expires_at = new_end, status = 'active'
   WHERE id = _company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_plan(
  _company_id uuid,
  _days integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  latest_id uuid;
  cur_end timestamptz;
  new_end timestamptz;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _days IS NULL OR _days < 1 OR _days > 3650 THEN
    RAISE EXCEPTION 'days must be between 1 and 3650';
  END IF;

  SELECT id, current_period_end INTO latest_id, cur_end
    FROM public.subscriptions
   WHERE company_id = _company_id
   ORDER BY created_at DESC
   LIMIT 1;

  new_end := COALESCE(cur_end, now()) + (_days || ' days')::interval;

  IF latest_id IS NOT NULL THEN
    UPDATE public.subscriptions
       SET current_period_end = new_end,
           status = 'active',
           cancel_at_period_end = false
     WHERE id = latest_id;
  ELSE
    INSERT INTO public.subscriptions
      (company_id, plan_type, quantity, status, current_period_start, current_period_end, raw)
    VALUES
      (_company_id, 'monthly', 1, 'active', now(), new_end,
       jsonb_build_object('extended_by', auth.uid(), 'days', _days));
  END IF;

  UPDATE public.companies
     SET plan = 'pro', plan_expires_at = new_end, status = 'active'
   WHERE id = _company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cancel_plan(_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.subscriptions
     SET status = 'cancelled', cancel_at_period_end = true
   WHERE company_id = _company_id
     AND status IN ('active','authenticated','pending');

  UPDATE public.companies
     SET plan_expires_at = NULL
   WHERE id = _company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_complimentary_plan(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_extend_plan(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cancel_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
