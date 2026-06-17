
CREATE TABLE public.subscription_payment_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  razorpay_subscription_id text NOT NULL,
  razorpay_payment_id text,
  razorpay_event_id text,
  event_name text NOT NULL,
  plan_type text NOT NULL,
  quantity integer NOT NULL,
  expected_amount_paise bigint NOT NULL,
  actual_amount_paise bigint NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  amount_matches boolean NOT NULL,
  mismatch_reason text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spa_company ON public.subscription_payment_audits(company_id, created_at DESC);
CREATE UNIQUE INDEX idx_spa_event_unique
  ON public.subscription_payment_audits(razorpay_event_id)
  WHERE razorpay_event_id IS NOT NULL;

GRANT SELECT ON public.subscription_payment_audits TO authenticated;
GRANT ALL ON public.subscription_payment_audits TO service_role;

ALTER TABLE public.subscription_payment_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their company's payment audits"
ON public.subscription_payment_audits
FOR SELECT
TO authenticated
USING (
  company_id = public.get_user_company_id(auth.uid())
  AND public.has_role(auth.uid(), 'owner'::app_role)
);
