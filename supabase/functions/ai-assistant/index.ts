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

    if (!usageData) {
      return new Response(
        JSON.stringify({ 
          error: 'Has alcanzado el límite de 50 consultas diarias. El límite se restablece cada día.' 
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

    if (documentContext && documentContext.length > 0) {
      contextPrompt += `\n\nDOCUMENTOS DE REFERENCIA:`
      documentContext.forEach((doc, index) => {
        contextPrompt += `\n${index + 1}. ${doc.nombre} (${doc.tipo || 'Tipo desconocido'})`
      })
    }

    if (contextPrompt) {
      contextPrompt += '\n\nUsa esta información como contexto para tu respuesta.'
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

    // Usar la API key de OpenAI
    const openaiApiKey = '***REMOVED***proj-DjmEMWLOoOj_yI7HMdvjJktARsCsfU2tK7vlZsyBgxVr7VEMWTUquWEFWPfhMI_XR0Bn3fr3dHT3BlbkFJz6y5sDPJudYj07271rY8sne6RqtUiEnuCPmjnapfrpszzhkwdwWhjJPH2o7FWIYA--LoU_jSYA'
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const openaiMessages = [
      { role: 'system', content: systemPrompt + contextPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ]

    console.log('Sending request to OpenAI with', openaiMessages.length, 'messages')

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openaiMessages,
        max_tokens: 2000,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}))
      console.error('OpenAI API Error:', errorData)
      throw new Error(errorData.error?.message || `OpenAI API error: ${openaiResponse.status}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from AI')
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
        tokens_used: openaiData.usage?.total_tokens || 0
      }
    ]

    const { error: messagesError } = await supabaseClient
      .from('ai_chat_messages')
      .insert(messagesToInsert)

    if (messagesError) {
      console.error('Error saving messages:', messagesError)
    }

    // Incrementar contador de uso
    await supabaseClient.rpc('increment_ai_usage', { p_user_id: user.id })

    // Obtener estadísticas actualizadas
    const { data: updatedStats } = await supabaseClient
      .rpc('get_ai_usage_stats', { p_user_id: user.id })

    return new Response(
      JSON.stringify({
        response: aiResponse,
        sessionId: currentSessionId,
        usage: updatedStats?.[0] || null
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