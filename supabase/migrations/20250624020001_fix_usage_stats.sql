-- ============================================
-- Migración: Fix para get_ai_usage_stats
-- ============================================

-- Función mejorada para obtener estadísticas de uso (sin UNION problemático)
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
  usage_record RECORD;
BEGIN
  -- Crear registro si no existe (UPSERT seguro)
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 0, 50)
  ON CONFLICT (user_id, reset_date) DO NOTHING;
  
  -- Obtener el registro actual de forma directa
  SELECT 
    COALESCE(al.requests_used, 0) as requests_used,
    COALESCE(al.requests_limit, 50) as requests_limit,
    COALESCE(al.reset_date, today) as reset_date
  INTO usage_record
  FROM ai_usage_limits al
  WHERE al.user_id = p_user_id AND al.reset_date = today;
  
  -- Si aún no existe registro, crearlo explícitamente
  IF usage_record IS NULL THEN
    INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
    VALUES (p_user_id, today, 0, 50);
    
    usage_record.requests_used := 0;
    usage_record.requests_limit := 50;
    usage_record.reset_date := today;
  END IF;
  
  -- Retornar estadísticas calculadas
  RETURN QUERY
  SELECT 
    usage_record.requests_used,
    usage_record.requests_limit,
    usage_record.requests_limit - usage_record.requests_used as requests_remaining,
    usage_record.reset_date;
    
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar valores por defecto
    RAISE WARNING 'Error in get_ai_usage_stats for user %: %', p_user_id, SQLERRM;
    RETURN QUERY SELECT 0, 50, 50, today;
END;
$$;

-- También vamos a mejorar la función de incremento para mejor logging
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  today date := CURRENT_DATE;
  new_count integer;
BEGIN
  -- Crear registro si no existe, o incrementar si existe
  INSERT INTO ai_usage_limits (user_id, reset_date, requests_used, requests_limit)
  VALUES (p_user_id, today, 1, 50)
  ON CONFLICT (user_id, reset_date) 
  DO UPDATE SET 
    requests_used = ai_usage_limits.requests_used + 1,
    updated_at = now()
  RETURNING requests_used INTO new_count;
  
  -- Log para debugging
  RAISE NOTICE 'User % usage incremented to % for date %', p_user_id, new_count, today;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error pero no falla
    RAISE WARNING 'Error in increment_ai_usage for user %: %', p_user_id, SQLERRM;
END;
$$;

-- Refrescar permisos
GRANT EXECUTE ON FUNCTION get_ai_usage_stats(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION increment_ai_usage(uuid) TO service_role; 