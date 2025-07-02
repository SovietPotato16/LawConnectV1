import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Scale, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

const registerSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
  especialidad: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    try {
      console.log('Iniciando registro para:', data.email)
      
      const { data: authData, error } = await signUp(data.email, data.password, {
        nombre: data.nombre,
        apellido: data.apellido,
        especialidad: data.especialidad,
      })
      
      console.log('Resultado del registro:', { authData, error })
      
      if (error) {
        console.error('Error en el registro:', error)
        // Mostrar el error específico de Supabase
        setError('root', { 
          message: error.message.includes('User already registered')
            ? 'Ya existe una cuenta con este email. Intenta iniciar sesión.'
            : error.message.includes('Invalid email')
            ? 'El formato del email no es válido.'
            : error.message.includes('Password')
            ? 'La contraseña no cumple con los requisitos.'
            : `Error: ${error.message}`
        })
      } else if (authData?.user) {
        console.log('Registro exitoso, redirigiendo a confirmación')
        // Si el registro es exitoso, redirigir a la página de confirmación de email
        navigate('/confirm-email')
      } else {
        console.error('Registro sin error pero sin datos de usuario')
        setError('root', { message: 'Error: No se pudo crear la cuenta. Intenta de nuevo.' })
      }
    } catch (error: any) {
      console.error('Error inesperado en el registro:', error)
      setError('root', { 
        message: `Error inesperado: ${error?.message || 'Contacta con soporte'}` 
      })
    } finally {
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
          <CardTitle>Crear Cuenta</CardTitle>
          <CardDescription>
            Únete a la plataforma legal del futuro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Juan"
                  {...register('nombre')}
                />
                {errors.nombre && (
                  <p className="text-sm text-red">{errors.nombre.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  placeholder="Pérez"
                  {...register('apellido')}
                />
                {errors.apellido && (
                  <p className="text-sm text-red">{errors.apellido.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="especialidad">Especialidad (Opcional)</Label>
              <Input
                id="especialidad"
                placeholder="Derecho Civil, Penal, etc."
                {...register('especialidad')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
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
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red">{errors.confirmPassword.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red">{errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-subtext0">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-blue hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}