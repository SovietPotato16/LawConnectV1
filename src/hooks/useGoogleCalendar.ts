import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
import { GoogleCalendarService, getGoogleTokens, ensureValidTokens, type CalendarEvent } from '@/lib/googleCalendar'

// Solo usar Client ID público en el frontend - Client Secret manejado en Supabase Edge Functions
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const REDIRECT_URI = `${window.location.origin}/calendar/callback`

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const { user, preserveSessionForOAuth } = useAuth()

  // Crear servicio SOLO con datos públicos - Client Secret manejado en Supabase Edge Functions
  const calendarService = new GoogleCalendarService({
    clientId: GOOGLE_CLIENT_ID,
    redirectUri: REDIRECT_URI,
  })

  useEffect(() => {
    checkConnection()
  }, [user])

  // Verificar si el usuario tiene tokens de Google Calendar
  const checkConnection = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      console.log('🔍 Verificando conexión de Google Calendar para usuario:', user.id)
      const tokens = await getGoogleTokens(user.id)
      const connected = !!tokens
      console.log('📊 Estado de conexión:', connected ? 'Conectado' : 'No conectado')
      setIsConnected(connected)
    } catch (error) {
      console.error('❌ Error verificando conexión de Google Calendar:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  // Iniciar proceso de conexión OAuth (redirige a Google)
  const connect = () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured. Agrega VITE_GOOGLE_CLIENT_ID a tu archivo .env')
    }
    
    console.log('🚀 Iniciando conexión OAuth con Google Calendar')
    
    // ✅ PRESERVAR SESIÓN antes de redirigir
    console.log('💾 Preservando sesión antes de OAuth...')
    preserveSessionForOAuth()
    
    const authUrl = calendarService.getAuthUrl()
    console.log('🔗 URL de autorización:', authUrl)
    
    // Pequeño delay para asegurar que localStorage se actualice
    setTimeout(() => {
      window.location.href = authUrl
    }, 100)
  }

  // Completar proceso OAuth con código de autorización usando Supabase Edge Functions
  const handleOAuthCallback = async (code: string) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    console.log('🔄 Procesando callback OAuth para usuario:', user.id)
    console.log('🔑 Código recibido:', code.substring(0, 10) + '...')

    try {
      // Usar SOLO Supabase Edge Functions (arquitectura segura)
      await calendarService.exchangeCodeForTokens(code, user.id)
      console.log('✅ OAuth callback procesado exitosamente')
      setIsConnected(true)
      return true
    } catch (error) {
      console.error('❌ Error en OAuth callback:', error)
      throw error
    }
  }

  // Desconectar Google Calendar
  const disconnect = async () => {
    if (!user) return

    try {
      console.log('🔌 Desconectando Google Calendar para usuario:', user.id)
      
      // Eliminar tokens de la base de datos
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      console.log('✅ Google Calendar desconectado exitosamente')
      setIsConnected(false)
      setEvents([])
    } catch (error) {
      console.error('❌ Error desconectando Google Calendar:', error)
      throw error
    }
  }

  // Obtener eventos del calendario
  const fetchEvents = async () => {
    if (!user || !isConnected) return []

    try {
      console.log('📅 Obteniendo eventos del calendario para usuario:', user.id)
      setLoading(true)
      
      // Asegurar que los tokens sean válidos (renovar si es necesario usando Edge Functions)
      const accessToken = await ensureValidTokens(user.id, calendarService)
      console.log('🔑 Token de acceso obtenido/renovado')
      
      // Obtener eventos de Google Calendar
      const calendarEvents = await calendarService.getEvents(accessToken, 10)
      console.log('📅 Eventos obtenidos:', calendarEvents.length)
      setEvents(calendarEvents)
      return calendarEvents
    } catch (error) {
      console.error('❌ Error obteniendo eventos del calendario:', error)
      // Si hay error de autenticación, desconectar
      if (error instanceof Error && error.message.includes('401')) {
        console.log('🔌 Error de autenticación detectado, desconectando...')
        await disconnect()
      }
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Crear evento
  const createEvent = async (eventData: Partial<CalendarEvent>) => {
    if (!user || !isConnected) {
      throw new Error('User not connected to Google Calendar')
    }

    try {
      console.log('➕ Creando evento del calendario:', eventData.summary)
      const accessToken = await ensureValidTokens(user.id, calendarService)
      const newEvent = await calendarService.createEvent(accessToken, eventData)
      
      console.log('✅ Evento creado exitosamente:', newEvent.id)
      // Actualizar lista local de eventos
      await fetchEvents()
      return newEvent
    } catch (error) {
      console.error('❌ Error creando evento del calendario:', error)
      throw error
    }
  }

  // Actualizar evento
  const updateEvent = async (eventId: string, eventData: Partial<CalendarEvent>) => {
    if (!user || !isConnected) {
      throw new Error('User not connected to Google Calendar')
    }

    try {
      console.log('✏️ Actualizando evento del calendario:', eventId)
      const accessToken = await ensureValidTokens(user.id, calendarService)
      const updatedEvent = await calendarService.updateEvent(accessToken, eventId, eventData)
      
      console.log('✅ Evento actualizado exitosamente:', eventId)
      // Actualizar lista local de eventos
      await fetchEvents()
      return updatedEvent
    } catch (error) {
      console.error('❌ Error actualizando evento del calendario:', error)
      throw error
    }
  }

  // Eliminar evento
  const deleteEvent = async (eventId: string) => {
    if (!user || !isConnected) {
      throw new Error('User not connected to Google Calendar')
    }

    try {
      console.log('🗑️ Eliminando evento del calendario:', eventId)
      const accessToken = await ensureValidTokens(user.id, calendarService)
      await calendarService.deleteEvent(accessToken, eventId)
      
      console.log('✅ Evento eliminado exitosamente:', eventId)
      // Actualizar lista local de eventos
      await fetchEvents()
    } catch (error) {
      console.error('❌ Error eliminando evento del calendario:', error)
      throw error
    }
  }

  return {
    isConnected,
    loading,
    events,
    connect,
    disconnect,
    handleOAuthCallback,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  }
}