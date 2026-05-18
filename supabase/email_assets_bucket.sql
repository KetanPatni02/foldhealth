-- Create the email-assets storage bucket for email builder images
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read (public bucket)
CREATE POLICY "Public read access" ON storage.objects
  FOR SELECT USING (bucket_id = 'email-assets');

-- Allow authenticated and anon users to upload
CREATE POLICY "Allow uploads to email-assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'email-assets');
