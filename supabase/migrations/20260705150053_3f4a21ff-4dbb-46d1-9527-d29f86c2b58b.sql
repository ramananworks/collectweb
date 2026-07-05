
UPDATE public.companies
SET plan = 'pro',
    plan_expires_at = now() + interval '1 year'
WHERE id = 'a0f64baf-5feb-4e76-a5f0-bc20d99ad90d';

INSERT INTO public.subscriptions (
  company_id, razorpay_subscription_id, razorpay_plan_id, plan_type,
  quantity, status, current_period_start, current_period_end,
  cancel_at_period_end, short_url, raw
) VALUES (
  'a0f64baf-5feb-4e76-a5f0-bc20d99ad90d',
  'comp_' || gen_random_uuid()::text,
  NULL,
  'yearly',
  (SELECT GREATEST(1, COUNT(*))::int FROM public.user_roles WHERE company_id = 'a0f64baf-5feb-4e76-a5f0-bc20d99ad90d'),
  'active',
  now(),
  now() + interval '1 year',
  true,
  NULL,
  jsonb_build_object('complimentary', true, 'note', 'One-time free 1-year Pro plan granted manually')
);
