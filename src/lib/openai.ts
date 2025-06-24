interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage?: {
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
  }
}

interface DocumentContext {
  id: string
  nombre: string
  tipo: string | null
  contenido?: string
}

interface CaseContext {
  id: string
  titulo: string
  descripcion: string | null
  estado: string
  prioridad: string
  cliente?: {
    nombre: string
  }
}

export class OpenAIService {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getSystemPrompt(): string {
    return `Eres un asistente legal especializado integrado en LawConnect, una plataforma legal moderna para abogados.

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
- Usa formato markdown para mejor legibilidad

LIMITACIONES:
- No proporciones asesoramiento legal específico sin contexto completo
- Siempre recomienda verificar con legislación local actualizada
- Indica cuando se necesita más información para dar una respuesta completa
- No reemplazas el juicio profesional del abogado

Responde siempre en español y mantén un tono profesional pero cercano.`
  }

  private buildContextPrompt(documentContext?: DocumentContext[], caseContext?: CaseContext): string {
    let contextPrompt = ''

    if (caseContext) {
      contextPrompt += `\n\nCONTEXTO DEL CASO:
- Título: ${caseContext.titulo}
- Estado: ${caseContext.estado}
- Prioridad: ${caseContext.prioridad}
${caseContext.descripcion ? `- Descripción: ${caseContext.descripcion}` : ''}
${caseContext.cliente ? `- Cliente: ${caseContext.cliente.nombre}` : ''}`
    }

    if (documentContext && documentContext.length > 0) {
      contextPrompt += `\n\nDOCUMENTOS DE REFERENCIA:`
      documentContext.forEach((doc, index) => {
        contextPrompt += `\n${index + 1}. ${doc.nombre} (${doc.tipo || 'Tipo desconocido'})`
        if (doc.contenido) {
          contextPrompt += `\n   Contenido: ${doc.contenido.substring(0, 1000)}${doc.contenido.length > 1000 ? '...' : ''}`
        }
      })
    }

    if (contextPrompt) {
      contextPrompt += '\n\nUsa esta información como contexto para tu respuesta.'
    }

    return contextPrompt
  }

  async sendMessage(
    message: string,
    conversationHistory: OpenAIMessage[] = [],
    documentContext?: DocumentContext[],
    caseContext?: CaseContext
  ): Promise<string> {
    try {
      const systemPrompt = this.getSystemPrompt()
      const contextPrompt = this.buildContextPrompt(documentContext, caseContext)
      
      const messages: OpenAIMessage[] = [
        { role: 'system', content: systemPrompt + contextPrompt },
        ...conversationHistory,
        { role: 'user', content: message }
      ]

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 2000,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data: OpenAIResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No se recibió respuesta del modelo de IA')
      }

      return data.choices[0].message.content
    } catch (error) {
      console.error('Error calling OpenAI API:', error)
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          throw new Error('API Key de OpenAI inválida. Verifica tu configuración.')
        } else if (error.message.includes('429')) {
          throw new Error('Límite de uso de la API alcanzado. Intenta más tarde.')
        } else if (error.message.includes('500')) {
          throw new Error('Error del servidor de OpenAI. Intenta más tarde.')
        }
        throw error
      }
      
      throw new Error('Error desconocido al comunicarse con la IA')
    }
  }

  async analyzeDocument(document: DocumentContext): Promise<string> {
    const analysisPrompt = `Analiza el siguiente documento legal y proporciona:

1. **Resumen ejecutivo**: Puntos clave del documento
2. **Análisis legal**: Aspectos legales relevantes
3. **Riesgos identificados**: Posibles problemas o áreas de atención
4. **Recomendaciones**: Acciones sugeridas
5. **Próximos pasos**: Qué hacer a continuación

Documento: ${document.nombre} (${document.tipo})
${document.contenido ? `Contenido: ${document.contenido}` : 'Contenido no disponible para análisis textual.'}`

    return this.sendMessage(analysisPrompt)
  }

  async suggestCaseStrategy(caseContext: CaseContext): Promise<string> {
    const strategyPrompt = `Basándote en la información del caso, proporciona una estrategia legal recomendada que incluya:

1. **Análisis de la situación**: Evaluación del caso actual
2. **Fortalezas del caso**: Puntos a favor
3. **Debilidades y riesgos**: Áreas de preocupación
4. **Estrategia recomendada**: Enfoque legal sugerido
5. **Documentación necesaria**: Qué evidencia o documentos se necesitan
6. **Timeline sugerido**: Pasos y plazos recomendados
7. **Consideraciones adicionales**: Otros factores importantes

Proporciona una estrategia práctica y accionable.`

    return this.sendMessage(strategyPrompt, [], undefined, caseContext)
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null

export function getOpenAIService(): OpenAIService | null {
  // ✅ Claude se maneja en el servidor, no necesitamos API key en frontend
  console.info('Claude API se maneja de forma segura en el servidor (Edge Functions)')
  
  // Retornar null ya que usamos Claude en servidor
  return null
}

export function isOpenAIConfigured(): boolean {
  // ✅ Siempre true ya que Claude está configurado en el servidor
  return true
}