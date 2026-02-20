-- Add bill_image_url column to invoices
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS bill_image_url TEXT DEFAULT NULL;

-- Create storage bucket for bill images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bill-images', 'bill-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users of same company to upload
CREATE POLICY "Users can upload bill images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bill-images');

CREATE POLICY "Bill images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bill-images');

CREATE POLICY "Users can update bill images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bill-images');

CREATE POLICY "Users can delete bill images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bill-images');
