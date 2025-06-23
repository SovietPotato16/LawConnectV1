/*
  # Fix RLS policies for documentos table and storage

  1. Tables
    - Fix RLS policies for `documentos` table to allow proper CRUD operations
  
  2. Storage
    - Create documentos bucket if it doesn't exist
    - Fix storage policies to allow authenticated users to upload/manage files
  
  3. Security
    - Ensure proper RLS policies for both table and storage operations
    - Allow authenticated users to manage their own documents and files
*/

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert own documents" ON documentos;
DROP POLICY IF EXISTS "Users can read own documents" ON documentos;
DROP POLICY IF EXISTS "Users can update own documents" ON documentos;
DROP POLICY IF EXISTS "Users can delete own documents" ON documentos;

-- Recreate policies for documentos table with proper permissions
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

-- Ensure RLS is enabled on documentos table
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist (with more specific names to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own documents storage" ON storage.objects;

-- Also try to drop any existing policies with similar names
DO $$
BEGIN
  -- Drop policies that might exist with different names
  DROP POLICY IF EXISTS "Users can update own documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN
    -- Policy doesn't exist, continue
    NULL;
END $$;

-- Create storage policies for documentos bucket with unique names
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Users can view own documents storage"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "Users can delete own documents storage"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "Users can update own documents storage"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');