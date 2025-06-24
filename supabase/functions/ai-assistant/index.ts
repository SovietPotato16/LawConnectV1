import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AIRequest {
  message: string
  sessionId?: string
  sessionTitle?: string
  documentContext?: Array<{
    id: string
    nombre: string
    tipo: string
    contenido?: string // Para archivos subidos directamente
  }>
  caseContext?: {
    id: string
    titulo: string
    descripcion: string
    estado: string
    prioridad: string
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const { message, sessionId, sessionTitle, documentContext, caseContext }: AIRequest = await req.json()

    // Verificar límites de uso
    const { data: usageData, error: usageError } = await supabaseClient
      .rpc('check_ai_usage_limit', { p_user_id: user.id })

    if (usageError) {
      console.error('Usage check error:', usageError)
      throw new Error('Error checking usage limits')
    }

    console.log('Usage check result:', usageData)

    if (!usageData) {
      return new Response(
        JSON.stringify({ 
          error: 'Has alcanzado el límite de 50 consultas diarias. El límite se restablece cada día.',
          limitReached: true
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Construir prompt del sistema
    const systemPrompt = `Eres un asistente legal especializado integrado en LawConnect, una plataforma legal moderna para abogados.

CONTEXTO DE LA PLATAFORMA:
- LawConnect es una plataforma integral para gestión de casos legales, clientes, documentos y calendario
- Los usuarios son abogados y profesionales del derecho
- La plataforma incluye gestión de casos, vault de documentos, notas, calendario y herramientas de IA

TU FUNCIÓN:
- Proporcionar asistencia legal especializada y práctica
- Analizar documentos legales cuando se proporcionen
- Ayudar con estrategias de casos
- Responder consultas sobre jurisprudencia y procedimientos
- Asistir en redacción de documentos legales
- Proporcionar análisis contextual basado en la información del caso

ESTILO DE RESPUESTA:
- Profesional pero accesible
- Específico y práctico
- Basado en principios legales sólidos
- Incluye recomendaciones accionables
- Cita fuentes cuando sea relevante
- Adapta el nivel de detalle según la consulta
- Usa formato markdown para mejor legibilidad (negritas, listas, etc.)

LIMITACIONES:
- No proporciones asesoramiento legal específico sin contexto completo
- Siempre recomienda verificar con legislación local actualizada
- Indica cuando se necesita más información para dar una respuesta completa
- No reemplazas el juicio profesional del abogado

Responde siempre en español y mantén un tono profesional pero cercano.`

    // Construir contexto
    let contextPrompt = ''
    
    if (caseContext) {
      contextPrompt += `\n\nCONTEXTO DEL CASO:
- Título: ${caseContext.titulo}
- Estado: ${caseContext.estado}
- Prioridad: ${caseContext.prioridad}
${caseContext.descripcion ? `- Descripción: ${caseContext.descripcion}` : ''}`
    }

    // 🔧 FIX: Obtener contenido real de los documentos (desde BD o desde archivos subidos)
    if (documentContext && documentContext.length > 0) {
      contextPrompt += `\n\nDOCUMENTOS DE REFERENCIA:`
      
      for (const doc of documentContext) {
        try {
          let documentContent = ''
          
          // 🔧 NEW: Si el documento tiene contenido directo (archivo subido), usarlo
          if (doc.contenido && doc.contenido.trim()) {
            documentContent = doc.contenido
            console.log(`Using direct content for uploaded file: ${doc.nombre} (${documentContent.length} chars)`)
          } 
          // Si no, buscar en la base de datos (documentos previamente guardados)
          else if (!doc.id.startsWith('uploaded-')) {
            const { data: docData, error: docError } = await supabaseClient
              .from('documentos')
              .select('contenido, tipo')
              .eq('id', doc.id)
              .eq('user_id', user.id)
              .single()

            if (docError) {
              console.error('Error fetching document:', docError)
              contextPrompt += `\n- ${doc.nombre} (${doc.tipo || 'Tipo desconocido'}) - Error al cargar contenido`
              continue
            }

            documentContent = docData.contenido || ''
            console.log(`Fetched content from DB for: ${doc.nombre} (${documentContent.length} chars)`)
          }

          // Usar el contenido si está disponible
          if (documentContent && documentContent.trim()) {
            // Limitar contenido para evitar exceso de tokens (max 3000 caracteres por documento)
            const limitedContent = documentContent.substring(0, 3000)
            const truncated = documentContent.length > 3000 ? '\n\n[CONTENIDO TRUNCADO...]' : ''
            
            contextPrompt += `\n\n--- DOCUMENTO: ${doc.nombre} (${doc.tipo || 'Tipo desconocido'}) ---\n${limitedContent}${truncated}\n--- FIN DOCUMENTO ---`
            console.log(`Added document content: ${doc.nombre} (${limitedContent.length} chars)`)
          } else {
            contextPrompt += `\n- ${doc.nombre} (${doc.tipo || 'Tipo desconocido'}) - Sin contenido de texto extraído`
            console.log(`No content available for document: ${doc.nombre}`)
          }

        } catch (error) {
          console.error('Error processing document:', error)
          contextPrompt += `\n- ${doc.nombre} (${doc.tipo || 'Tipo desconocido'}) - Error al procesar`
        }
      }
    }

    if (contextPrompt) {
      contextPrompt += '\n\nUsa esta información como contexto para tu respuesta. Si hay documentos con contenido, analízalos en detalle.'
    }

    // Obtener historial de conversación si hay sessionId
    let conversationHistory: Array<{ role: string; content: string }> = []
    
    if (sessionId) {
      const { data: messages } = await supabaseClient
        .from('ai_chat_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(20) // Limitar historial para no exceder tokens

      if (messages) {
        conversationHistory = messages
      }
    }

    // ✅ Usar la API key de Claude desde variables de entorno (SEGURO)
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    
    if (!claudeApiKey) {
      throw new Error('Claude API key not configured')
    }

    // ✅ Formatear mensajes para Claude API
    const claudeMessages = conversationHistory.concat([{ role: 'user', content: message }])

    console.log('Sending request to Claude with', claudeMessages.length, 'messages')

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt + contextPrompt,
        messages: claudeMessages
      })
    })

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json().catch(() => ({}))
      console.error('Claude API Error:', errorData)
      throw new Error(errorData.error?.message || `Claude API error: ${claudeResponse.status}`)
    }

    const claudeData = await claudeResponse.json()
    const aiResponse = claudeData.content?.[0]?.text

    if (!aiResponse) {
      throw new Error('No response from Claude')
    }

    // Crear o actualizar sesión de chat
    let currentSessionId = sessionId
    
    if (!currentSessionId) {
      // Crear nueva sesión
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          title: sessionTitle || message.substring(0, 50) + '...',
          context_documents: documentContext || [],
          context_case_id: caseContext?.id || null
        })
        .select()
        .single()

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        throw new Error('Error creating chat session')
      }

      currentSessionId = newSession.id
    }

    // Guardar mensajes
    const messagesToInsert = [
      {
        session_id: currentSessionId,
        role: 'user',
        content: message,
        context_used: {
          documents: documentContext || [],
          case: caseContext || null
        }
      },
      {
        session_id: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        context_used: {
          documents: documentContext || [],
          case: caseContext || null
        },
        tokens_used: claudeData.usage?.input_tokens + claudeData.usage?.output_tokens || 0
      }
    ]

    const { error: messagesError } = await supabaseClient
      .from('ai_chat_messages')
      .insert(messagesToInsert)

    if (messagesError) {
      console.error('Error saving messages:', messagesError)
    }

    // 🔧 FIX: Incrementar contador de uso y obtener estadísticas actualizadas
    let updatedStats = null
    try {
      console.log('🔢 Incrementing usage for user:', user.id)
      const { error: incrementError } = await supabaseClient.rpc('increment_ai_usage', { p_user_id: user.id })
      
      if (incrementError) {
        console.error('❌ Error incrementing usage:', incrementError)
      } else {
        console.log('✅ Successfully incremented usage for user:', user.id)
        
        // Pequeño delay para asegurar que la transacción se complete
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Ahora obtener las estadísticas actualizadas
        console.log('📊 Getting updated stats after increment...')
        const { data: statsData, error: statsError } = await supabaseClient
          .rpc('get_ai_usage_stats', { p_user_id: user.id })

        if (statsError) {
          console.error('❌ Error getting updated stats:', statsError)
        } else {
          updatedStats = statsData?.[0] || null
          console.log('✅ Updated stats after increment:', updatedStats)
        }
      }
    } catch (error) {
      console.error('❌ Error in usage tracking:', error)
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        sessionId: currentSessionId,
        usage: updatedStats
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in AI assistant:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})