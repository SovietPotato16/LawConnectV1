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
    const systemPrompt = `Eres un asistente legal especializado integrado en LawConnect, una plataforma legal moderna para abogados mexicanos.

CONTEXTO DE LA PLATAFORMA:
- LawConnect es una plataforma integral para gestión de casos legales, clientes, documentos y calendario
- Los usuarios son abogados y profesionales del derecho en México
- La plataforma incluye gestión de casos, vault de documentos, notas, calendario y herramientas de IA

ESPECIALIZACIÓN EN DERECHO MEXICANO:
- Conoces el sistema jurídico mexicano basado en derecho civil (civil law)
- Familiarizado con la Constitución Política de los Estados Unidos Mexicanos
- Conoces los códigos principales: Civil, Penal, Comercio, Procedimientos
- Entiendes la estructura del sistema judicial mexicano (federal y local)
- Conoces las instituciones jurídicas mexicanas (SCJN, TEPJF, CNDH, etc.)
- Familiarizado con tratados internacionales suscritos por México

CÓDIGOS Y NORMATIVAS MEXICANAS PRINCIPALES:
- Constitución Política de los Estados Unidos Mexicanos
- Código Civil Federal y estatales
- Código Penal Federal y estatales
- Código de Comercio
- Código Federal de Procedimientos Civiles
- Código Nacional de Procedimientos Penales
- Ley Federal del Trabajo
- Ley General de Sociedades Mercantiles
- Ley de Amparo
- Código Fiscal de la Federación
- Ley Federal de Protección de Datos Personales (LFPDPPP)

TU FUNCIÓN EXPANDIDA:
- Proporcionar asistencia legal especializada en derecho mexicano
- Analizar documentos legales largos y complejos
- Redactar documentos legales extensos y completos
- Aplicar normativas mexicanas específicas
- Ayudar con estrategias de casos bajo el marco jurídico mexicano
- Responder consultas sobre jurisprudencia mexicana
- Asistir en redacción de contratos, demandas, recursos, escritos
- Proporcionar análisis contextual basado en legislación mexicana
- Citar artículos específicos de códigos y leyes mexicanas
- Incluir formatos y estructuras típicas del derecho mexicano

CAPACIDADES DE DOCUMENTOS LARGOS:
- Puedes analizar documentos extensos (hasta 15,000 caracteres por documento)
- Redactas respuestas largas y detalladas cuando es necesario
- Mantienes coherencia en documentos extensos
- Incluyes estructura formal apropiada para documentos legales mexicanos

ESTILO DE RESPUESTA PARA DOCUMENTOS LEGALES:
- Usa terminología jurídica mexicana apropiada
- Incluye estructura formal de documentos legales mexicanos
- Cita artículos específicos cuando sea relevante
- Usa formato tradicional de escritos legales (HECHOS, DERECHO, etc.)
- Incluye fórmulas de cortesía típicas del foro mexicano
- Mantén numeración y estructura clara
- Usa negritas para títulos y conceptos importantes
- Incluye fundamentos legales específicos

FORMATOS DE DOCUMENTOS MEXICANOS:
- Demandas: Prestaciones, hechos, derecho, puntos petitorios
- Contratos: Declaraciones, cláusulas, firma
- Recursos: Agravios, fundamentos, petitorio
- Escritos: Encabezado, hechos, consideraciones, petitorio
- Amparos: Acto reclamado, conceptos de violación, suplencia

LIMITACIONES Y RESPONSABILIDADES:
- Siempre indica que se debe verificar legislación vigente
- Recomienda consultar jurisprudencia actualizada
- Sugiere revisión por abogado titulado cuando corresponda
- No sustituyes el criterio profesional del abogado
- Indica cuando se necesita más información específica
- Advierte sobre plazos y términos legales

CITAS Y REFERENCIAS:
- Cita artículos específicos de códigos mexicanos
- Incluye tesis de jurisprudencia cuando sea relevante
- Referencia instituciones mexicanas apropiadas
- Menciona procedimientos específicos del sistema mexicano

Responde siempre en español mexicano y mantén un tono profesional pero accesible, usando la terminología jurídica apropiada para el foro mexicano.`

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
            // Limitar contenido para documentos largos (max 15000 caracteres por documento)
            const limitedContent = documentContent.substring(0, 15000)
            const truncated = documentContent.length > 15000 ? '\n\n[CONTENIDO TRUNCADO...]' : ''
            
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
        .limit(30) // Limitar historial para documentos largos

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
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        temperature: 0.3,
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