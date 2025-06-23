/*
  # Create cases table

  1. New Tables
    - `casos`
      - `id` (uuid, primary key)
      - `titulo` (text)
      - `descripcion` (text, optional)
      - `estado` (enum)
      - `prioridad` (enum)
      - `cliente_id` (uuid, references clientes)
      - `user_id` (uuid, references profiles)
      - `fecha_vencimiento` (timestamp, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `casos` table
    - Add policies for users to manage their own cases
*/

-- Create enums
DO $$ BEGIN
  CREATE TYPE caso_estado AS ENUM ('Activo', 'Pendiente', 'Cerrado', 'En Revisión');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE caso_prioridad AS ENUM ('Alta', 'Media', 'Baja');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create casos table
CREATE TABLE IF NOT EXISTS casos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  estado caso_estado DEFAULT 'Pendiente',
  prioridad caso_prioridad DEFAULT 'Media',
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  fecha_vencimiento timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own cases"
  ON casos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cases"
  ON casos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cases"
  ON casos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cases"
  ON casos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER casos_updated_at
  BEFORE UPDATE ON casos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();