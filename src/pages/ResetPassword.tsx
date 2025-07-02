import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// Esquema de validación para el formulario
const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export function ResetPassword() {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordUpdated, setPasswordUpdated] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Verificar si tenemos una sesión válida para el reset
  useEffect(() => {
    const checkResetSession = async () => {
      try {
        // Verificar los parámetros de la URL
        const accessToken = searchParams.get('access_token')
        const refreshToken = searchParams.get('refresh_token')
        const type = searchParams.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          // Establecer la sesión con los tokens del URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            console.error('Error setting session:', error)
            setValidSession(false)
          } else if (data.session) {
            setValidSession(true)
          }
        } else {
          // Verificar si ya hay una sesión activa
          const { data: { session } } = await supabase.auth.getSession()
          setValidSession(!!session)
        }
      } catch (error) {
        console.error('Error checking reset session:', error)
        setValidSession(false)
      } finally {
        setCheckingSession(false)
      }
    }

    checkResetSession()
  }, [searchParams])

  // Función para manejar el envío del formulario
  const onSubmit = async (data: ResetPasswordForm) => {
    if (!validSession) {
      setError('root', { message: 'Sesión inválida. Solicita un nuevo enlace de recuperación.' })
      return
    }

    setLoading(true)
    try {
      const { error } = await updatePassword(data.password)
      if (error) {
        console.error('Update password error:', error)
        setError('root', { 
          message: error.message.includes('session_not_found')
            ? 'Sesión expirada. Solicita un nuevo enlace de recuperación.'
            : 'Error al actualizar la contraseña. Inténtalo de nuevo.' 
        })
      } else {
        setPasswordUpdated(true)
        // Redirigir al dashboard después de 3 segundos
        setTimeout(() => {
          navigate('/dashboard')
        }, 3000)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setError('root', { message: 'Error inesperado al actualizar la contraseña' })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras verificamos la sesión
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue mx-auto mb-4"></div>
            <p className="text-subtext0">Verificando enlace...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar error si la sesión no es válida
  if (!validSession) {
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
            <CardTitle>Enlace Inválido</CardTitle>
            <CardDescription>
              Este enlace ha expirado o no es válido
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-subtext0 mb-4">
              Por favor, solicita un nuevo enlace de recuperación de contraseña.
            </p>
            <Button onClick={() => navigate('/forgot-password')} className="w-full">
              Solicitar Nuevo Enlace
            </Button>
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
            {passwordUpdated ? 'Contraseña Actualizada' : 'Nueva Contraseña'}
          </CardTitle>
          <CardDescription>
            {passwordUpdated 
              ? 'Tu contraseña ha sido actualizada exitosamente'
              : 'Ingresa tu nueva contraseña'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordUpdated ? (
            // Vista cuando la contraseña ha sido actualizada
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mx-auto">
                <CheckCircle className="h-8 w-8 text-green" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-subtext0">
                  Tu contraseña ha sido actualizada correctamente.
                </p>
                <p className="text-xs text-subtext0">
                  Serás redirigido al dashboard automáticamente...
                </p>
              </div>

              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Ir al Dashboard
              </Button>
            </div>
          ) : (
            // Formulario para cambiar contraseña
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red">{errors.confirmPassword.message}</p>
                )}
              </div>

              {errors.root && (
                <div className="p-3 bg-red/10 border border-red/20 rounded-lg">
                  <p className="text-sm text-red">{errors.root.message}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-base mr-2"></div>
                    Actualizando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 