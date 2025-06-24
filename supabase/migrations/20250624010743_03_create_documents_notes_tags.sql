-- ============================================
-- Migración 03: Documentos, Notas y Tags
-- ============================================

-- Tabla de documentos (incluye imágenes)
CREATE TABLE documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text,
  tamaño bigint,
  url text NOT NULL,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de tags
CREATE TABLE tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text DEFAULT '#89b4fa',
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nombre, user_id)
);

-- Tabla de notas con contenido JSONB para TipTap
CREATE TABLE notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  contenido jsonb NOT NULL DEFAULT '{}',
  contenido_texto text, -- Para búsqueda full-text
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_favorita boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla de relación nota-tags
CREATE TABLE nota_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES notas(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nota_id, tag_id)
);

-- Tabla de relación documento-tags
CREATE TABLE documento_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid NOT NULL REFERENCES documentos(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(documento_id, tag_id)
);

-- Habilitar RLS en todas las tablas
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE nota_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_tags ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos
CREATE POLICY "Users can manage own documents"
  ON documentos
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para tags
CREATE POLICY "Users can manage own tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para notas
CREATE POLICY "Users can manage own notes"
  ON notas
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Políticas RLS para nota_tags
CREATE POLICY "Users can manage tags of own notes"
  ON nota_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notas 
      WHERE notas.id = nota_tags.nota_id 
      AND notas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notas 
      WHERE notas.id = nota_tags.nota_id 
      AND notas.user_id = auth.uid()
    )
  );

-- Políticas RLS para documento_tags
CREATE POLICY "Users can manage tags of own documents"
  ON documento_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documentos 
      WHERE documentos.id = documento_tags.documento_id 
      AND documentos.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documentos 
      WHERE documentos.id = documento_tags.documento_id 
      AND documentos.user_id = auth.uid()
    )
  );

-- Triggers para updated_at
CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Índices para performance
CREATE INDEX idx_documentos_user_id ON documentos(user_id);
CREATE INDEX idx_documentos_caso_id ON documentos(caso_id);
CREATE INDEX idx_documentos_cliente_id ON documentos(cliente_id);
CREATE INDEX idx_documentos_created_at ON documentos(created_at DESC);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_nombre ON tags(nombre);

CREATE INDEX idx_notas_user_id ON notas(user_id);
CREATE INDEX idx_notas_caso_id ON notas(caso_id);
CREATE INDEX idx_notas_cliente_id ON notas(cliente_id);
CREATE INDEX idx_notas_created_at ON notas(created_at DESC);
CREATE INDEX idx_notas_is_favorita ON notas(is_favorita);

CREATE INDEX idx_nota_tags_nota_id ON nota_tags(nota_id);
CREATE INDEX idx_nota_tags_tag_id ON nota_tags(tag_id);

CREATE INDEX idx_documento_tags_documento_id ON documento_tags(documento_id);
CREATE INDEX idx_documento_tags_tag_id ON documento_tags(tag_id);

-- Índice de búsqueda full-text para notas (español)
CREATE INDEX idx_notas_contenido_texto ON notas USING gin(to_tsvector('spanish', contenido_texto));
