import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'

export function CalendarCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, restoreSessionAfterOAuth } = useAuth()
  const { handleOAuthCallback } = useGoogleCalendar()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      console.log('🔄 Iniciando procesamiento de callback...')
      console.log('👤 Usuario actual:', user ? user.id : 'No autenticado')
      console.log('⏳ Auth loading:', authLoading)

      // Esperar a que la autenticación se resuelva
      if (authLoading) {
        console.log('⏳ Esperando a que se resuelva la autenticación...')
        return
      }

      // Si no hay usuario, intentar restaurar sesión
      if (!user) {
        console.log('🔄 Intentando restaurar sesión después de OAuth...')
        try {
          await restoreSessionAfterOAuth()
          // Dar un momento para que la sesión se actualice
          setTimeout(() => {
            processCallback()
          }, 1000)
          return
        } catch (error) {
          console.error('❌ Error restaurando sesión:', error)
        }
      }

      // Verificar que el usuario esté autenticado
      if (!user) {
        console.log('❌ Usuario no autenticado en callback')
        setStatus('error')
        setMessage('Tu sesión expiró durante la autorización. Por favor inicia sesión de nuevo y vuelve a intentar.')
        return
      }

      // Obtener código de autorización de la URL
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      console.log('🔑 Código OAuth:', code ? code.substring(0, 10) + '...' : 'No recibido')
      console.log('❌ Error OAuth:', error || 'Ninguno')

      // Si el usuario canceló la autorización
      if (error) {
        console.log('❌ Usuario canceló la autorización:', error)
        setStatus('error')
        setMessage(`Error en la autorización: ${error}`)
        return
      }

      // Si no hay código, algo salió mal
      if (!code) {
        console.log('❌ No se recibió código de autorización')
        setStatus('error')
        setMessage('No se recibió el código de autorización')
        return
      }

      try {
        console.log('🔄 Procesando callback OAuth con usuario:', user.id)
        
        // Procesar el callback OAuth de forma segura
        await handleOAuthCallback(code)
        
        console.log('✅ OAuth callback procesado exitosamente')
        setStatus('success')
        setMessage('¡Google Calendar conectado exitosamente!')
        
        // Redirigir al calendario después de 2 segundos
        setTimeout(() => {
          navigate('/calendario')
        }, 2000)
        
      } catch (error) {
        console.error('❌ Error procesando OAuth callback:', error)
        setStatus('error')
        setMessage(
          error instanceof Error 
            ? error.message 
            : 'Error al conectar Google Calendar. Por favor intenta de nuevo.'
        )
      }
    }

    processCallback()
  }, [searchParams, user, authLoading, handleOAuthCallback, navigate, restoreSessionAfterOAuth])

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 text-blue animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="h-12 w-12 text-green" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 text-red" />
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Conectando Google Calendar...'}
            {status === 'success' && '¡Conexión Exitosa!'}
            {status === 'error' && 'Error de Conexión'}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="text-center space-y-4">
          <p className="text-subtext0">
            {message}
          </p>
          
          {status === 'loading' && (
            <div className="text-sm text-subtext1">
              {authLoading 
                ? 'Verificando tu sesión...' 
                : (!user ? 'Restaurando sesión...' : 'Procesando autorización de Google Calendar...')}
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-3">
              <div className="text-sm text-green">
                Serás redirigido al calendario automáticamente
              </div>
              <Button 
                onClick={() => navigate('/calendario')}
                className="w-full gap-2"
              >
                <Calendar className="h-4 w-4" />
                Ir al Calendario
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              {!user && (
                <Button 
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Iniciar Sesión
                </Button>
              )}
              <Button 
                onClick={() => navigate('/calendario')}
                className="w-full"
                variant={!user ? "outline" : "default"}
              >
                Volver al Calendario
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/google-calendar-diagnostic')}
                className="w-full text-xs"
              >
                Diagnóstico de Configuración
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 