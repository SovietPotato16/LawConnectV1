import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/lib/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      if (!data) {
        // No profile exists, create one
        await createProfile()
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    try {
      // Extract name from user metadata or email
      const email = user.email || ''
      const userMetadata = user.user_metadata || {}
      
      // Try to get name from metadata, otherwise use email prefix
      const fullName = userMetadata.full_name || userMetadata.name || email.split('@')[0]
      const nameParts = fullName.split(' ')
      
      const nombre = nameParts[0] || 'Usuario'
      const apellido = nameParts.slice(1).join(' ') || 'Nuevo'

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          nombre,
          apellido,
          especialidad: null,
          telefono: null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error creating profile:', error)
    }
  }

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: new Error('No user logged in') }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        return { error }
      }

      setProfile(data)
      return { data, error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const updateAvatar = async (avatarBlob: Blob): Promise<{ error?: Error; url?: string }> => {
    if (!user) return { error: new Error('No hay usuario logueado') }

    try {
      console.log('🔄 Iniciando subida de avatar...')
      
      // Verificar si el bucket 'avatars' existe
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error('❌ Error verificando buckets:', bucketsError)
        throw new Error(`Error verificando almacenamiento: ${bucketsError.message}`)
      }
      
      const avatarBucket = buckets?.find(bucket => bucket.name === 'avatars')
      if (!avatarBucket) {
        console.error('❌ Bucket "avatars" no encontrado')
        throw new Error('El bucket de avatars no está configurado. Usa el botón "Configurar Sistema" primero.')
      }

      // Crear nombre único para el archivo del avatar
      const fileExt = 'jpg' // Siempre guardar como JPG por consistencia
      const fileName = `avatar.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      console.log('📤 Subiendo avatar a:', filePath)

      // Subir avatar al bucket 'avatars' en Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarBlob, { 
          upsert: true, // Sobrescribir avatar existente
          contentType: 'image/jpeg'
        })

      if (uploadError) {
        console.error('❌ Error subiendo avatar:', uploadError)
        throw new Error(`Error subiendo imagen: ${uploadError.message}`)
      }

      // Obtener URL pública del avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log('🔗 URL pública generada:', publicUrl)

      // Intentar actualizar el campo avatar_url en la tabla profiles
      // Si la columna no existe, simplemente guardar en el estado local
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)

        if (updateError) {
          console.warn('⚠️ No se pudo actualizar avatar_url en la tabla (probablemente la columna no existe):', updateError)
          // Continuar sin error - guardaremos solo en el estado local
        } else {
          console.log('✅ Avatar_url actualizado en la tabla profiles')
        }
      } catch (dbError) {
        console.warn('⚠️ Error actualizando base de datos (continuando con estado local):', dbError)
      }

      // Actualizar el estado local del perfil
      if (profile) {
        setProfile({ ...profile, avatar_url: publicUrl } as Profile & { avatar_url: string })
      }

      console.log('✅ Avatar actualizado exitosamente')
      return { url: publicUrl }
    } catch (error) {
      console.error('❌ Error completo actualizando avatar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido actualizando avatar'
      return { error: new Error(errorMessage) }
    }
  }

  const getInitials = () => {
    if (!profile) return 'U'
    return `${profile.nombre[0]}${profile.apellido[0]}`.toUpperCase()
  }

  const getFullName = () => {
    if (!profile) return 'Usuario'
    return `${profile.nombre} ${profile.apellido}`
  }

  return {
    profile,
    loading,
    updateProfile,
    updateAvatar,
    getInitials,
    getFullName,
    refetch: fetchProfile,
  }
}