import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

export function TestAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('test123456')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  // Función para agregar un resultado al log
  const addResult = (operation: string, data: any, error: any) => {
    const timestamp = new Date().toLocaleTimeString()
    setResults(prev => [...prev, {
      timestamp,
      operation,
      data: data ? JSON.stringify(data, null, 2) : 'null',
      error: error ? JSON.stringify(error, null, 2) : 'null',
      success: !error
    }])
  }

  // Verificar configuración de Supabase
  const testSupabaseConfig = async () => {
    setLoading(true)
    try {
      // Probar conexión básica
      const { data, error } = await supabase.from('profiles').select('count').limit(1)
      addResult('Conexión Supabase', data, error)

      // Verificar configuración de auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      addResult('Verificar Sesión', session, sessionError)

    } catch (error) {
      addResult('Error General', null, error)
    } finally {
      setLoading(false)
    }
  }

  // Probar registro
  const testSignUp = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: 'Test',
            apellido: 'Usuario'
          },
          emailRedirectTo: `${window.location.origin}/confirm-email`
        }
      })
      addResult('Test SignUp', data, error)
    } catch (error) {
      addResult('Test SignUp Error', null, error)
    } finally {
      setLoading(false)
    }
  }

  // Probar reset de contraseña
  const testPasswordReset = async () => {
    if (!email) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      addResult('Test Password Reset', data, error)
    } catch (error) {
      addResult('Test Password Reset Error', null, error)
    } finally {
      setLoading(false)
    }
  }

  // Limpiar resultados
  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="min-h-screen bg-base p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>🔧 Diagnóstico de Autenticación - LawConnect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label>Email de prueba:</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <label>Contraseña (fija para pruebas):</label>
              <Input
                type="text"
                value={password}
                disabled
                className="bg-surface1"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={testSupabaseConfig}
                disabled={loading}
                variant="outline"
              >
                {loading ? 'Probando...' : 'Probar Configuración'}
              </Button>
              
              <Button 
                onClick={testSignUp}
                disabled={loading || !email}
              >
                {loading ? 'Probando...' : 'Probar Registro'}
              </Button>
              
              <Button 
                onClick={testPasswordReset}
                disabled={loading || !email}
                variant="secondary"
              >
                {loading ? 'Probando...' : 'Probar Reset Password'}
              </Button>
              
              <Button 
                onClick={clearResults}
                variant="destructive"
              >
                Limpiar Log
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Log de resultados */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Log de Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-subtext0">No hay resultados aún. Ejecuta algunas pruebas.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success 
                        ? 'bg-green/10 border-green/30' 
                        : 'bg-red/10 border-red/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold">{result.operation}</span>
                      <span className="text-xs text-subtext0">{result.timestamp}</span>
                    </div>
                    
                    {result.data !== 'null' && (
                      <div className="mb-2">
                        <strong>Data:</strong>
                        <pre className="text-xs bg-surface0 p-2 rounded mt-1 overflow-x-auto">
                          {result.data}
                        </pre>
                      </div>
                    )}
                    
                    {result.error !== 'null' && (
                      <div>
                        <strong className="text-red">Error:</strong>
                        <pre className="text-xs bg-surface0 p-2 rounded mt-1 overflow-x-auto">
                          {result.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de configuración */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>ℹ️ Información de Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>URL Actual:</strong> {window.location.origin}</div>
            <div><strong>Supabase URL:</strong> {import.meta.env.VITE_SUPABASE_URL || 'No configurada'}</div>
            <div><strong>Confirm URL:</strong> {`${window.location.origin}/confirm-email`}</div>
            <div><strong>Reset URL:</strong> {`${window.location.origin}/reset-password`}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 