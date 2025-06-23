/*
  # Storage Configuration for LawConnect

  1. Storage Buckets
    - `documentos` bucket for case documents (private)
    - `avatars` bucket for user profile pictures (public read)
  
  2. Security
    - RLS policies for user isolation
    - Folder-based organization by user ID
    - Private documents, public avatars
*/

-- Create storage buckets
DO $$
BEGIN
  -- Create documentos bucket (private)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'documentos',
    'documentos', 
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/jpeg', 'image/png']
  );
EXCEPTION
  WHEN unique_violation THEN
    NULL; -- Bucket already exists
END $$;

DO $$
BEGIN
  -- Create avatars bucket (public)
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
  );
EXCEPTION
  WHEN unique_violation THEN
    NULL; -- Bucket already exists
END $$;

-- Create policies for documentos bucket (private files)
DO $$
BEGIN
  CREATE POLICY "Users can upload own documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'documentos' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view own documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'documentos' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own documents"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'documentos' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'documentos' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

-- Create policies for avatars bucket (public read, private write)
DO $$
BEGIN
  CREATE POLICY "Users can upload own avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can view avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update own avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete own avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars' 
      AND (string_to_array(name, '/'))[1] = auth.uid()::text
    );
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Policy already exists
END $$;