import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function TestEmail() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { signUp, resendConfirmation } = useAuth()

  // Función para probar el registro y envío de email
  const testEmailRegistration = async () => {
    if (!email) {
      setError('Ingresa un email válido')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Intentar registro con un email temporal
      const { data, error: signUpError } = await signUp(email, 'temporal123', {
        nombre: 'Test',
        apellido: 'Email',
        especialidad: 'Prueba'
      })

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          // Si el usuario ya existe, intentar reenviar confirmación
          const { error: resendError } = await resendConfirmation(email)
          if (resendError) {
            setError(`Error al reenviar: ${resendError.message}`)
          } else {
            setResult(`✅ Email de confirmación reenviado a: ${email}`)
          }
        } else {
          setError(`Error en registro: ${signUpError.message}`)
        }
      } else if (data?.user) {
        if (data.user.email_confirmed_at) {
          setResult(`⚠️ El email se confirmó automáticamente. Esto significa que "Enable email confirmations" NO está habilitado en Supabase.`)
        } else {
          setResult(`✅ Usuario creado y email de confirmación enviado a: ${email}`)
        }
      }
    } catch (error: any) {
      setError(`Error inesperado: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Función para verificar configuración
  const checkEmailConfig = () => {
    const config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      currentUrl: window.location.origin,
      confirmUrl: `${window.location.origin}/confirm-email`,
      resetUrl: `${window.location.origin}/reset-password`
    }

    setResult(`📋 Configuración actual:
    
• Supabase URL: ${config.supabaseUrl || 'No configurada'}
• URL actual: ${config.currentUrl}
• URL confirmación: ${config.confirmUrl}
• URL reset: ${config.resetUrl}

🔍 Verifica en Supabase Dashboard:
1. Authentication > Settings > "Enable email confirmations" ✓
2. Authentication > URL Configuration:
   - Site URL: ${config.currentUrl}
   - Redirect URLs: ${config.confirmUrl}, ${config.resetUrl}
3. Settings > Auth > SMTP Settings (si configurado)`)
  }

  return (
    <div className="min-h-screen bg-base p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📧 Prueba de Email de Confirmación</CardTitle>
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

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={testEmailRegistration}
                disabled={loading || !email}
              >
                {loading ? 'Probando...' : '📧 Probar Registro y Email'}
              </Button>
              
              <Button 
                onClick={checkEmailConfig}
                variant="outline"
              >
                🔍 Ver Configuración
              </Button>
            </div>

            {error && (
              <div className="border border-red/20 bg-red/10 p-4 rounded-lg">
                <div className="text-red">
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {result && (
              <div className="border border-blue/20 bg-blue/10 p-4 rounded-lg">
                <div className="text-blue whitespace-pre-wrap">
                  {result}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🛠️ Pasos para Solucionar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <strong>1. Habilitar Email Confirmations en Supabase:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Ve a tu Supabase Dashboard</li>
                <li>Authentication → Settings</li>
                <li>Busca "User Management"</li>
                <li>Activa "Enable email confirmations" ⚠️</li>
              </ul>
            </div>

            <div>
              <strong>2. Configurar URLs de Redirección:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Authentication → URL Configuration</li>
                <li>Site URL: http://localhost:5174</li>
                <li>Redirect URLs: http://localhost:5174/confirm-email</li>
              </ul>
            </div>

            <div>
              <strong>3. (Opcional) Configurar SMTP:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Settings → Auth → SMTP Settings</li>
                <li>Habilita "Enable custom SMTP"</li>
                <li>Configura con Gmail o tu proveedor</li>
              </ul>
            </div>

            <div>
              <strong>4. Probar:</strong>
              <ul className="list-disc ml-5 mt-2">
                <li>Usa esta página para probar la configuración</li>
                <li>Si dice "se confirmó automáticamente" → Email confirmations NO está habilitado</li>
                <li>Si dice "email enviado" → ¡Configuración correcta! 🎉</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 