import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    console.log('🔄 Inicializando hook de autenticación...')
    
    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        console.log('🔍 Obteniendo sesión inicial...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('❌ Error obteniendo sesión inicial:', error)
        } else {
          console.log('📊 Sesión inicial:', session ? 'Encontrada' : 'No encontrada')
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('❌ Error en getInitialSession:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, session ? 'Con sesión' : 'Sin sesión')
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // Log adicional para debugging
        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuario deslogueado')
        } else if (event === 'SIGNED_IN') {
          console.log('👋 Usuario logueado:', session?.user?.email)
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token renovado')
        }
      }
    )

    return () => {
      console.log('🧹 Limpiando suscripción de auth')
      subscription.unsubscribe()
    }
  }, [])

  // Función para preservar sesión antes de OAuth
  const preserveSessionForOAuth = () => {
    if (session) {
      console.log('💾 Preservando sesión para OAuth...')
      localStorage.setItem('lawconnect-oauth-session', JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user_id: session.user.id,
        timestamp: Date.now()
      }))
    }
  }

  // Función para restaurar sesión después de OAuth
  const restoreSessionAfterOAuth = async () => {
    const preserved = localStorage.getItem('lawconnect-oauth-session')
    if (preserved) {
      try {
        const sessionData = JSON.parse(preserved)
        const age = Date.now() - sessionData.timestamp
        
        // Solo restaurar si la sesión es reciente (menos de 10 minutos)
        if (age < 10 * 60 * 1000) {
          console.log('🔄 Restaurando sesión después de OAuth...')
          
          // Intentar refrescar la sesión
          const { data, error } = await supabase.auth.setSession({
            access_token: sessionData.access_token,
            refresh_token: sessionData.refresh_token
          })
          
          if (!error && data.session) {
            console.log('✅ Sesión restaurada exitosamente')
            setSession(data.session)
            setUser(data.session.user)
          }
        }
        
        // Limpiar datos preservados
        localStorage.removeItem('lawconnect-oauth-session')
      } catch (error) {
        console.error('❌ Error restaurando sesión:', error)
        localStorage.removeItem('lawconnect-oauth-session')
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('🔑 Intentando iniciar sesión para:', email)
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Error en signIn:', error)
        throw error
      }

      console.log('✅ Inicio de sesión exitoso')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Excepción en signIn:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, metadata?: any) => {
    console.log('📝 Intentando registrar usuario:', email)
    setLoading(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/confirm-email`
        }
      })

      if (error) {
        console.error('❌ Error en signUp:', error)
        throw error
      }

      console.log('✅ Registro exitoso')
      return { data, error: null }
    } catch (error) {
      console.error('❌ Excepción en signUp:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('👋 Cerrando sesión...')
    setLoading(true)
    
    try {
      // Limpiar cualquier dato OAuth preservado
      localStorage.removeItem('lawconnect-oauth-session')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('❌ Error en signOut:', error)
        throw error
      }

      console.log('✅ Sesión cerrada exitosamente')
    } catch (error) {
      console.error('❌ Excepción en signOut:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    console.log('🔐 Solicitando reset de contraseña para:', email)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        console.error('❌ Error en resetPassword:', error)
        throw error
      }

      console.log('✅ Email de reset enviado')
      return { error: null }
    } catch (error) {
      console.error('❌ Excepción en resetPassword:', error)
      return { error }
    }
  }

  const updatePassword = async (newPassword: string) => {
    console.log('🔐 Actualizando contraseña...')
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        console.error('❌ Error en updatePassword:', error)
        throw error
      }

      console.log('✅ Contraseña actualizada')
      return { error: null }
    } catch (error) {
      console.error('❌ Excepción en updatePassword:', error)
      return { error }
    }
  }

  const resendConfirmation = async (email: string) => {
    console.log('📧 Reenviando confirmación para:', email)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email`
        }
      })

      if (error) {
        console.error('❌ Error en resendConfirmation:', error)
        throw error
      }

      console.log('✅ Email de confirmación reenviado')
      return { error: null }
    } catch (error) {
      console.error('❌ Excepción en resendConfirmation:', error)
      return { error }
    }
  }

  return {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    resendConfirmation,
    preserveSessionForOAuth,
    restoreSessionAfterOAuth,
  }
}