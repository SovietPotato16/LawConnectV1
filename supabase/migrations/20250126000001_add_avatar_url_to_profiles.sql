-- ============================================
-- Migración: Añadir campo avatar_url a profiles
-- ============================================

-- Añadir campo avatar_url a la tabla profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Comentario explicativo
COMMENT ON COLUMN profiles.avatar_url IS 'URL de la imagen de perfil del usuario en Supabase Storage'; 