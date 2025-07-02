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
  contenido: object
  contenido_texto?: string
  caso_id?: string
  cliente_id?: string
  user_id: string
  is_favorita?: boolean
  created_at: string
  updated_at?: string
  caso?: Caso
  cliente?: Cliente
  autor?: Profile
  tags?: Tag[]
}

export interface CalendarEvent {
  id: string
  google_event_id?: string
  titulo: string
  descripcion?: string
  fecha_inicio: string
  fecha_fin: string
  ubicacion?: string
  cliente_id?: string
  caso_id?: string
  user_id: string
  is_synced_with_google?: boolean
  created_at: string
  updated_at?: string
  cliente?: Cliente
  caso?: Caso
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

export interface Tag {
  id: string
  nombre: string
  color: string
  user_id: string
  created_at: string
}

export interface NotaTag {
  id: string
  nota_id: string
  tag_id: string
  created_at: string
}

export interface DocumentoTag {
  id: string
  documento_id: string
  tag_id: string
  created_at: string
}

export interface Imagen {
  id: string
  nombre: string
  tipo?: string
  tamaño?: number
  url: string
  caso_id?: string
  nota_id?: string
  user_id: string
  created_at: string
  updated_at?: string
}

export interface AIUsageLimit {
  id: string
  user_id: string
  requests_used: number
  requests_limit: number
  reset_date: string
  created_at: string
  updated_at: string
}

export interface AIChatSession {
  id: string
  user_id: string
  title: string
  description?: string
  is_favorite: boolean
  context_documents: any[]
  context_case_id?: string
  created_at: string
  updated_at: string
}

export interface AIChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  context_used: object
  tokens_used?: number
  created_at: string
}

export interface EmailReminder {
  id: string
  user_id: string
  cliente_id?: string
  caso_id?: string
  subject: string
  message: string
  recipient_email: string
  scheduled_for: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message?: string
  created_at: string
}

export interface GoogleCalendarToken {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  scope: string
  created_at: string
  updated_at: string
}

export interface EventAttendee {
  id: string
  event_id: string
  email: string
  nombre?: string
  status: string
  created_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  documentContext?: string[]
}

export interface Factura {
  id: string
  user_id: string
  cliente_id?: string
  numero_factura: string
  fecha_emision: string
  fecha_vencimiento?: string
  concepto: string
  tarifa_por_hora?: number
  horas_trabajadas?: number
  monto_total: number
  monto_pagado: number
  estado: 'pendiente' | 'pagada' | 'pagada_parcialmente'
  notas?: string
  created_at: string
  updated_at: string
  cliente?: Cliente
}