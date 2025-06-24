-- ============================================
-- Migración: Agregar campo contenido a documentos
-- ============================================

-- Agregar campo contenido para almacenar texto extraído
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS contenido text;

-- Agregar índice para búsqueda de texto (solo si no existe)
CREATE INDEX IF NOT EXISTS idx_documentos_contenido 
ON documentos USING gin(to_tsvector('spanish', contenido));

-- Comentario explicativo
COMMENT ON COLUMN documentos.contenido IS 'Texto extraído del documento para análisis de IA y búsqueda'; 