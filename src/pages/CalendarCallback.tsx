import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'

export function CalendarCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleCallback } = useGoogleCalendar()

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Verificar si hay un código de autorización en los parámetros
        const code = searchParams.get('code')
        const errorParam = searchParams.get('error')

        if (errorParam) {
          throw new Error(`Error de autorización: ${errorParam}`)
        }

        if (!code) {
          throw new Error('No se recibió código de autorización')
        }

        // Procesar el código de autorización
        await handleCallback(code)
        setStatus('success')

        // Redirigir al calendario después de 3 segundos
        setTimeout(() => {
          navigate('/calendario')
        }, 3000)

      } catch (error: any) {
        console.error('Error en callback de Google Calendar:', error)
        setError(error.message || 'Error desconocido al conectar con Google Calendar')
        setStatus('error')
      }
    }

    processCallback()
  }, [searchParams, handleCallback, navigate])

  // Función para reintentar la conexión
  const handleRetry = () => {
    navigate('/calendario')
  }

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue rounded-lg">
              <Calendar className="h-7 w-7 text-base" />
            </div>
            <span className="text-2xl font-bold text-text">LawConnect</span>
          </div>
          <CardTitle>
            {status === 'loading' && 'Conectando con Google Calendar'}
            {status === 'success' && 'Conexión Exitosa'}
            {status === 'error' && 'Error de Conexión'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-blue/10 rounded-full mx-auto">
                <Loader2 className="h-8 w-8 text-blue animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-subtext0">
                  Procesando autorización de Google Calendar...
                </p>
                <p className="text-xs text-subtext0">
                  Esto puede tomar unos segundos
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mx-auto">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              <div className="space-y-2">
                <p className="text-subtext0">
                  ¡Google Calendar se conectó exitosamente!
                </p>
                <p className="text-xs text-subtext0">
                  Ahora puedes sincronizar y gestionar tus eventos.
                </p>
                <p className="text-xs text-subtext0">
                  Serás redirigido automáticamente...
                </p>
              </div>
              <Button onClick={() => navigate('/calendario')} className="w-full">
                Ir al Calendario
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-red/10 rounded-full mx-auto">
                <XCircle className="h-8 w-8 text-red" />
              </div>
              <div className="space-y-2">
                <p className="text-red text-sm font-medium">
                  Error al conectar con Google Calendar
                </p>
                {error && (
                  <p className="text-xs text-subtext0 bg-surface1 p-3 rounded-lg">
                    {error}
                  </p>
                )}
                <p className="text-xs text-subtext0">
                  Intenta conectar nuevamente desde la página de calendario.
                </p>
              </div>
              <div className="flex flex-col space-y-2">
                <Button onClick={handleRetry} className="w-full">
                  Ir al Calendario
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  Reintentar Conexión
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 