import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, ArrowLeft, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

// Esquema de validación para el formulario
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPassword() {
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const { resetPassword } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  // Función para manejar el envío del formulario
  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true)
    try {
      const { error } = await resetPassword(data.email)
      if (error) {
        console.error('Reset password error:', error)
        setError('root', { 
          message: error.message.includes('User not found')
            ? 'No se encontró una cuenta con ese email'
            : 'Error al enviar el email. Inténtalo de nuevo.' 
        })
      } else {
        setEmailSent(true)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setError('root', { message: 'Error inesperado al enviar el email' })
    } finally {
      setLoading(false)
    }
  }

  // Función para reenviar el email
  const handleResend = async () => {
    const email = getValues('email')
    if (email) {
      setLoading(true)
      await resetPassword(email)
      setLoading(false)
    }
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
            {emailSent ? 'Email Enviado' : 'Recuperar Contraseña'}
          </CardTitle>
          <CardDescription>
            {emailSent 
              ? 'Revisa tu bandeja de entrada para continuar'
              : 'Te enviaremos un enlace para resetear tu contraseña'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            // Vista cuando el email ha sido enviado
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green/10 rounded-full mx-auto">
                <Mail className="h-8 w-8 text-green" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-subtext0">
                  Hemos enviado un enlace de recuperación a:
                </p>
                <p className="font-semibold text-text">{getValues('email')}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-subtext0">
                  El enlace expirará en 1 hora. Si no lo recibes, revisa tu carpeta de spam.
                </p>
              </div>

              <div className="flex flex-col space-y-2">
                <Button 
                  variant="outline" 
                  onClick={handleResend}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Reenviando...' : 'Reenviar Email'}
                </Button>
                
                <Link to="/login">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Formulario para solicitar recuperación
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    {...register('email')}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-sm text-red">{errors.email.message}</p>
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
                      Enviando...
                    </>
                  ) : (
                    'Enviar Enlace de Recuperación'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login">
                  <Button variant="ghost" className="text-sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 