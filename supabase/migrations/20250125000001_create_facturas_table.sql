-- Crear tabla de facturas
CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  concepto TEXT NOT NULL,
  tarifa_por_hora DECIMAL(10,2),
  horas_trabajadas DECIMAL(8,2),
  monto_total DECIMAL(12,2) NOT NULL,
  monto_pagado DECIMAL(12,2) DEFAULT 0,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada', 'pagada_parcialmente')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_facturas_user_id ON facturas(user_id);
CREATE INDEX idx_facturas_cliente_id ON facturas(cliente_id);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_fecha_emision ON facturas(fecha_emision);

-- Función para generar número de factura automático
CREATE OR REPLACE FUNCTION generate_invoice_number(user_uuid UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    next_number INTEGER;
    invoice_number VARCHAR(50);
BEGIN
    -- Obtener el siguiente número de factura para este usuario
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_factura FROM '\d+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM facturas 
    WHERE user_id = user_uuid
    AND numero_factura ~ '^FACT-\d+$';
    
    -- Generar el número de factura con formato FACT-XXXX
    invoice_number := 'FACT-' || LPAD(next_number::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_facturas_updated_at 
    BEFORE UPDATE ON facturas
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden ver sus propias facturas
CREATE POLICY "Users can view own facturas" ON facturas
    FOR SELECT USING (auth.uid() = user_id);

-- Política RLS: Los usuarios pueden insertar sus propias facturas
CREATE POLICY "Users can insert own facturas" ON facturas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política RLS: Los usuarios pueden actualizar sus propias facturas
CREATE POLICY "Users can update own facturas" ON facturas
    FOR UPDATE USING (auth.uid() = user_id);

-- Política RLS: Los usuarios pueden eliminar sus propias facturas
CREATE POLICY "Users can delete own facturas" ON facturas
    FOR DELETE USING (auth.uid() = user_id); 