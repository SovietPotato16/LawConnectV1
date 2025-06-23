/*
  # Create imagenes table for image attachments

  1. New Tables
    - `imagenes`
      - `id` (uuid, primary key)
      - `nombre` (text, file name)
      - `tipo` (text, MIME type)
      - `tamaño` (bigint, file size in bytes)
      - `url` (text, storage URL)
      - `caso_id` (uuid, foreign key to casos table, nullable)
      - `nota_id` (uuid, foreign key to notas table, nullable)
      - `user_id` (uuid, foreign key to profiles table)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS on `imagenes` table
    - Add policies for authenticated users to manage their own images

  3. Indexes
    - Add indexes for efficient querying by caso_id, nota_id, and user_id
*/

CREATE TABLE IF NOT EXISTS imagenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text,
  tamaño bigint,
  url text NOT NULL,
  caso_id uuid,
  nota_id uuid,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'imagenes_caso_id_fkey'
  ) THEN
    ALTER TABLE imagenes ADD CONSTRAINT imagenes_caso_id_fkey 
    FOREIGN KEY (caso_id) REFERENCES casos(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'imagenes_nota_id_fkey'
  ) THEN
    ALTER TABLE imagenes ADD CONSTRAINT imagenes_nota_id_fkey 
    FOREIGN KEY (nota_id) REFERENCES notas(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'imagenes_user_id_fkey'
  ) THEN
    ALTER TABLE imagenes ADD CONSTRAINT imagenes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_imagenes_caso_id ON imagenes(caso_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_nota_id ON imagenes(nota_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_user_id ON imagenes(user_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_created_at ON imagenes(created_at DESC);

-- Enable RLS
ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read own images"
  ON imagenes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own images"
  ON imagenes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own images"
  ON imagenes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own images"
  ON imagenes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'imagenes_updated_at'
  ) THEN
    CREATE TRIGGER imagenes_updated_at
      BEFORE UPDATE ON imagenes
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;