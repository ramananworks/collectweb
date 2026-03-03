
-- Make the bill-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'bill-images';

-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Bill images are publicly readable" ON storage.objects;

-- Create company-scoped SELECT policy
CREATE POLICY "Users can read own company bill images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bill-images' AND
  (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
);

-- Drop and recreate upload policy with company-scoped path enforcement
DROP POLICY IF EXISTS "Users can upload bill images" ON storage.objects;

CREATE POLICY "Users can upload company bill images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bill-images' AND
  (storage.foldername(name))[1]::uuid = get_user_company_id(auth.uid())
);
