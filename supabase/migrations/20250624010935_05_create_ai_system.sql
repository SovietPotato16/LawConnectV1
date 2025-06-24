-- ============================================
-- Migración 05: Sistema de IA con Claude
-- ============================================

-- Tabla para controlar límites de uso de IA
CREATE TABLE ai_usage_limits (
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
CREATE TABLE ai_chat_sessions (
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
CREATE TABLE ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  context_used jsonb DEFAULT '{}'::jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabla para recordatorios por email
CREATE TABLE email_reminders (
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

-- Políticas RLS para ai_usage_limits
CREATE POLICY "Users can manage own usage limits"
  ON ai_usage_limits
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage usage limits"
  ON ai_usage_limits
  FOR ALL
  TO service_role
  WITH CHECK (true);

-- Políticas RLS para ai_chat_sessions
CREATE POLICY "Users can manage own chat sessions"
  ON ai_chat_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para ai_chat_messages
CREATE POLICY "Users can manage messages from own sessions"
  ON ai_chat_messages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions 
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
      AND ai_chat_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_chat_sessions 
      WHERE ai_chat_sessions.id = ai_chat_messages.session_id 
      AND ai_chat_sessions.user_id = auth.uid()
    )
  );

-- Políticas RLS para email_reminders
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

-- Función para verificar límites de uso (con manejo robusto de errores)
CREATE OR REPLACE FUNCTION check_ai_usage_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage integer := 0;
  usage_limit integer := 50;
  today date := CURRENT_DATE;
BEGIN
  -- Crear registro si no existe
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 0, 50)
  ON CONFLICT (user_id, reset_date) DO NOTHING;
  
  -- Obtener límites actuales
  SELECT COALESCE(requests_used, 0), COALESCE(requests_limit, 50)
  INTO current_usage, usage_limit
  FROM ai_usage_limits
  WHERE user_id = p_user_id AND reset_date = today;
  
  -- Si no hay registro, permitir (fail-safe)
  IF current_usage IS NULL THEN
    RETURN true;
  END IF;
  
  -- Verificar límite
  RETURN current_usage < usage_limit;
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, permitir uso (fail-safe)
    RAISE WARNING 'Error in check_ai_usage_limit for user %: %', p_user_id, SQLERRM;
    RETURN true;
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
  -- Crear registro si no existe
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 1, 50)
  ON CONFLICT (user_id, reset_date) 
  DO UPDATE SET 
    requests_used = ai_usage_limits.requests_used + 1,
    updated_at = now();
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no falla
    RAISE WARNING 'Error in increment_ai_usage for user %: %', p_user_id, SQLERRM;
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
  -- Crear registro si no existe
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 0, 50)
  ON CONFLICT (user_id, reset_date) DO NOTHING;
  
  -- Retornar estadísticas
  RETURN QUERY
  SELECT 
    COALESCE(al.requests_used, 0) as requests_used,
    COALESCE(al.requests_limit, 50) as requests_limit,
    COALESCE(al.requests_limit, 50) - COALESCE(al.requests_used, 0) as requests_remaining,
    COALESCE(al.reset_date, today) as reset_date
  FROM ai_usage_limits al
  WHERE al.user_id = p_user_id AND al.reset_date = today
  UNION ALL
  SELECT 0, 50, 50, today
  WHERE NOT EXISTS (
    SELECT 1 FROM ai_usage_limits 
    WHERE user_id = p_user_id AND reset_date = today
  )
  LIMIT 1;
EXCEPTION
  WHEN OTHERS THEN
    -- Retornar valores por defecto
    RETURN QUERY SELECT 0, 50, 50, today;
END;
$$;

-- Permisos para service_role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON public.ai_usage_limits TO service_role;
GRANT ALL ON public.ai_chat_sessions TO service_role;
GRANT ALL ON public.ai_chat_messages TO service_role;
GRANT ALL ON public.email_reminders TO service_role;

-- Permisos para funciones
GRANT EXECUTE ON FUNCTION check_ai_usage_limit(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION get_ai_usage_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_ai_usage(uuid) TO service_role;

-- Índices para optimización
CREATE INDEX idx_ai_usage_limits_user_date ON ai_usage_limits(user_id, reset_date);
CREATE INDEX idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX idx_ai_chat_sessions_created_at ON ai_chat_sessions(created_at DESC);
CREATE INDEX idx_ai_chat_sessions_is_favorite ON ai_chat_sessions(is_favorite);

CREATE INDEX idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX idx_ai_chat_messages_created_at ON ai_chat_messages(created_at);
CREATE INDEX idx_ai_chat_messages_role ON ai_chat_messages(role);

CREATE INDEX idx_email_reminders_user_id ON email_reminders(user_id);
CREATE INDEX idx_email_reminders_scheduled ON email_reminders(scheduled_for);
CREATE INDEX idx_email_reminders_status ON email_reminders(status);
