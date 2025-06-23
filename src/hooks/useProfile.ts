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
    getInitials,
    getFullName,
    refetch: fetchProfile,
  }
}