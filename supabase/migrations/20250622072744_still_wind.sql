/*
  # Fix RLS policies for documentos table and storage

  1. Security Updates
    - Update RLS policies for `documentos` table to allow proper INSERT operations
    - Add storage policies for `documentos` bucket to allow file uploads
    - Ensure authenticated users can manage their own documents

  2. Changes Made
    - Drop existing restrictive policies if they exist
    - Create new policies that properly allow authenticated users to insert documents
    - Add storage bucket policies for file uploads
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

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;

-- Create storage policies for documentos bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Users can view own documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "Users can delete own documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos');

CREATE POLICY "Users can update own documents"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');