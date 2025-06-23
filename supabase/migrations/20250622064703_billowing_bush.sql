/*
  # Notes and Tags System

  1. New Tables
    - `tags` - Stores all available tags
    - `notas` - Enhanced notes table with rich text content
    - `nota_tags` - Many-to-many relationship between notes and tags
    - `documento_tags` - Many-to-many relationship between documents and tags
    - `documentos` - Documents table for file management

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  color text DEFAULT '#89b4fa',
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nombre, user_id)
);

-- Create notas table
CREATE TABLE IF NOT EXISTS notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  contenido jsonb NOT NULL DEFAULT '{}',
  contenido_texto text,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  is_favorita boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documentos table
CREATE TABLE IF NOT EXISTS documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  tipo text,
  tamaño bigint,
  url text NOT NULL,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create nota_tags junction table
CREATE TABLE IF NOT EXISTS nota_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid REFERENCES notas(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(nota_id, tag_id)
);

-- Create documento_tags junction table
CREATE TABLE IF NOT EXISTS documento_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id uuid REFERENCES documentos(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(documento_id, tag_id)
);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nota_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE documento_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for tags
CREATE POLICY "Users can read own tags"
  ON tags FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create policies for notas
CREATE POLICY "Users can read own notes"
  ON notas FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notes"
  ON notas FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes"
  ON notas FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notes"
  ON notas FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create policies for documentos
CREATE POLICY "Users can read own documents"
  ON documentos FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own documents"
  ON documentos FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own documents"
  ON documentos FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own documents"
  ON documentos FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Create policies for nota_tags
CREATE POLICY "Users can read tags of own notes"
  ON nota_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notas 
      WHERE notas.id = nota_tags.nota_id 
      AND notas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags to own notes"
  ON nota_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notas 
      WHERE notas.id = nota_tags.nota_id 
      AND notas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from own notes"
  ON nota_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM notas 
      WHERE notas.id = nota_tags.nota_id 
      AND notas.user_id = auth.uid()
    )
  );

-- Create policies for documento_tags
CREATE POLICY "Users can read tags of own documents"
  ON documento_tags FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documentos 
      WHERE documentos.id = documento_tags.documento_id 
      AND documentos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tags to own documents"
  ON documento_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM documentos 
      WHERE documentos.id = documento_tags.documento_id 
      AND documentos.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from own documents"
  ON documento_tags FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM documentos 
      WHERE documentos.id = documento_tags.documento_id 
      AND documentos.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER notas_updated_at
  BEFORE UPDATE ON notas
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER documentos_updated_at
  BEFORE UPDATE ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notas_user_id ON notas(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_caso_id ON notas(caso_id);
CREATE INDEX IF NOT EXISTS idx_notas_cliente_id ON notas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notas_created_at ON notas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_caso_id ON documentos(caso_id);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente_id ON documentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_nota_tags_nota_id ON nota_tags(nota_id);
CREATE INDEX IF NOT EXISTS idx_nota_tags_tag_id ON nota_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_documento_tags_documento_id ON documento_tags(documento_id);
CREATE INDEX IF NOT EXISTS idx_documento_tags_tag_id ON documento_tags(tag_id);

-- Create full-text search index for notes
CREATE INDEX IF NOT EXISTS idx_notas_contenido_texto ON notas USING gin(to_tsvector('spanish', contenido_texto));