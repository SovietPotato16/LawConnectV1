-- ============================================
-- Migración: Corrección definitiva de get_ai_usage_stats (con DROP primero)
-- ============================================

-- Eliminar funciones existentes para recrearlas con tipos correctos
DROP FUNCTION IF EXISTS get_ai_usage_stats(uuid);
DROP FUNCTION IF EXISTS increment_ai_usage(uuid);
DROP FUNCTION IF EXISTS debug_ai_usage_stats(uuid);

-- Función simplificada y corregida para obtener estadísticas de uso
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
  current_used integer;
  current_limit integer;
  record_exists boolean := false;
BEGIN
  -- Buscar registro existente para hoy
  SELECT 
    al.requests_used,
    al.requests_limit,
    true
  INTO current_used, current_limit, record_exists
  FROM ai_usage_limits al
  WHERE al.user_id = p_user_id AND al.reset_date = today;
  
  -- Si no hay registro, crear uno con valores iniciales
  IF record_exists IS NULL OR record_exists = false THEN
    INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
    VALUES (p_user_id, today, 0, 50);
    
    current_used := 0;
    current_limit := 50;
  END IF;
  
  -- Retornar las estadísticas reales (con valores seguros)
  RETURN QUERY
  SELECT 
    COALESCE(current_used, 0) as requests_used,
    COALESCE(current_limit, 50) as requests_limit,
    GREATEST(0, COALESCE(current_limit, 50) - COALESCE(current_used, 0)) as requests_remaining,
    today;
    
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, log y retornar valores por defecto
    RAISE WARNING 'Error in get_ai_usage_stats for user %: %', p_user_id, SQLERRM;
    RETURN QUERY SELECT 0, 50, 50, today;
END;
$$;

-- Función mejorada de incremento con logging más detallado (retorna integer ahora)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := CURRENT_DATE;
  new_count integer;
  old_count integer;
BEGIN
  -- Obtener el conteo actual para logging
  SELECT COALESCE(requests_used, 0) INTO old_count
  FROM ai_usage_limits
  WHERE user_id = p_user_id AND reset_date = today;
  
  -- Crear registro si no existe, o incrementar si existe
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 1, 50)
  ON CONFLICT (user_id, reset_date) 
  DO UPDATE SET 
    requests_used = ai_usage_limits.requests_used + 1,
    updated_at = now()
  RETURNING requests_used INTO new_count;
  
  -- Log detallado para debugging
  RAISE NOTICE 'AI Usage increment for user %: % -> % (date: %)', 
    p_user_id, COALESCE(old_count, 0), new_count, today;
  
  RETURN new_count;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error con más detalles
    RAISE WARNING 'Error in increment_ai_usage for user % on date %: %', 
      p_user_id, today, SQLERRM;
    RETURN -1; -- Indicar error
END;
$$;

-- Función de utilidad para verificar datos de la BD (debugging)
CREATE OR REPLACE FUNCTION debug_ai_usage_stats(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  reset_date date,
  requests_used integer,
  requests_limit integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.user_id,
    al.reset_date,
    al.requests_used,
    al.requests_limit,
    al.created_at,
    al.updated_at
  FROM ai_usage_limits al
  WHERE al.user_id = p_user_id
  ORDER BY al.reset_date DESC
  LIMIT 10;
END;
$$;

-- Refrescar permisos
GRANT EXECUTE ON FUNCTION get_ai_usage_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_ai_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION debug_ai_usage_stats(uuid) TO service_role;

-- Crear índice si no existe para mejor performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_limits_user_date_unique 
ON ai_usage_limits(user_id, reset_date); 