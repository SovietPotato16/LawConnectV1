import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, Calendar, AlertTriangle } from 'lucide-react'

export function CalendarCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, restoreSessionAfterOAuth } = useAuth()
  const { handleOAuthCallback } = useGoogleCalendar()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [diagnosticInfo, setDiagnosticInfo] = useState<string[]>([])
  const isProcessingRef = useRef(false)
  const hasAttemptedRestoreRef = useRef(false)
  const hasAttemptedDirectSessionRef = useRef(false)
  const processedRef = useRef(false)
  const retryCountRef = useRef(0)
  const maxRetries = 5 // Reducido para ser más agresivo

  // Función para agregar información de diagnóstico (memoizada)
  const addDiagnostic = useCallback((info: string) => {
    setDiagnosticInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${info}`])
  }, [])

  // Función para restaurar sesión directamente desde localStorage (más agresiva)
  const forceRestoreSession = useCallback(async () => {
    const preserved = localStorage.getItem('lawconnect-oauth-session')
    if (!preserved) {
      addDiagnostic('No hay sesión preservada en localStorage')
      return null
    }

    try {
      const sessionData = JSON.parse(preserved)
      const age = Date.now() - sessionData.timestamp
      
      addDiagnostic(`Sesión preservada encontrada, edad: ${Math.round(age / 1000)} segundos`)
      
      if (age > 10 * 60 * 1000) {
        addDiagnostic('Sesión preservada ha expirado')
        localStorage.removeItem('lawconnect-oauth-session')
        return null
      }

      addDiagnostic('Restaurando sesión directamente con Supabase...')
      
      const { data, error } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
      })
      
      if (!error && data.session) {
        addDiagnostic('✅ Sesión restaurada directamente con Supabase')
        localStorage.removeItem('lawconnect-oauth-session')
        return data.session.user
      } else {
        addDiagnostic(`❌ Error restaurando sesión: ${error?.message || 'Desconocido'}`)
        localStorage.removeItem('lawconnect-oauth-session')
        return null
      }
    } catch (error) {
      addDiagnostic(`❌ Error procesando sesión preservada: ${error instanceof Error ? error.message : 'Desconocido'}`)
      localStorage.removeItem('lawconnect-oauth-session')
      return null
    }
  }, [addDiagnostic])

  // Función principal de procesamiento memoizada
  const processCallback = useCallback(async () => {
    // Evitar múltiples ejecuciones en paralelo o si ya fue procesado
    if (isProcessingRef.current || processedRef.current) {
      return
    }

    // Incrementar contador de reintentos
    retryCountRef.current += 1
    
    console.log(`🔄 Iniciando procesamiento de callback (intento ${retryCountRef.current})...`)
    console.log('👤 Usuario actual:', user ? user.id : 'No autenticado')
    console.log('⏳ Auth loading:', authLoading)

    addDiagnostic(`Intento ${retryCountRef.current} - Usuario: ${user ? 'Autenticado' : 'No autenticado'}, Loading: ${authLoading}`)

    // Obtener código y error de la URL
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    console.log('🔑 Código OAuth:', code ? code.substring(0, 10) + '...' : 'No recibido')
    console.log('❌ Error OAuth:', error || 'Ninguno')

    // Si el usuario canceló la autorización
    if (error) {
      console.log('❌ Usuario canceló la autorización:', error)
      addDiagnostic(`Error OAuth: ${error}`)
      setStatus('error')
      setMessage(`Error en la autorización: ${error}`)
      processedRef.current = true
      return
    }

    // Si no hay código, algo salió mal
    if (!code) {
      console.log('❌ No se recibió código de autorización')
      addDiagnostic('No se recibió código de autorización en la URL')
      setStatus('error')
      setMessage('No se recibió el código de autorización')
      processedRef.current = true
      return
    }

    // Marcar que estamos procesando
    isProcessingRef.current = true

    try {
      let currentUser = user

      // Caso 1: Si no hay usuario Y el hook sigue cargando, intentar restauración directa
      if (!currentUser && authLoading && !hasAttemptedDirectSessionRef.current) {
        console.log('🔄 Intentando restauración directa de sesión (bypass del hook)...')
        addDiagnostic('Intentando restauración directa con Supabase')
        hasAttemptedDirectSessionRef.current = true
        
        const restoredUser = await forceRestoreSession()
        if (restoredUser) {
          currentUser = restoredUser
          addDiagnostic('✅ Usuario restaurado directamente')
        } else {
          addDiagnostic('❌ No se pudo restaurar usuario directamente')
        }
      }

      // Caso 2: Si no hay usuario, intentar con el mecanismo del hook (una sola vez)
      if (!currentUser && !hasAttemptedRestoreRef.current) {
        console.log('🔄 Intentando restaurar sesión con hook useAuth...')
        addDiagnostic('Intentando restaurar sesión con hook useAuth')
        hasAttemptedRestoreRef.current = true
        
        try {
          const restored = await restoreSessionAfterOAuth()
          if (restored) {
            addDiagnostic('✅ Sesión restaurada con hook useAuth')
            // Dar tiempo para sincronización
            setTimeout(() => {
              isProcessingRef.current = false
              processCallback()
            }, 1500)
            return
          } else {
            addDiagnostic('❌ Hook useAuth no pudo restaurar sesión')
          }
        } catch (error) {
          console.error('❌ Error restaurando sesión con hook:', error)
          addDiagnostic(`❌ Error con hook: ${error instanceof Error ? error.message : 'Desconocido'}`)
        }
      }

      // Caso 3: Si aún no hay usuario después de intentos de restauración
      if (!currentUser) {
        console.log('❌ Usuario no autenticado después de todos los intentos')
        addDiagnostic('Usuario no autenticado después de todos los intentos de restauración')
        
        if (retryCountRef.current < maxRetries) {
          // Continuar esperando un poco más
          addDiagnostic(`Esperando usuario autenticado (intento ${retryCountRef.current}/${maxRetries})`)
          setTimeout(() => {
            isProcessingRef.current = false
            processCallback()
          }, 2000) // Aumentar delay
          return
        } else {
          // Ya no hay más reintentos
          setStatus('error')
          setMessage('No se pudo restaurar tu sesión. Por favor inicia sesión de nuevo y vuelve a intentar.')
          processedRef.current = true
          return
        }
      }

      // Caso 4: Usuario autenticado, procesar el callback
      console.log('🔄 Procesando callback OAuth con usuario:', currentUser.id)
      addDiagnostic(`✅ Procesando callback OAuth - Usuario ID: ${currentUser.id}`)
      
      // Procesar el callback OAuth de forma segura, pasando el usuario explícitamente
      await handleOAuthCallback(code, currentUser)
      
      console.log('✅ OAuth callback procesado exitosamente')
      addDiagnostic('✅ OAuth callback procesado exitosamente')
      setStatus('success')
      setMessage('¡Google Calendar conectado exitosamente!')
      processedRef.current = true
      
      // Redirigir al calendario después de 2 segundos
      setTimeout(() => {
        navigate('/calendario')
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error procesando OAuth callback:', error)
      addDiagnostic(`❌ Error procesando callback: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setStatus('error')
      setMessage(
        error instanceof Error 
          ? error.message 
          : 'Error al conectar Google Calendar. Por favor intenta de nuevo.'
      )
      processedRef.current = true
    } finally {
      isProcessingRef.current = false
    }
  }, [searchParams, user, authLoading, handleOAuthCallback, restoreSessionAfterOAuth, navigate, addDiagnostic, forceRestoreSession])

  useEffect(() => {
    // Solo procesar si tenemos los parámetros necesarios y no hemos procesado ya
    if ((searchParams.get('code') || searchParams.get('error')) && !processedRef.current) {
      // Pequeño delay inicial para permitir que los hooks se inicialicen
      setTimeout(() => {
        processCallback()
      }, 500) // Aumentar delay inicial
    } else if (!searchParams.get('code') && !searchParams.get('error') && !processedRef.current) {
      console.log('❌ No se encontraron parámetros de OAuth en la URL')
      addDiagnostic('No se encontraron parámetros OAuth en la URL')
      setStatus('error')
      setMessage('Parámetros de autorización no encontrados')
      processedRef.current = true
    }
  }, [processCallback, searchParams, addDiagnostic])

  return (
    <div className="min-h-screen bg-base flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
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
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-subtext0">
              {message}
            </p>
            
            {status === 'loading' && (
              <div className="text-sm text-subtext1 mt-2">
                {authLoading 
                  ? 'Restaurando tu sesión...' 
                  : (!user ? `Intentando restaurar sesión... (${retryCountRef.current}/${maxRetries})` : 'Procesando autorización de Google Calendar...')}
              </div>
            )}
          </div>

          {/* Información de diagnóstico expandible */}
          {diagnosticInfo.length > 0 && (
            <div className="mt-6">
              <details className="border border-surface1 rounded-lg">
                <summary className="p-3 cursor-pointer bg-surface0 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow" />
                  <span className="text-sm font-medium">Información de Diagnóstico ({diagnosticInfo.length} eventos)</span>
                </summary>
                <div className="p-3 border-t border-surface1 bg-surface0 max-h-40 overflow-y-auto">
                  {diagnosticInfo.map((info, index) => (
                    <div key={index} className="text-xs text-subtext1 font-mono py-1">
                      {info}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-3 text-center">
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
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => navigate('/calendario')}
                className="w-full"
                variant="outline"
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