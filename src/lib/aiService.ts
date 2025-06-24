import { supabase } from './supabase'

export interface AIUsageStats {
  requests_used: number
  requests_limit: number
  requests_remaining: number
  reset_date: string
}

export interface ChatSession {
  id: string
  title: string
  description?: string
  is_favorite: boolean
  context_documents: Array<{ id: string; nombre: string }>
  context_case_id?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  context_used: {
    documents?: Array<{ id: string; nombre: string }>
    case?: { id: string; titulo: string }
  }
  tokens_used?: number
  created_at: string
}

export interface DocumentContext {
  id: string
  nombre: string
  tipo: string
  contenido?: string // Para archivos subidos directamente
}

export interface CaseContext {
  id: string
  titulo: string
  descripcion?: string
  estado: string
  prioridad: string
}

export class AIService {
  static async sendMessage(
    message: string,
    sessionId?: string,
    sessionTitle?: string,
    documentContext?: DocumentContext[],
    caseContext?: CaseContext
  ): Promise<{
    response: string
    sessionId: string
    usage: AIUsageStats | null
  }> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No estás autenticado')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        sessionTitle,
        documentContext,
        caseContext
      })
    })

    const responseData = await response.json()

    if (!response.ok) {
      if (response.status === 429 || responseData.limitReached) {
        throw new Error(responseData.error || 'Has alcanzado el límite diario de consultas')
      }
      throw new Error(responseData.error || 'Error al comunicarse con la IA')
    }

    console.log('AI Service response:', responseData)

    return responseData
  }

  static async getUsageStats(): Promise<AIUsageStats | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No estás autenticado')
      }

      console.log('🔍 DEBUG: Solicitando estadísticas para usuario:', user.id)

      const { data, error } = await supabase
        .rpc('get_ai_usage_stats', { p_user_id: user.id })

      if (error) {
        console.error('❌ Error getting usage stats:', error)
        throw error
      }

      console.log('📊 DEBUG: Datos RAW recibidos de BD:', data)
      console.log('📊 DEBUG: Primer elemento:', data?.[0])

      return data?.[0] || null
    } catch (error) {
      console.error('❌ Error in getUsageStats:', error)
      // Solo retornar valores por defecto si es un error menor, pero loggearlo claramente
      console.warn('⚠️ Retornando valores por defecto debido a error')
      return {
        requests_used: 0,
        requests_limit: 50,
        requests_remaining: 50,
        reset_date: new Date().toISOString().split('T')[0]
      }
    }
  }

  // 🔧 Función temporal de debugging para verificar datos directos de BD
  static async debugUsageStats(): Promise<any> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No estás autenticado')
      }

      console.log('🔍 DEBUG: Verificando datos directos de la tabla para usuario:', user.id)

      // Consulta directa a la tabla
      const { data: directData, error: directError } = await supabase
        .from('ai_usage_limits')
        .select('*')
        .eq('user_id', user.id)
        .eq('reset_date', new Date().toISOString().split('T')[0])

      console.log('📊 DEBUG: Datos directos de tabla ai_usage_limits:', directData)

      if (directError) {
        console.error('❌ Error en consulta directa:', directError)
      }

      // Llamar a la función de debugging de BD
      const { data: debugData, error: debugError } = await supabase
        .rpc('debug_ai_usage_stats', { p_user_id: user.id })

      console.log('📊 DEBUG: Datos de función debug_ai_usage_stats:', debugData)

      if (debugError) {
        console.error('❌ Error en función debug:', debugError)
      }

      return {
        directData,
        debugData,
        directError,
        debugError
      }
    } catch (error) {
      console.error('❌ Error en debugUsageStats:', error)
      return { error }
    }
  }

  static async getChatSessions(): Promise<ChatSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No estás autenticado')
      }

      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error getting chat sessions:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getChatSessions:', error)
      return []
    }
  }

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error getting chat messages:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getChatMessages:', error)
      return []
    }
  }

  static async updateChatSession(
    sessionId: string, 
    updates: Partial<Pick<ChatSession, 'title' | 'description' | 'is_favorite'>>
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .update(updates)
      .eq('id', sessionId)

    if (error) {
      throw new Error('Error actualizando sesión de chat')
    }
  }

  static async deleteChatSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_chat_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      throw new Error('Error eliminando sesión de chat')
    }
  }
}