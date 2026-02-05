-- Migration: Create storage bucket for generated images
-- This bucket stores AI-generated educational visuals

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access (bucket is public)
CREATE POLICY "Public read access for generated images"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images'
  AND auth.role() = 'authenticated'
);

-- Allow service role to upload images (for API routes)
CREATE POLICY "Service role can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'generated-images'
  AND auth.role() = 'service_role'
);

-- Allow service role to delete images (for cleanup)
CREATE POLICY "Service role can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'generated-images'
  AND auth.role() = 'service_role'
);
