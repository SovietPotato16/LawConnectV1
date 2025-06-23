/*
  # Fix storage bucket and policies for documents

  1. Storage Setup
    - Create documentos bucket if it doesn't exist
    - Set up proper storage policies for authenticated users
    
  2. Security
    - Enable proper RLS policies for document access
    - Ensure users can only access their own documents
*/

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DO $$
BEGIN
  -- Drop all existing policies on storage.objects for documentos bucket
  DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own documents storage" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own documents storage" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own documents storage" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update documents" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    -- Policy doesn't exist, continue
    NULL;
END $$;

-- Create comprehensive storage policies for documentos bucket
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
  )
  WITH CHECK (
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

-- Ensure RLS is enabled on documentos table
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Recreate documentos table policies to ensure they're correct
DROP POLICY IF EXISTS "Users can insert own documents" ON documentos;
DROP POLICY IF EXISTS "Users can read own documents" ON documentos;
DROP POLICY IF EXISTS "Users can update own documents" ON documentos;
DROP POLICY IF EXISTS "Users can delete own documents" ON documentos;

CREATE POLICY "Users can insert own documents"
  ON documentos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own documents"
  ON documentos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documentos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documentos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);