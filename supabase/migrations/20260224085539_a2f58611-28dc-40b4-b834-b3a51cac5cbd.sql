-- Add assigned_to column to customers table (nullable, references profiles)
ALTER TABLE public.customers
ADD COLUMN assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for filtering by assigned user
CREATE INDEX idx_customers_assigned_to ON public.customers(assigned_to);