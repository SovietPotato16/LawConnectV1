/*
  # Sistema de IA Assistant con límites y chats guardados

  1. Nuevas tablas
    - `ai_usage_limits` - Control de límites de uso por usuario
    - `ai_chat_sessions` - Sesiones de chat guardadas
    - `ai_chat_messages` - Mensajes de cada sesión
    - `email_reminders` - Recordatorios por email
    
  2. Funciones
    - Verificación de límites de uso
    - Gestión de sesiones de chat
    
  3. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para usuarios autenticados
*/

-- Tabla para controlar límites de uso de IA por usuario
CREATE TABLE IF NOT EXISTS ai_usage_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requests_used integer DEFAULT 0,
  requests_limit integer DEFAULT 50,
  reset_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reset_date)
);

-- Tabla para sesiones de chat guardadas
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_favorite boolean DEFAULT false,
  context_documents jsonb DEFAULT '[]'::jsonb,
  context_case_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para mensajes de chat
CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_used jsonb DEFAULT '{}'::jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla para recordatorios por email
CREATE TABLE IF NOT EXISTS email_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  recipient_email text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE ai_usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_reminders ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_usage_limits
CREATE POLICY "Users can read own usage limits"
  ON ai_usage_limits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own usage limits"
  ON ai_usage_limits
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert usage limits"
  ON ai_usage_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Políticas para ai_chat_sessions
CREATE POLICY "Users can manage own chat sessions"
  ON ai_chat_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas para ai_chat_messages
CREATE POLICY "Users can read messages from own sessions"
  ON ai_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions 
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
      AND ai_chat_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions"
  ON ai_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions 
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
      AND ai_chat_sessions.user_id = auth.uid()
    )
  );

-- Políticas para email_reminders
CREATE POLICY "Users can manage own email reminders"
  ON email_reminders
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers para updated_at
CREATE TRIGGER ai_usage_limits_updated_at
  BEFORE UPDATE ON ai_usage_limits
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER ai_chat_sessions_updated_at
  BEFORE UPDATE ON ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Función para verificar y actualizar límites de uso
CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage integer;
  usage_limit integer;
  today date := CURRENT_DATE;
BEGIN
  -- Obtener o crear registro de uso para hoy
  INSERT INTO ai_usage_limits (user_id, reset_date)
  VALUES (p_user_id, today)
  ON CONFLICT (user_id, reset_date) DO NOTHING;
  
  -- Obtener límites actuales
  SELECT requests_used, requests_limit
  INTO current_usage, usage_limit
  FROM ai_usage_limits
  WHERE user_id = p_user_id AND reset_date = today;
  
  -- Verificar si puede hacer más requests
  RETURN current_usage < usage_limit;
END;
$$;

-- Función para incrementar uso de IA
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  UPDATE ai_usage_limits
  SET requests_used = requests_used + 1,
      updated_at = now()
  WHERE user_id = p_user_id AND reset_date = today;
END;
$$;

-- Función para obtener estadísticas de uso
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_user_id uuid)
RETURNS TABLE(
  requests_used integer,
  requests_limit integer,
  requests_remaining integer,
  reset_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := CURRENT_DATE;
BEGIN
  -- Asegurar que existe registro para hoy
  INSERT INTO ai_usage_limits (user_id, reset_date)
  VALUES (p_user_id, today)
  ON CONFLICT (user_id, reset_date) DO NOTHING;
  
  RETURN QUERY
  SELECT 
    al.requests_used,
    al.requests_limit,
    (al.requests_limit - al.requests_used) as requests_remaining,
    al.reset_date
  FROM ai_usage_limits al
  WHERE al.user_id = p_user_id AND al.reset_date = today;
END;
$$;

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_user_date ON ai_usage_limits(user_id, reset_date);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_email_reminders_user_id ON email_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_scheduled ON email_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_reminders_status ON email_reminders(status);