/*
  # Fix AI usage stats function

  1. Database Functions
    - Fix ambiguous column reference in get_ai_usage_stats function
    - Properly qualify all column references with table aliases

  2. Changes
    - Update get_ai_usage_stats function to use proper table aliases
    - Ensure all column references are unambiguous
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_ai_usage_stats(uuid);

-- Recreate function with proper column qualification
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_user_id uuid)
RETURNS TABLE (
  requests_used integer,
  requests_limit integer,
  requests_remaining integer,
  reset_date date
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(aul.requests_used, 0) as requests_used,
    COALESCE(aul.requests_limit, 50) as requests_limit,
    GREATEST(0, COALESCE(aul.requests_limit, 50) - COALESCE(aul.requests_used, 0)) as requests_remaining,
    aul.reset_date
  FROM ai_usage_limits aul
  WHERE aul.user_id = p_user_id 
    AND aul.reset_date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    0 as requests_used,
    50 as requests_limit,
    50 as requests_remaining,
    CURRENT_DATE as reset_date
  WHERE NOT EXISTS (
    SELECT 1 
    FROM ai_usage_limits aul2 
    WHERE aul2.user_id = p_user_id 
      AND aul2.reset_date = CURRENT_DATE
  )
  
  LIMIT 1;
END;
$$;