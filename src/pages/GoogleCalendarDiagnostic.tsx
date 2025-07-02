import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Copy, Eye, EyeOff, ExternalLink, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export function GoogleCalendarDiagnostic() {
  const [showSecrets, setShowSecrets] = useState(false)
  const [diagnosticResults, setDiagnosticResults] = useState<{
    step: string
    status: 'success' | 'error' | 'warning'
    message: string
  }[]>([])

  // Obtener variables de entorno
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
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

    // 1. Verificar Client ID
    if (!clientId) {
      results.push({
        step: 'Client ID',
        status: 'error',
        message: 'VITE_GOOGLE_CLIENT_ID no está definido en las variables de entorno'
      })
    } else if (!clientId.includes('.googleusercontent.com')) {
      results.push({
        step: 'Client ID',
        status: 'error',
        message: 'Client ID no tiene el formato correcto (debe terminar en .googleusercontent.com)'
      })
    } else {
      results.push({
        step: 'Client ID',
        status: 'success',
        message: 'Client ID configurado correctamente'
      })
    }

    // 2. Verificar Client Secret
    if (!clientSecret) {
      results.push({
        step: 'Client Secret',
        status: 'error',
        message: 'VITE_GOOGLE_CLIENT_SECRET no está definido en las variables de entorno'
      })
    } else if (clientSecret.length < 20) {
      results.push({
        step: 'Client Secret',
        status: 'warning',
        message: 'Client Secret parece ser muy corto, verifica que sea correcto'
      })
    } else {
      results.push({
        step: 'Client Secret',
        status: 'success',
        message: 'Client Secret configurado'
      })
    }

    // 3. Verificar URL de desarrollo
    if (currentUrl === 'http://localhost:5174') {
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
              <Badge variant="outline">Error 401: invalid_client</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información actual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Client ID:</label>
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
                    <code className="flex-1 p-2 bg-surface1 rounded text-xs">
                      {clientSecret 
                        ? (showSecrets ? clientSecret : '••••••••••••••••••••') 
                        : '❌ No configurado'
                      }
                    </code>
                    {clientSecret && (
                      <>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setShowSecrets(!showSecrets)}
                        >
                          {showSecrets ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(clientSecret)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">URL Actual:</label>
                  <code className="block p-2 bg-surface1 rounded text-xs mt-1">
                    {currentUrl}
                  </code>
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

            {/* Botones de acción */}
            <div className="flex gap-3 flex-wrap">
              <Button onClick={runDiagnostic}>
                🔍 Ejecutar Diagnóstico
              </Button>
              <Button onClick={testOAuthConnection} variant="outline">
                🧪 Probar Conexión OAuth
              </Button>
              <Button 
                onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Google Cloud Console
              </Button>
            </div>

            {/* Resultados del diagnóstico */}
            {diagnosticResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resultados del Diagnóstico</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {diagnosticResults.map((result, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-surface1">
                        <div className="mt-0.5">
                          {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green" />}
                          {result.status === 'error' && <XCircle className="h-4 w-4 text-red" />}
                          {result.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{result.step}</div>
                          <div className="text-xs text-subtext0 mt-1">{result.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* Instrucciones de configuración */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Pasos para Solucionar Error 401: invalid_client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-2">1. Configurar Variables de Entorno</h3>
                <div className="bg-surface1 p-4 rounded-lg">
                  <p className="text-xs text-subtext0 mb-2">Agrega estas líneas a tu archivo <code>.env</code>:</p>
                  <pre className="text-xs bg-surface0 p-2 rounded overflow-x-auto">
{`# Google Calendar API Configuration
VITE_GOOGLE_CLIENT_ID=tu-client-id.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=tu-client-secret`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">2. Configurar en Google Cloud Console</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="bg-blue text-base rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                    <div>
                      <p className="font-medium">Habilitar Google Calendar API</p>
                                             <p className="text-xs text-subtext0">Ve a APIs & Services → Library → Google Calendar API → Enable</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="bg-blue text-base rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                    <div>
                      <p className="font-medium">Configurar OAuth 2.0 Client</p>
                                             <p className="text-xs text-subtext0">APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="bg-blue text-base rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                    <div>
                      <p className="font-medium">Configurar URIs Autorizados</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-xs text-subtext0">JavaScript origins:</p>
                        <code className="block text-xs bg-surface0 p-1 rounded">{currentUrl}</code>
                        <p className="text-xs text-subtext0">Redirect URIs:</p>
                        <code className="block text-xs bg-surface0 p-1 rounded">{redirectUri}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">3. Verificaciones Comunes</h3>
                <ul className="text-xs space-y-1 text-subtext0">
                  <li>• El Client ID debe terminar en <code>.googleusercontent.com</code></li>
                  <li>• Los URIs deben coincidir EXACTAMENTE (sin espacios o barras adicionales)</li>
                  <li>• Reinicia el servidor después de cambiar variables de entorno</li>
                  <li>• Verifica que el proyecto tenga OAuth consent screen configurado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 