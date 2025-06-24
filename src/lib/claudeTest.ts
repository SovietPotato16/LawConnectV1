// ✅ Test de funcionamiento de Claude API
import { supabase } from './supabase'

export async function testClaudeAPI() {
  console.log('🧪 Probando conexión con Claude...')
  
  try {
    // Obtener sesión del usuario
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('Usuario no autenticado')
    }

    // Enviar mensaje de prueba a Claude
    const response = await fetch(`${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hola Claude, soy un abogado usando LawConnect. ¿Puedes confirmar que estás funcionando correctamente?',
        sessionTitle: 'Test de Claude API'
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error de conexión' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('✅ Claude responde correctamente:')
    console.log(data.response)
    console.log('📊 Estadísticas de uso:', data.usage)
    
    return {
      success: true,
      response: data.response,
      sessionId: data.sessionId,
      usage: data.usage
    }
    
  } catch (error) {
    console.error('❌ Error al probar Claude:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Función para usar en consola del navegador durante desarrollo
export async function runClaudeTest() {
  const result = await testClaudeAPI()
  
  if (result.success) {
    console.log('🎉 ¡Claude configurado correctamente!')
    console.log('📝 Respuesta:', result.response)
  } else {
    console.log('🚨 Error en configuración de Claude:', result.error)
  }
  
  return result
}

// Exportar para uso en desarrollo
if (typeof window !== 'undefined') {
  (window as any).testClaude = runClaudeTest
} 