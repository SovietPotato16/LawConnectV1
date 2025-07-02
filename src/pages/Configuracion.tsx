import { useState, useEffect } from 'react'
import { 
  User, 
  Lock, 
  Camera, 
  Calendar, 
  Save, 
  Eye, 
  EyeOff,
  ExternalLink,
  CheckCircle,
  XCircle,
  Settings,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ImageCropper } from '@/components/ImageCropper'
import { AvatarSetup } from '@/lib/avatarSetup'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { supabase } from '@/lib/supabase'

export function Configuracion() {
  const { user } = useAuth()
  const { profile, updateProfile, updateAvatar, getInitials, getFullName } = useProfile()
  const { isConnected, loading: calendarLoading, connect, disconnect } = useGoogleCalendar()
  
  const [profileForm, setProfileForm] = useState({
    nombre: '',
    apellido: '',
    especialidad: '',
    telefono: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    avatar: false,
    setup: false
  })
  // Estado para el recortador de imágenes
  const [cropperState, setCropperState] = useState({
    isOpen: false,
    imageSrc: ''
  })
  // Estado para mostrar resultado de configuración
  const [setupResult, setSetupResult] = useState<{ success: boolean; message: string; details: string[] } | null>(null)

  useEffect(() => {
    if (profile) {
      setProfileForm({
        nombre: profile.nombre || '',
        apellido: profile.apellido || '',
        especialidad: profile.especialidad || '',
        telefono: profile.telefono || ''
      })
    }
  }, [profile])

  // Obtener la URL del avatar desde el perfil
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now())
  const avatarUrl = (profile as any)?.avatar_url 
    ? `${(profile as any).avatar_url}?t=${avatarTimestamp}` 
    : ''

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(prev => ({ ...prev, profile: true }))

    try {
      const { error } = await updateProfile(profileForm)
      if (error) throw error
      alert('Perfil actualizado correctamente')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error al actualizar el perfil')
    } finally {
      setLoading(prev => ({ ...prev, profile: false }))
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Las contraseñas no coinciden')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(prev => ({ ...prev, password: true }))

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      })

      if (error) throw error

      alert('Contraseña actualizada correctamente')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error) {
      console.error('Error updating password:', error)
      alert('Error al actualizar la contraseña')
    } finally {
      setLoading(prev => ({ ...prev, password: false }))
    }
  }

  // Manejar selección de archivo para recorte
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    console.log('📁 Archivo seleccionado:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
    })

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('❌ Solo se permiten archivos de imagen (PNG, JPG, JPEG, WebP)')
      return
    }

    // Validar tamaño de archivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('❌ El archivo es demasiado grande. Máximo 5MB.\n\n📏 Tu archivo: ' + (file.size / (1024 * 1024)).toFixed(2) + 'MB')
      return
    }

    try {
      // Crear URL temporal para mostrar en el recortador
      const imageUrl = URL.createObjectURL(file)
      console.log('🔗 URL temporal creada para el recortador')
      
      setCropperState({
        isOpen: true,
        imageSrc: imageUrl
      })

      // Limpiar el input
      event.target.value = ''
    } catch (error) {
      console.error('❌ Error procesando archivo:', error)
      alert('Error al procesar el archivo seleccionado')
    }
  }

  // Manejar el resultado del recorte
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    setLoading(prev => ({ ...prev, avatar: true }))

    try {
      console.log('🖼️ Procesando imagen recortada...', {
        size: croppedImageBlob.size,
        type: croppedImageBlob.type
      })

      // Usar la función updateAvatar del hook useProfile
      const result = await updateAvatar(croppedImageBlob)
      
      if (result.error) {
        throw result.error
      }

      console.log('✅ Avatar actualizado exitosamente:', result.url)
      
      // Actualizar el timestamp para forzar recarga de la imagen
      const newTimestamp = Date.now()
      setAvatarTimestamp(newTimestamp)
      
      alert('Foto de perfil actualizada correctamente')
      
      // Refrescar el perfil después de un momento para asegurar que se vea la actualización
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      
    } catch (error) {
      console.error('❌ Error completo al actualizar avatar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar la foto de perfil'
      alert(`Error: ${errorMessage}\n\n💡 Intenta usar el botón "Configurar Sistema" si es la primera vez que subes una foto.`)
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }))
      // Limpiar la URL temporal
      if (cropperState.imageSrc) {
        URL.revokeObjectURL(cropperState.imageSrc)
      }
      setCropperState({ isOpen: false, imageSrc: '' })
    }
  }

  // Cerrar el recortador
  const handleCropperClose = () => {
    if (cropperState.imageSrc) {
      URL.revokeObjectURL(cropperState.imageSrc)
    }
    setCropperState({ isOpen: false, imageSrc: '' })
  }

  const handleGoogleCalendarToggle = async () => {
    try {
      if (isConnected) {
        await disconnect()
        alert('Google Calendar desconectado correctamente')
      } else {
        connect()
      }
    } catch (error) {
      console.error('Error toggling Google Calendar:', error)
      alert('Error al gestionar la conexión con Google Calendar')
    }
  }

  // Configurar sistema de avatares
  const handleAvatarSetup = async () => {
    if (!user) return

    setLoading(prev => ({ ...prev, setup: true }))
    setSetupResult(null)

    try {
      const result = await AvatarSetup.setupComplete()
      setSetupResult(result)
    } catch (error) {
      console.error('Error en configuración:', error)
      setSetupResult({
        success: false,
        message: 'Error durante la configuración',
        details: [error instanceof Error ? error.message : 'Error desconocido']
      })
    } finally {
      setLoading(prev => ({ ...prev, setup: false }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text">Configuración</h1>
        <p className="text-subtext0">Gestiona tu perfil y preferencias</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="integrations">Integraciones</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Foto de perfil
                </CardTitle>
                <CardDescription>
                  Actualiza tu imagen de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Avatar className="w-24 h-24 mx-auto">
                  <AvatarImage src={avatarUrl} alt={getFullName()} />
                  <AvatarFallback className="bg-blue text-base text-lg">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="space-y-2">
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={loading.avatar}
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                    disabled={loading.avatar}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {loading.avatar ? 'Subiendo...' : 'Cambiar foto'}
                  </Button>
                  
                  {/* Botón de configuración si es necesario */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAvatarSetup}
                    disabled={loading.setup}
                    className="w-full"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    {loading.setup ? 'Configurando...' : 'Configurar Sistema'}
                  </Button>
                </div>

                {/* Mostrar resultado de configuración */}
                {setupResult && (
                  <div className={`mt-4 p-3 rounded-lg border ${
                    setupResult.success 
                      ? 'bg-green/10 border-green/20 text-green' 
                      : 'bg-red/10 border-red/20 text-red'
                  }`}>
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {setupResult.success ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      {setupResult.message}
                    </div>
                    {setupResult.details && setupResult.details.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {setupResult.details.map((detail, index) => (
                          <div key={index} className="text-xs whitespace-pre-line">
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Información personal
                  </CardTitle>
                  <CardDescription>
                    Actualiza tu información de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre</Label>
                        <Input
                          id="nombre"
                          value={profileForm.nombre}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Tu nombre"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apellido">Apellido</Label>
                        <Input
                          id="apellido"
                          value={profileForm.apellido}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, apellido: e.target.value }))}
                          placeholder="Tu apellido"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="especialidad">Especialidad</Label>
                      <Input
                        id="especialidad"
                        value={profileForm.especialidad}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, especialidad: e.target.value }))}
                        placeholder="Ej: Derecho Civil, Penal, Laboral..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        value={profileForm.telefono}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, telefono: e.target.value }))}
                        placeholder="+1 234 567 8900"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={user?.email || ''}
                        disabled
                        className="bg-surface1"
                      />
                      <p className="text-xs text-subtext0">
                        El email no se puede cambiar desde aquí
                      </p>
                    </div>

                    <Button type="submit" disabled={loading.profile}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading.profile ? 'Guardando...' : 'Guardar cambios'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Cambiar contraseña
              </CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={loading.password}>
                  <Lock className="h-4 w-4 mr-2" />
                  {loading.password ? 'Actualizando...' : 'Actualizar contraseña'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Google Calendar
              </CardTitle>
              <CardDescription>
                Conecta tu cuenta de Google Calendar para sincronizar eventos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-surface1 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green' : 'bg-red'}`} />
                  <div>
                    <p className="font-medium text-text">
                      {isConnected ? 'Conectado' : 'Desconectado'}
                    </p>
                    <p className="text-sm text-subtext0">
                      {isConnected 
                        ? 'Tu calendario está sincronizado con Google Calendar'
                        : 'Conecta tu cuenta para sincronizar eventos'
                      }
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleGoogleCalendarToggle}
                  disabled={calendarLoading}
                  variant={isConnected ? 'destructive' : 'default'}
                >
                  {calendarLoading ? (
                    'Procesando...'
                  ) : isConnected ? (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Desconectar
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>
              </div>

              {isConnected && (
                <div className="mt-4 p-4 bg-green/10 border border-green/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Conexión activa</span>
                  </div>
                  <p className="text-sm text-subtext0 mt-1">
                    Tus eventos se sincronizan automáticamente con Google Calendar
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Future integrations placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Próximas integraciones</CardTitle>
              <CardDescription>
                Integraciones que estarán disponibles próximamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface1 rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface2 rounded-lg flex items-center justify-center">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text">Microsoft Outlook</p>
                      <p className="text-sm text-subtext0">Sincronización de calendario y email</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Próximamente</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface1 rounded-lg opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-surface2 rounded-lg flex items-center justify-center">
                      <Settings className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text">Dropbox</p>
                      <p className="text-sm text-subtext0">Almacenamiento adicional de documentos</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Próximamente</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de la aplicación</CardTitle>
              <CardDescription>
                Personaliza tu experiencia en LawConnect
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Notificaciones por email</p>
                    <p className="text-sm text-subtext0">Recibe notificaciones sobre casos y citas</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configurar
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Zona horaria</p>
                    <p className="text-sm text-subtext0">Configura tu zona horaria para citas</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Idioma</p>
                    <p className="text-sm text-subtext0">Español (España)</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Cambiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Componente de recorte de imagen */}
      <ImageCropper
        src={cropperState.imageSrc}
        isOpen={cropperState.isOpen}
        onClose={handleCropperClose}
        onCropComplete={handleCropComplete}
        aspectRatio={1} // Relación 1:1 para foto de perfil circular
      />
    </div>
  )
}