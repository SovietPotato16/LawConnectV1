/*
  # Fix ambiguous column reference in get_ai_usage_stats RPC function

  1. Changes
    - Drop and recreate the get_ai_usage_stats function
    - Properly qualify all column references to avoid ambiguity
    - Ensure reset_date column is properly referenced with table alias

  2. Security
    - Maintain existing security context for authenticated users
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_ai_usage_stats(uuid);

-- Recreate the function with proper column qualification
CREATE OR REPLACE FUNCTION get_ai_usage_stats(p_user_id uuid)
RETURNS TABLE (
  requests_used integer,
  requests_limit integer,
  requests_remaining integer,
  reset_date date
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(limits.requests_used, 0) as requests_used,
    COALESCE(limits.requests_limit, 50) as requests_limit,
    GREATEST(0, COALESCE(limits.requests_limit, 50) - COALESCE(limits.requests_used, 0)) as requests_remaining,
    COALESCE(limits.reset_date, CURRENT_DATE) as reset_date
  FROM ai_usage_limits limits
  WHERE limits.user_id = p_user_id 
    AND limits.reset_date = CURRENT_DATE
  
  UNION ALL
  
  SELECT 
    0 as requests_used,
    50 as requests_limit,
    50 as requests_remaining,
    CURRENT_DATE as reset_date
  WHERE NOT EXISTS (
    SELECT 1 
    FROM ai_usage_limits limits
    WHERE limits.user_id = p_user_id 
      AND limits.reset_date = CURRENT_DATE
  )
  
  LIMIT 1;
END;
$$;