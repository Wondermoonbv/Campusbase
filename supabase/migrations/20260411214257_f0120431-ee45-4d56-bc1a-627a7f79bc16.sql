
-- Create the logos bucket (public so email clients can load images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view logos
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Allow admin/editor to upload logos
CREATE POLICY "Admin/editor can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role::text IN ('admin', 'editor')
  )
);

-- Allow admin/editor to update logos
CREATE POLICY "Admin/editor can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role::text IN ('admin', 'editor')
  )
);

-- Allow admin/editor to delete logos
CREATE POLICY "Admin/editor can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND role::text IN ('admin', 'editor')
  )
);
