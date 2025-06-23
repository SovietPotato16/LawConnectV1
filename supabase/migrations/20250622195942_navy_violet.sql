/*
  # Create storage buckets and policies

  1. Storage Buckets
    - Create documentos bucket for document storage
    - Create imagenes bucket for image storage
  
  2. Storage Policies
    - Allow authenticated users to upload, view, update, and delete their own files
    - Organize files by user ID for security
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documentos', 'documentos', false),
  ('imagenes', 'imagenes', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DO $$
BEGIN
  -- Drop all existing policies on storage.objects
  DROP POLICY IF EXISTS "Users can upload to documentos bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own files in documentos bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own files in documentos bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own files in documentos bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload to imagenes bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own files in imagenes bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own files in imagenes bucket" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own files in imagenes bucket" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create storage policies for documentos bucket
CREATE POLICY "Users can upload to documentos bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files in documentos bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own files in documentos bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files in documentos bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create storage policies for imagenes bucket
CREATE POLICY "Users can upload to imagenes bucket"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'imagenes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files in imagenes bucket"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'imagenes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own files in imagenes bucket"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'imagenes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files in imagenes bucket"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'imagenes' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );