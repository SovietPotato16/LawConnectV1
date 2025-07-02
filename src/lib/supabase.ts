import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Validate that the URL is properly formatted
if (!supabaseUrl.startsWith('https://') || supabaseUrl.includes('your-project-ref')) {
  throw new Error('Invalid Supabase URL. Please provide a valid Supabase project URL in your .env file.')
}

// Función para determinar si debemos detectar sesión en URL
const shouldDetectSessionInUrl = () => {
  const currentPath = window.location.pathname
  const currentSearch = window.location.search
  
  // Solo detectar sesión en URLs para funcionalidades específicas de Supabase
  const supabaseAuthPaths = [
    '/confirm-email',
    '/reset-password', 
    '/verify'
  ]
  
  // NO detectar en el callback de Google Calendar
  if (currentPath === '/calendar/callback') {
    console.log('🚫 Evitando detectSessionInUrl para Google Calendar callback')
    return false
  }
  
  // Solo detectar si estamos en una página de auth de Supabase
  const isSupabaseAuthPage = supabaseAuthPaths.some(path => currentPath.includes(path))
  
  // O si hay parámetros típicos de Supabase auth en la URL
  const hasSupabaseAuthParams = currentSearch.includes('access_token') || 
                                 currentSearch.includes('refresh_token') ||
                                 currentSearch.includes('token_hash')
  
  return isSupabaseAuthPage || hasSupabaseAuthParams
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: shouldDetectSessionInUrl(), // ✅ Detección inteligente
    flowType: 'pkce',
    // Configuración adicional para OAuth flows
    storageKey: 'lawconnect-auth-token', // Clave única para evitar conflictos
    storage: window.localStorage, // Usar localStorage explícitamente
    debug: import.meta.env.DEV, // Debug en desarrollo
  }
})

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre: string
          apellido: string
          especialidad: string | null
          telefono: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre: string
          apellido: string
          especialidad?: string | null
          telefono?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          apellido?: string
          especialidad?: string | null
          telefono?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          email: string | null
          telefono: string | null
          empresa: string | null
          direccion: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          email?: string | null
          telefono?: string | null
          empresa?: string | null
          direccion?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          email?: string | null
          telefono?: string | null
          empresa?: string | null
          direccion?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      casos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          estado: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
          prioridad: 'Alta' | 'Media' | 'Baja'
          cliente_id: string | null
          user_id: string
          fecha_vencimiento: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion?: string | null
          estado?: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
          prioridad?: 'Alta' | 'Media' | 'Baja'
          cliente_id?: string | null
          user_id: string
          fecha_vencimiento?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string | null
          estado?: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
          prioridad?: 'Alta' | 'Media' | 'Baja'
          cliente_id?: string | null
          user_id?: string
          fecha_vencimiento?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documentos: {
        Row: {
          id: string
          nombre: string
          tipo: string | null
          tamaño: number | null
          url: string
          caso_id: string | null
          cliente_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo?: string | null
          tamaño?: number | null
          url: string
          caso_id?: string | null
          cliente_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo?: string | null
          tamaño?: number | null
          url?: string
          caso_id?: string | null
          cliente_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      notas: {
        Row: {
          id: string
          titulo: string
          contenido: object
          contenido_texto: string | null
          caso_id: string | null
          cliente_id: string | null
          user_id: string
          is_favorita: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          contenido?: object
          contenido_texto?: string | null
          caso_id?: string | null
          cliente_id?: string | null
          user_id: string
          is_favorita?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          contenido?: object
          contenido_texto?: string | null
          caso_id?: string | null
          cliente_id?: string | null
          user_id?: string
          is_favorita?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          nombre: string
          color: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          color?: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          color?: string
          user_id?: string
          created_at?: string
        }
      }
      calendar_events: {
        Row: {
          id: string
          google_event_id: string | null
          user_id: string
          titulo: string
          descripcion: string | null
          fecha_inicio: string
          fecha_fin: string
          ubicacion: string | null
          cliente_id: string | null
          caso_id: string | null
          is_synced_with_google: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          google_event_id?: string | null
          user_id: string
          titulo: string
          descripcion?: string | null
          fecha_inicio: string
          fecha_fin: string
          ubicacion?: string | null
          cliente_id?: string | null
          caso_id?: string | null
          is_synced_with_google?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          google_event_id?: string | null
          user_id?: string
          titulo?: string
          descripcion?: string | null
          fecha_inicio?: string
          fecha_fin?: string
          ubicacion?: string | null
          cliente_id?: string | null
          caso_id?: string | null
          is_synced_with_google?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      ai_chat_sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          is_favorite: boolean
          context_documents: object
          context_case_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          is_favorite?: boolean
          context_documents?: object
          context_case_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          is_favorite?: boolean
          context_documents?: object
          context_case_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ai_chat_messages: {
        Row: {
          id: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          context_used: object
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          role: 'user' | 'assistant'
          content: string
          context_used?: object
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          role?: 'user' | 'assistant'
          content?: string
          context_used?: object
          tokens_used?: number | null
          created_at?: string
        }
      }
      ai_usage_limits: {
        Row: {
          id: string
          user_id: string
          requests_used: number
          requests_limit: number
          reset_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          requests_used?: number
          requests_limit?: number
          reset_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          requests_used?: number
          requests_limit?: number
          reset_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      imagenes: {
        Row: {
          id: string
          nombre: string
          tipo: string | null
          tamaño: number | null
          url: string
          caso_id: string | null
          nota_id: string | null
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          tipo?: string | null
          tamaño?: number | null
          url: string
          caso_id?: string | null
          nota_id?: string | null
          user_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          tipo?: string | null
          tamaño?: number | null
          url?: string
          caso_id?: string | null
          nota_id?: string | null
          user_id?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}