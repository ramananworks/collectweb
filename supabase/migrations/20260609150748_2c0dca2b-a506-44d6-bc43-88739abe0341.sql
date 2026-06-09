
-- ============ external_ref + source columns ============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
CREATE UNIQUE INDEX IF NOT EXISTS customers_company_external_ref_uniq
  ON public.customers(company_id, external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
CREATE UNIQUE INDEX IF NOT EXISTS invoices_company_external_ref_uniq
  ON public.invoices(company_id, external_ref) WHERE external_ref IS NOT NULL;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS external_ref text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app';
CREATE UNIQUE INDEX IF NOT EXISTS payments_company_external_ref_uniq
  ON public.payments(company_id, external_ref) WHERE external_ref IS NOT NULL;

-- ============ api_devices ============
CREATE TABLE public.api_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  device_name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_devices_company_idx ON public.api_devices(company_id) WHERE revoked_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_devices TO authenticated;
GRANT ALL ON public.api_devices TO service_role;
ALTER TABLE public.api_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own company devices"
  ON public.api_devices FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners revoke own company devices"
  ON public.api_devices FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND public.has_role(auth.uid(), 'owner'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- ============ api_pair_codes ============
CREATE TABLE public.api_pair_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  claimed_at timestamptz,
  claimed_device_id uuid REFERENCES public.api_devices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_pair_codes_company_idx ON public.api_pair_codes(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_pair_codes TO authenticated;
GRANT ALL ON public.api_pair_codes TO service_role;
ALTER TABLE public.api_pair_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own pair codes"
  ON public.api_pair_codes FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND public.has_role(auth.uid(), 'owner'))
  WITH CHECK (company_id = public.get_user_company_id(auth.uid())
              AND public.has_role(auth.uid(), 'owner'));

-- ============ api_request_log ============
CREATE TABLE public.api_request_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  device_id uuid REFERENCES public.api_devices(id) ON DELETE SET NULL,
  path text NOT NULL,
  method text NOT NULL,
  status int NOT NULL,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_request_log_company_idx ON public.api_request_log(company_id, created_at DESC);

GRANT SELECT ON public.api_request_log TO authenticated;
GRANT ALL ON public.api_request_log TO service_role;
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own request log"
  ON public.api_request_log FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid())
         AND public.has_role(auth.uid(), 'owner'));

-- ============ updated_at trigger for api_devices ============
CREATE TRIGGER update_api_devices_updated_at
  BEFORE UPDATE ON public.api_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ helper: resolve device by token hash ============
CREATE OR REPLACE FUNCTION public.get_device_by_token_hash(_token_hash text)
RETURNS TABLE(device_id uuid, company_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_id
  FROM public.api_devices
  WHERE token_hash = _token_hash AND revoked_at IS NULL
  LIMIT 1
$$;
