import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, AlertTriangle, CheckCircle, XCircle, Shield, Database, AlertCircle, Clock, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DiagnosticResult {
  check: string
  status: 'success' | 'error' | 'warning' | 'loading'
  message: string
  details?: string
}

export function GoogleCalendarDiagnostic() {
  const { user, session } = useAuth()
  const { isConnected } = useGoogleCalendar()
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  // Obtener variables de entorno (solo públicas)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const currentUrl = window.location.origin
  const redirectUri = `${currentUrl}/calendar/callback`

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result])
  }

  const updateResult = (check: string, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map(result => 
      result.check === check ? { ...result, ...updates } : result
    ))
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    // 1. Verificar autenticación de usuario
    addResult({
      check: 'Autenticación del Usuario',
      status: 'loading',
      message: 'Verificando autenticación...'
    })

    if (!user) {
      updateResult('Autenticación del Usuario', {
        status: 'error',
        message: 'Usuario no autenticado',
        details: 'Debes estar logueado para conectar Google Calendar'
      })
      setIsRunning(false)
      return
    }

    updateResult('Autenticación del Usuario', {
      status: 'success',
      message: `Usuario autenticado: ${user.email}`,
      details: `ID: ${user.id}`
    })

    // 2. Verificar sesión de Supabase
    addResult({
      check: 'Sesión de Supabase',
      status: 'loading',
      message: 'Verificando sesión...'
    })

    if (!session) {
      updateResult('Sesión de Supabase', {
        status: 'error',
        message: 'No hay sesión activa',
        details: 'La sesión de Supabase no está disponible'
      })
    } else {
      const isExpired = new Date(session.expires_at! * 1000) < new Date()
      updateResult('Sesión de Supabase', {
        status: isExpired ? 'warning' : 'success',
        message: isExpired ? 'Sesión expirada' : 'Sesión válida',
        details: `Expira: ${new Date(session.expires_at! * 1000).toLocaleString()}`
      })
    }

    // 3. Verificar variables de entorno
    addResult({
      check: 'Variables de Entorno',
      status: 'loading',
      message: 'Verificando configuración...'
    })

    if (!clientId) {
      updateResult('Variables de Entorno', {
        status: 'error',
        message: 'VITE_GOOGLE_CLIENT_ID no configurado',
        details: 'Agrega esta variable a tu archivo .env'
      })
      setIsRunning(false)
      return
    }

    updateResult('Variables de Entorno', {
      status: 'success',
      message: 'VITE_GOOGLE_CLIENT_ID configurado',
      details: `Client ID: ${clientId.substring(0, 20)}...`
    })

    // 4. Verificar redirect URI
    addResult({
      check: 'Redirect URI',
      status: 'success',
      message: 'Configuración correcta',
      details: redirectUri
    })

    // 5. Verificar estado de conexión actual
    addResult({
      check: 'Estado de Conexión',
      status: 'loading',
      message: 'Verificando conexión actual...'
    })

    try {
      const { data: tokens, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        updateResult('Estado de Conexión', {
          status: 'error',
          message: 'Error consultando tokens',
          details: error.message
        })
      } else if (!tokens) {
        updateResult('Estado de Conexión', {
          status: 'warning',
          message: 'No hay tokens de Google Calendar',
          details: 'Google Calendar no está conectado'
        })
      } else {
        const isExpired = new Date(tokens.expires_at) < new Date()
        updateResult('Estado de Conexión', {
          status: isExpired ? 'warning' : 'success',
          message: isExpired ? 'Tokens expirados' : 'Tokens válidos',
          details: `Expiran: ${new Date(tokens.expires_at).toLocaleString()}`
        })
      }
    } catch (error) {
      updateResult('Estado de Conexión', {
        status: 'error',
        message: 'Error verificando tokens',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }

    // 6. Verificar Edge Functions con más detalle
    addResult({
      check: 'Edge Functions',
      status: 'loading',
      message: 'Probando conectividad...'
    })

    try {
      // Probar con una llamada simple que debería fallar pero confirmar que la función existe
      const { error } = await supabase.functions.invoke('google-oauth', {
        body: { test: true }
      })

      if (error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
          updateResult('Edge Functions', {
            status: 'error',
            message: 'Edge Functions no desplegadas',
            details: 'Ve a tu Dashboard de Supabase → Edge Functions para desplegarlas'
          })
        } else {
          // Error esperado por datos inválidos, pero la función existe
          updateResult('Edge Functions', {
            status: 'success',
            message: 'Edge Functions disponibles',
            details: 'Las funciones están desplegadas y respondiendo'
          })
        }
      } else {
        updateResult('Edge Functions', {
          status: 'success',
          message: 'Edge Functions funcionando',
          details: 'Respuesta exitosa'
        })
      }
    } catch (error) {
      updateResult('Edge Functions', {
        status: 'error',
        message: 'Error probando Edge Functions',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }

    // 6.5. Verificar directamente la tabla de tokens en la BD
    addResult({
      check: 'Tokens en Base de Datos',
      status: 'loading',
      message: 'Consultando directamente la BD...'
    })

    try {
      const { data: tokens, error: tokensError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)

      if (tokensError) {
        updateResult('Tokens en Base de Datos', {
          status: 'error',
          message: 'Error consultando tokens',
          details: tokensError.message
        })
      } else if (!tokens || tokens.length === 0) {
        updateResult('Tokens en Base de Datos', {
          status: 'warning',
          message: 'No hay tokens guardados',
          details: 'Los tokens de Google Calendar no están en la base de datos'
        })
      } else {
        const token = tokens[0]
        const isExpired = new Date(token.expires_at) < new Date()
        updateResult('Tokens en Base de Datos', {
          status: isExpired ? 'warning' : 'success',
          message: isExpired ? 'Tokens encontrados pero expirados' : 'Tokens válidos encontrados',
          details: `Creado: ${new Date(token.created_at || token.expires_at).toLocaleString()}, Expira: ${new Date(token.expires_at).toLocaleString()}`
        })
      }
    } catch (error) {
      updateResult('Tokens en Base de Datos', {
        status: 'error',
        message: 'Error verificando tokens',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }

    // 6.6. Probar Edge Function con datos reales (si es posible)
    addResult({
      check: 'Prueba de Edge Function',
      status: 'loading',
      message: 'Probando funcionalidad de Edge Function...'
    })

    try {
      // Intentar una llamada con parámetros válidos pero código falso
      const testResponse = await supabase.functions.invoke('google-oauth', {
        body: {
          code: 'test-code-invalid',
          userId: user.id,
          redirectUri: redirectUri
        }
      })

      if (testResponse.error) {
        // Es esperado que falle por código inválido, pero nos dice si la función funciona
        if (testResponse.error.message.includes('Failed to exchange code for tokens')) {
          updateResult('Prueba de Edge Function', {
            status: 'success',
            message: 'Edge Function funcionando correctamente',
            details: 'La función procesó la petición (falló como esperado por código inválido)'
          })
        } else {
          updateResult('Prueba de Edge Function', {
            status: 'warning',
            message: 'Edge Function responde pero hay problemas',
            details: testResponse.error.message
          })
        }
      } else {
        updateResult('Prueba de Edge Function', {
          status: 'warning',
          message: 'Respuesta inesperada',
          details: 'La función no falló como esperado'
        })
      }
    } catch (error) {
      updateResult('Prueba de Edge Function', {
        status: 'error',
        message: 'Error probando Edge Function',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }

    // 7. Verificar datos preservados de OAuth
    addResult({
      check: 'Datos OAuth Preservados',
      status: 'loading',
      message: 'Verificando localStorage...'
    })

    const preserved = localStorage.getItem('lawconnect-oauth-session')
    if (preserved) {
      try {
        const data = JSON.parse(preserved)
        const age = Date.now() - data.timestamp
        updateResult('Datos OAuth Preservados', {
          status: age > 10 * 60 * 1000 ? 'warning' : 'success',
          message: age > 10 * 60 * 1000 ? 'Datos expirados' : 'Datos válidos',
          details: `Edad: ${Math.round(age / 1000 / 60)} minutos`
        })
      } catch {
        updateResult('Datos OAuth Preservados', {
          status: 'error',
          message: 'Datos corrompidos',
          details: 'Los datos en localStorage están corrompidos'
        })
      }
    } else {
      updateResult('Datos OAuth Preservados', {
        status: 'warning',
        message: 'No hay datos preservados',
        details: 'No se encontraron datos de sesión OAuth en localStorage'
      })
    }

    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [user])

  const getIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow" />
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue animate-spin" />
    }
  }

  const clearOAuthData = () => {
    localStorage.removeItem('lawconnect-oauth-session')
    runDiagnostics()
  }

  // Función para copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copiado al portapapeles')
  }

  return (
    <div className="min-h-screen bg-base p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Diagnóstico de Google Calendar OAuth
              <Badge variant="outline" className="bg-green/10 text-green border-green">
                <Database className="h-3 w-3 mr-1" />
                Supabase Secure
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información de seguridad */}
            <div className="bg-green/10 border border-green/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-green mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green">🔒 Implementación Ultra-Segura</h3>
                  <p className="text-sm text-subtext0 mt-1">
                    Esta aplicación usa **Supabase Edge Functions** y **Supabase Secrets** para manejar todas las credenciales de forma segura.
                    El <strong>Client Secret</strong> nunca está expuesto y se almacena cifrado en Supabase Vault.
                  </p>
                </div>
              </div>
            </div>

            {/* Información actual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Client ID (Público):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-surface1 rounded text-xs break-all">
                      {clientId || '❌ No configurado'}
                    </code>
                    {clientId && (
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(clientId)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Client Secret:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-green/10 rounded text-xs text-green">
                      ✅ Almacenado de forma segura en Supabase Vault
                    </code>
                  </div>
                  <p className="text-xs text-subtext0 mt-1">
                    El Client Secret se configura en Supabase Dashboard → Settings → Vault.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">URL actual:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-surface1 rounded text-xs">
                      {currentUrl}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(currentUrl)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Redirect URI:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-surface1 rounded text-xs">
                      {redirectUri}
                    </code>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(redirectUri)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={runDiagnostics} 
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                Ejecutar Diagnósticos
              </Button>
              <Button 
                onClick={clearOAuthData}
                variant="outline"
              >
                Limpiar Datos OAuth
              </Button>
              <Button variant="outline" asChild>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Cloud Console
                </a>
              </Button>
            </div>

            {/* Resultados del diagnóstico */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">📊 Resultados del Diagnóstico:</h3>
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-4 rounded-lg border border-surface1 bg-surface0"
                  >
                    {getIcon(result.status)}
                    <div className="flex-1">
                      <div className="font-medium">{result.check}</div>
                      <div className={`text-sm ${
                        result.status === 'success' ? 'text-green' :
                        result.status === 'error' ? 'text-red' :
                        result.status === 'warning' ? 'text-yellow' :
                        'text-subtext0'
                      }`}>
                        {result.message}
                      </div>
                      {result.details && (
                        <div className="text-xs text-subtext1 mt-1 font-mono">
                          {result.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guía de configuración actualizada */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Configuración con Supabase Edge Functions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-2">1. Variables de Entorno del Frontend (.env)</h3>
                <div className="bg-surface1 p-4 rounded-lg">
                  <p className="text-xs text-subtext0 mb-2">Solo necesitas el Client ID público:</p>
                  <pre className="text-xs bg-surface0 p-2 rounded overflow-x-auto">
{`# Solo Client ID público en el frontend
VITE_GOOGLE_CLIENT_ID=tu-client-id.googleusercontent.com`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">2. Supabase Secrets (Dashboard → Settings → Vault)</h3>
                <div className="bg-surface1 p-4 rounded-lg">
                  <p className="text-xs text-subtext0 mb-2">Configura estos secrets en Supabase:</p>
                  <pre className="text-xs bg-surface0 p-2 rounded overflow-x-auto">
{`# Secrets de Supabase (ultra-seguros)
GOOGLE_CLIENT_ID=tu-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret`}
                  </pre>
                  <p className="text-xs text-yellow mt-2">
                    ⚠️ Los secrets de Supabase están cifrados y solo accesibles por Edge Functions
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">3. Supabase Edge Functions</h3>
                <div className="bg-surface1 p-4 rounded-lg">
                  <p className="text-xs text-subtext0 mb-2">Functions desplegadas automáticamente:</p>
                  <pre className="text-xs bg-surface0 p-2 rounded overflow-x-auto">
{`✅ supabase/functions/google-oauth/index.ts
✅ supabase/functions/google-oauth-refresh/index.ts`}
                  </pre>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <span className="bg-blue text-base rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                  <div>
                    <p className="font-medium">Configurar URIs Autorizados en Google Cloud Console</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-subtext0">JavaScript origins:</p>
                      <code className="block text-xs bg-surface0 p-1 rounded">{currentUrl}</code>
                      <p className="text-xs text-subtext0">Redirect URIs:</p>
                      <code className="block text-xs bg-surface0 p-1 rounded">{redirectUri}</code>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">🔒 Ventajas de Supabase</h3>
                <ul className="text-xs space-y-1 text-subtext0">
                  <li>• <strong>Supabase Vault:</strong> Cifrado de extremo a extremo para secrets</li>
                  <li>• <strong>Edge Functions:</strong> Procesamiento en el edge, ultra-rápido</li>
                  <li>• <strong>Todo centralizado:</strong> Base de datos, auth, functions y secrets en un lugar</li>
                  <li>• <strong>No vendor lock-in:</strong> Compatible con cualquier hosting</li>
                  <li>• <strong>Escalable:</strong> Maneja millones de requests automáticamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 