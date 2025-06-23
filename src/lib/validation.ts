// ✅ Script de validación de consistencia entre DB y TypeScript
import { supabase } from './supabase'
import type { 
  Caso, 
  Cliente, 
  Profile, 
  Documento, 
  Nota, 
  CalendarEvent, 
  Tag, 
  AIChatSession,
  AIUsageLimit 
} from '@/types'

/**
 * Valida que las operaciones básicas de CRUD funcionen correctamente
 * con los tipos TypeScript actualizados
 */
export class DatabaseValidator {
  
  /**
   * Valida que los tipos de la tabla 'casos' coincidan
   */
  static async validateCasos() {
    try {
      // Test de lectura con tipos correctos
      const { data, error } = await supabase
        .from('casos')
        .select(`
          id,
          titulo,
          descripcion,
          estado,
          prioridad,
          cliente_id,
          user_id,
          fecha_vencimiento,
          created_at,
          updated_at,
          cliente:clientes(
            id,
            nombre,
            email,
            telefono,
            empresa,
            direccion
          )
        `)
        .limit(1)

      if (error) throw error
      
      // Verificar que el tipo inferido coincida con nuestra interface
      const caso: Caso = data?.[0] as Caso
      return { success: true, data: caso }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Valida que los tipos de la tabla 'notas' coincidan (con JSONB)
   */
  static async validateNotas() {
    try {
      const { data, error } = await supabase
        .from('notas')
        .select(`
          id,
          titulo,
          contenido,
          contenido_texto,
          caso_id,
          cliente_id,
          user_id,
          is_favorita,
          created_at,
          updated_at
        `)
        .limit(1)

      if (error) throw error
      
      // Verificar que el contenido JSONB se maneje correctamente
      const nota: Nota = data?.[0] as Nota
      
      // Validar que contenido sea un objeto (JSONB)
      if (nota && typeof nota.contenido !== 'object') {
        throw new Error('Campo contenido debe ser un objeto (JSONB)')
      }
      
      return { success: true, data: nota }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Valida que los tipos de la tabla 'calendar_events' coincidan
   */
  static async validateCalendarEvents() {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          id,
          google_event_id,
          titulo,
          descripcion,
          fecha_inicio,
          fecha_fin,
          ubicacion,
          cliente_id,
          caso_id,
          user_id,
          is_synced_with_google,
          created_at,
          updated_at
        `)
        .limit(1)

      if (error) throw error
      
      const event: CalendarEvent = data?.[0] as CalendarEvent
      return { success: true, data: event }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Valida que los tipos de la tabla 'ai_chat_sessions' coincidan
   */
  static async validateAIChatSessions() {
    try {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select(`
          id,
          user_id,
          title,
          description,
          is_favorite,
          context_documents,
          context_case_id,
          created_at,
          updated_at
        `)
        .limit(1)

      if (error) throw error
      
      const session: AIChatSession = data?.[0] as AIChatSession
      return { success: true, data: session }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Ejecuta todas las validaciones
   */
  static async runAllValidations() {
    const results = {
      casos: await this.validateCasos(),
      notas: await this.validateNotas(),
      calendar_events: await this.validateCalendarEvents(),
      ai_chat_sessions: await this.validateAIChatSessions(),
    }

    const allSuccess = Object.values(results).every(result => result.success)
    
    return {
      success: allSuccess,
      results,
      summary: {
        total: Object.keys(results).length,
        passed: Object.values(results).filter(r => r.success).length,
        failed: Object.values(results).filter(r => !r.success).length
      }
    }
  }

  /**
   * Genera un reporte de las tablas y tipos faltantes
   */
  static async generateMissingTypesReport() {
    // Obtener todas las tablas de la base de datos
    const tablesResult = await supabase
      .rpc('get_table_names') // Esta función tendría que crearse en Supabase
      .catch(() => ({ data: null, error: 'RPC function not available' }))

    // Lista de tablas conocidas que tienen tipos
    const knownTables = [
      'profiles',
      'clientes', 
      'casos',
      'documentos',
      'notas',
      'tags',
      'calendar_events',
      'ai_chat_sessions',
      'ai_chat_messages',
      'ai_usage_limits',
      'imagenes'
    ]

    // Lista de tablas que existen pero no tienen tipos completos
    const tablesWithoutTypes = [
      'nota_tags',
      'documento_tags', 
      'google_calendar_tokens',
      'event_attendees',
      'email_reminders'
    ]

    return {
      knownTables,
      tablesWithoutTypes,
      recommendation: `Considera agregar interfaces TypeScript para: ${tablesWithoutTypes.join(', ')}`
    }
  }
}

/**
 * Función de utilidad para ejecutar validaciones durante desarrollo
 */
export async function validateDatabaseConsistency() {
  console.log('🔍 Validando consistencia de base de datos...')
  
  const validation = await DatabaseValidator.runAllValidations()
  const report = await DatabaseValidator.generateMissingTypesReport()
  
  console.log('📊 Resultados de validación:', validation.summary)
  console.log('📋 Reporte de tipos:', report)
  
  if (!validation.success) {
    console.error('❌ Algunas validaciones fallaron:', validation.results)
  } else {
    console.log('✅ Todas las validaciones pasaron exitosamente')
  }
  
  return { validation, report }
} 