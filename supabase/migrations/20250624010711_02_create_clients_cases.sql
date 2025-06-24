-- ============================================
-- Migración 02: Clientes y Casos
-- ============================================

-- Clean up existing types from old setup
DROP TYPE IF EXISTS caso_estado CASCADE;
DROP TYPE IF EXISTS caso_prioridad CASCADE;

-- Enums para casos
CREATE TYPE caso_estado AS ENUM ('Activo', 'Pendiente', 'Cerrado', 'En Revisión');
CREATE TYPE caso_prioridad AS ENUM ('Alta', 'Media', 'Baja');

-- Tabla de clientes
CREATE TABLE clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text,
  telefono text,
  empresa text,
  direccion text,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de casos
CREATE TABLE casos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descripcion text,
  estado caso_estado DEFAULT 'Pendiente',
  prioridad caso_prioridad DEFAULT 'Media',
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha_vencimiento timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clientes
CREATE POLICY "Users can read own clients"
  ON clientes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own clients"
  ON clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own clients"
  ON clientes
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own clients"
  ON clientes
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Políticas RLS para casos
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
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own cases"
  ON casos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER casos_updated_at
  BEFORE UPDATE ON casos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Índices para performance
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_clientes_created_at ON clientes(created_at DESC);
CREATE INDEX idx_casos_user_id ON casos(user_id);
CREATE INDEX idx_casos_cliente_id ON casos(cliente_id);
CREATE INDEX idx_casos_estado ON casos(estado);
CREATE INDEX idx_casos_prioridad ON casos(prioridad);
CREATE INDEX idx_casos_created_at ON casos(created_at DESC);
