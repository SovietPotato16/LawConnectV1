-- ============================================
-- Migración: Crear tabla event_tags
-- ============================================

-- Tabla de relación evento-tags
CREATE TABLE event_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL, -- ID del evento de Google Calendar
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, tag_id)
);

-- Habilitar RLS
ALTER TABLE event_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para event_tags
CREATE POLICY "Users can read own event tags"
  ON event_tags
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own event tags"
  ON event_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own event tags"
  ON event_tags
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own event tags"
  ON event_tags
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()); 