-- ============================================
-- Migración: Crear tabla de imágenes
-- ============================================

-- Crear tabla de imágenes
CREATE TABLE IF NOT EXISTS imagenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text,
  tamaño bigint,
  url text NOT NULL,
  caso_id uuid REFERENCES casos(id) ON DELETE CASCADE,
  nota_id uuid REFERENCES notas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS en la tabla de imágenes
ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para imágenes
CREATE POLICY "Users can manage own images"
  ON imagenes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger para updated_at
CREATE TRIGGER imagenes_updated_at
  BEFORE UPDATE ON imagenes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imagenes_user_id ON imagenes(user_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_caso_id ON imagenes(caso_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_nota_id ON imagenes(nota_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_created_at ON imagenes(created_at DESC);

-- Comentarios explicativos
COMMENT ON TABLE imagenes IS 'Tabla para almacenar metadatos de imágenes asociadas a casos y notas';
COMMENT ON COLUMN imagenes.caso_id IS 'ID del caso al que pertenece la imagen (opcional)';
COMMENT ON COLUMN imagenes.nota_id IS 'ID de la nota a la que pertenece la imagen (opcional)';
COMMENT ON COLUMN imagenes.url IS 'URL pública de la imagen en Supabase Storage'; 