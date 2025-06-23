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
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { supabase } from '@/lib/supabase'

export function Configuracion() {
  const { user } = useAuth()
  const { profile, updateProfile, getInitials, getFullName } = useProfile()
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
    avatar: false
  })
  const [avatarUrl, setAvatarUrl] = useState<string>('')

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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setLoading(prev => ({ ...prev, avatar: true }))

    try {
      // Upload avatar to Supabase Storage with user ID as folder name
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      alert('Foto de perfil actualizada correctamente')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error al subir la foto de perfil')
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }))
    }
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
                
                <div>
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
                </div>
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
    </div>
  )
}