-- ============================================
-- Migración 04: Sistema de Calendario
-- ============================================

-- Tabla para tokens de Google Calendar
CREATE TABLE google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de eventos de calendario
CREATE TABLE calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id text,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  ubicacion text,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  is_synced_with_google boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de asistentes a eventos
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  email text NOT NULL,
  nombre text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para google_calendar_tokens
CREATE POLICY "Users can manage own calendar tokens"
  ON google_calendar_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para calendar_events
CREATE POLICY "Users can manage own calendar events"
  ON calendar_events
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para event_attendees
CREATE POLICY "Users can manage attendees of own events"
  ON event_attendees
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  );

-- Triggers para updated_at
CREATE TRIGGER google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Índices para performance
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX idx_google_calendar_tokens_expires_at ON google_calendar_tokens(expires_at);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_fecha_inicio ON calendar_events(fecha_inicio);
CREATE INDEX idx_calendar_events_fecha_fin ON calendar_events(fecha_fin);
CREATE INDEX idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX idx_calendar_events_cliente_id ON calendar_events(cliente_id);
CREATE INDEX idx_calendar_events_caso_id ON calendar_events(caso_id);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_email ON event_attendees(email);
