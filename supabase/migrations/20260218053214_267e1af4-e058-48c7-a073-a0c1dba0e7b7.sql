
-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  default_due_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Owners can update own company"
  ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'owner'));

-- Add FK from profiles to companies
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  gstin TEXT,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  outstanding NUMERIC NOT NULL DEFAULT 0,
  default_due_days INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read company customers"
  ON public.customers FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company customers"
  ON public.customers FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read company invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company invoices"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company invoices"
  ON public.invoices FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company invoices"
  ON public.invoices FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'cash' CHECK (mode IN ('cash', 'upi', 'bank_transfer')),
  collected_by TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read company payments"
  ON public.payments FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company payments"
  ON public.payments FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Areas table for company-specific area management
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read company areas"
  ON public.areas FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert company areas"
  ON public.areas FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company areas"
  ON public.areas FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete company areas"
  ON public.areas FOR DELETE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

-- Update handle_new_user to also create a company for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a company for the new user
  INSERT INTO public.companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'))
  RETURNING id INTO new_company_id;

  -- Create profile linked to the company
  INSERT INTO public.profiles (id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    new_company_id
  );

  -- Assign owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'owner');

  RETURN NEW;
END;
$$;
