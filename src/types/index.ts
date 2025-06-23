export interface Caso {
  id: string
  titulo: string
  descripcion?: string
  estado: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
  prioridad: 'Alta' | 'Media' | 'Baja'
  cliente_id?: string
  abogado_id?: string
  created_at: string
  fecha_vencimiento?: string
  cliente?: Cliente
  abogado?: Profile
}

export interface Cliente {
  id: string
  nombre: string
  email?: string
  telefono?: string
  empresa?: string
  direccion?: string
  created_at: string
}

export interface Profile {
  id: string
  nombre: string
  apellido: string
  especialidad?: string
  telefono?: string
  created_at: string
}

export interface Documento {
  id: string
  nombre: string
  tipo?: string
  caso_id?: string
  cliente_id?: string
  url: string
  tamaño?: number
  created_at: string
  caso?: Caso
  cliente?: Cliente
}

export interface Nota {
  id: string
  titulo: string
  contenido: string
  caso_id?: string
  autor_id: string
  tags?: string[]
  created_at: string
  caso?: Caso
  autor?: Profile
}

export interface Cita {
  id: string
  titulo: string
  descripcion?: string
  fecha: string
  cliente_id?: string
  abogado_id: string
  created_at: string
  cliente?: Cliente
  abogado?: Profile
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  documentContext?: string[]
}