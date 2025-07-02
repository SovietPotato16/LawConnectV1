import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Scale, CheckCircle, XCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

export function ConfirmEmail() {
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  
  const { user, resendConfirmation } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Efecto para manejar la confirmación automática desde el enlace del email
  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Verificar los parámetros de la URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        if (type === 'signup' && accessToken && refreshToken) {
          // Establecer la sesión con los tokens del URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Error confirming email:', error)
            setError('Error al confirmar el email. El enlace puede haber expirado.')
          } else if (data.session) {
            setConfirmed(true)
            // Redirigir al dashboard después de 3 segundos
            setTimeout(() => {
              navigate('/dashboard')
            }, 3000)
          }
        } else {
          // Si no hay parámetros de confirmación, mostrar la página de "revisa tu email"
          setError(null)
        }
      } catch (error) {
        console.error('Error in email confirmation:', error)
        setError('Error inesperado al confirmar el email.')
      } finally {
        setLoading(false)
      }
    }

    handleEmailConfirmation()
  }, [searchParams, navigate])

  // Función para reenviar email de confirmación
  const handleResend = async () => {
    if (!user?.email) {
      setError('No se pudo obtener el email del usuario.')
      return
    }

    setResendLoading(true)
    setResendSuccess(false)
    
    try {
      const { error } = await resendConfirmation(user.email)
      if (error) {
        console.error('Error resending confirmation:', error)
        setError('Error al reenviar el email de confirmación.')
      } else {
        setResendSuccess(true)
        setTimeout(() => setResendSuccess(false), 5000) // Limpiar mensaje después de 5 segundos
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setError('Error inesperado al reenviar el email.')
    } finally {
      setResendLoading(false)
    }
  }

  // Mostrar loading mientras procesamos
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue mx-auto mb-4"></div>
            <p className="text-subtext0">Verificando confirmación...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue rounded-lg">
              <Scale className="h-7 w-7 text-base" />
            </div>
            <span className="text-2xl font-bold text-text">LawConnect</span>
          </div>
          <CardTitle>
            {confirmed ? 'Email Confirmado' : error ? 'Error de Confirmación' : 'Confirma tu Email'}
          </CardTitle>
          <CardDescription>
            {confirmed 
              ? 'Tu cuenta ha sido activada exitosamente'
              : error 
                ? 'Hubo un problema al confirmar tu email'
                : 'Revisa tu bandeja de entrada para activar tu cuenta'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmed ? (
            // Vista cuando el email ha sido confirmado
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mx-auto">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-subtext0">
                  ¡Bienvenido a LawConnect! Tu cuenta está ahora activa.
                </p>
                <p className="text-xs text-subtext0">
                  Serás redirigido al dashboard automáticamente...
                </p>
              </div>

              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Ir al Dashboard
              </Button>
            </div>
          ) : error ? (
            // Vista cuando hay un error
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-red/10 rounded-full mx-auto">
                <XCircle className="h-8 w-8 text-red" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-red">{error}</p>
                <p className="text-xs text-subtext0">
                  Puedes solicitar un nuevo enlace de confirmación o contactar soporte.
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                {user?.email && (
                  <Button 
                    variant="outline" 
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="w-full"
                  >
                    {resendLoading ? 'Reenviando...' : 'Reenviar Email de Confirmación'}
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Volver al Login
                </Button>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-green/10 border border-green/20 rounded-lg">
                  <p className="text-sm text-green">
                    Email de confirmación reenviado exitosamente.
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Vista por defecto - esperando confirmación
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue/10 rounded-full mx-auto">
                <Mail className="h-8 w-8 text-blue" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-subtext0">
                  Te hemos enviado un enlace de confirmación a tu email.
                </p>
                {user?.email && (
                  <p className="font-semibold text-text">{user.email}</p>
                )}
                <p className="text-xs text-subtext0">
                  Haz clic en el enlace del email para activar tu cuenta.
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                {user?.email && (
                  <Button 
                    variant="outline" 
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="w-full"
                  >
                    {resendLoading ? 'Reenviando...' : 'Reenviar Email'}
                  </Button>
                )}
                
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Volver al Login
                </Button>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-green/10 border border-green/20 rounded-lg">
                  <p className="text-sm text-green">
                    Email de confirmación reenviado. Revisa tu bandeja de entrada.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 