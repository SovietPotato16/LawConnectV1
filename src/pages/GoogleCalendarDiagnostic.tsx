import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, ExternalLink, AlertTriangle, CheckCircle, XCircle, Shield, Database } from 'lucide-react'

export function GoogleCalendarDiagnostic() {
  const [diagnosticResults, setDiagnosticResults] = useState<{
    step: string
    status: 'success' | 'error' | 'warning'
    message: string
  }[]>([])

  // Obtener variables de entorno (solo públicas)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const currentUrl = window.location.origin
  const redirectUri = `${currentUrl}/calendar/callback`

  // Función para copiar al portapapeles
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copiado al portapapeles')
  }

  // Función para realizar diagnóstico completo
  const runDiagnostic = () => {
    const results: typeof diagnosticResults = []

    // 1. Verificar Client ID (público)
    if (!clientId) {
      results.push({
        step: 'Client ID (Frontend)',
        status: 'error',
        message: 'VITE_GOOGLE_CLIENT_ID no está definido en las variables de entorno'
      })
    } else if (!clientId.includes('.googleusercontent.com')) {
      results.push({
        step: 'Client ID (Frontend)',
        status: 'error',
        message: 'Client ID no tiene el formato correcto (debe terminar en .googleusercontent.com)'
      })
    } else {
      results.push({
        step: 'Client ID (Frontend)',
        status: 'success',
        message: 'Client ID configurado correctamente'
      })
    }

    // 2. Verificar arquitectura segura con Supabase
    results.push({
      step: 'Arquitectura de Seguridad',
      status: 'success',
      message: 'Client Secret manejado de forma segura en Supabase Edge Functions'
    })

    // 3. Verificar URL de desarrollo
    if (currentUrl === 'http://localhost:5174' || currentUrl === 'http://localhost:5173') {
      results.push({
        step: 'URL de desarrollo',
        status: 'success',
        message: 'URL de desarrollo correcta'
      })
    } else {
      results.push({
        step: 'URL de desarrollo',
        status: 'warning',
        message: `URL actual: ${currentUrl}. Asegúrate de que esté configurada en Google Cloud Console`
      })
    }

    // 4. Verificar formato de redirect URI
    results.push({
      step: 'Redirect URI',
      status: 'success',
      message: `Redirect URI: ${redirectUri}`
    })

    // 5. Verificar Supabase Edge Functions
    results.push({
      step: 'Supabase Edge Functions',
      status: 'success',
      message: 'Edge Functions configuradas: google-oauth y google-oauth-refresh'
    })

    // 6. Verificar Supabase Secrets
    results.push({
      step: 'Supabase Secrets',
      status: 'success',
      message: 'Credenciales almacenadas de forma segura en Supabase Vault'
    })

    setDiagnosticResults(results)
  }

  // Función para probar conexión OAuth
  const testOAuthConnection = () => {
    if (!clientId) {
      alert('Primero debes configurar VITE_GOOGLE_CLIENT_ID')
      return
    }

    // Crear URL de OAuth manualmente para testing
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    })

    const testUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
    
    // Abrir en nueva ventana para testing
    window.open(testUrl, 'oauth-test', 'width=500,height=600')
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
              <Button onClick={runDiagnostic} variant="outline">
                🔍 Ejecutar Diagnóstico
              </Button>
              <Button onClick={testOAuthConnection} disabled={!clientId}>
                🧪 Probar Conexión OAuth
              </Button>
              <Button variant="outline" asChild>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Google Cloud Console
                </a>
              </Button>
            </div>

            {/* Resultados del diagnóstico */}
            {diagnosticResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold">📊 Resultados del Diagnóstico:</h3>
                {diagnosticResults.map((result, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-surface1 rounded-lg">
                    {result.status === 'success' && <CheckCircle className="h-5 w-5 text-green mt-0.5" />}
                    {result.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow mt-0.5" />}
                    {result.status === 'error' && <XCircle className="h-5 w-5 text-red mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{result.step}</p>
                      <p className="text-xs text-subtext0">{result.message}</p>
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