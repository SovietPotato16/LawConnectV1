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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce'
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