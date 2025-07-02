import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
import { GoogleCalendarService, getGoogleTokens, ensureValidTokens, type CalendarEvent } from '@/lib/googleCalendar'
import type { User } from '@supabase/supabase-js'

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

  // Verificar si el usuario tiene tokens de Google Calendar (memoizada)
  const checkConnection = useCallback(async () => {
    console.log('🔍 checkConnection llamada - Usuario:', user ? user.id : 'No disponible')
    
    if (!user) {
      console.log('⚠️ No hay usuario, marcando como no conectado')
      setLoading(false)
      setIsConnected(false)
      return
    }

    try {
      console.log('🔍 Verificando conexión de Google Calendar para usuario:', user.id)
      setLoading(true) // Marcar como cargando durante la verificación
      
      const tokens = await getGoogleTokens(user.id)
      console.log('🔍 Tokens obtenidos de BD:', tokens ? 'Encontrados' : 'No encontrados')
      
      if (tokens) {
        console.log('📊 Detalles de tokens:', {
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresAt: tokens.expires_at,
          isExpired: new Date(tokens.expires_at) < new Date()
        })
      }
      
      const connected = !!tokens
      console.log('📊 Estado de conexión determinado:', connected ? 'Conectado' : 'No conectado')
      setIsConnected(connected)
    } catch (error) {
      console.error('❌ Error verificando conexión de Google Calendar:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
      console.log('✅ checkConnection completada')
    }
  }, [user])

  // Función para forzar recarga del estado de conexión
  const forceRefresh = useCallback(async () => {
    console.log('🔄 forceRefresh llamada - Forzando refresh del estado de Google Calendar...')
    setLoading(true)
    await checkConnection()
    console.log('✅ forceRefresh completada')
  }, [checkConnection])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Iniciar proceso de conexión OAuth (memoizada)
  const connect = useCallback(() => {
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
  }, [preserveSessionForOAuth, calendarService])

  // Completar proceso OAuth con código de autorización usando Supabase Edge Functions (memoizada)
  // Ahora recibe el usuario como parámetro para evitar referencias stale
  const handleOAuthCallback = useCallback(async (code: string, currentUser?: User) => {
    // Usar el usuario pasado como parámetro o el del hook como fallback
    const userToUse = currentUser || user
    
    console.log('🔄 handleOAuthCallback - Usuario del parámetro:', currentUser ? currentUser.id : 'No proporcionado')
    console.log('🔄 handleOAuthCallback - Usuario del hook:', user ? user.id : 'No disponible')
    console.log('🔄 handleOAuthCallback - Usuario a usar:', userToUse ? userToUse.id : 'No disponible')
    
    if (!userToUse) {
      throw new Error('User not authenticated')
    }

    console.log('🔄 Procesando callback OAuth para usuario:', userToUse.id)
    console.log('🔑 Código recibido:', code.substring(0, 10) + '...')

    try {
      // Usar SOLO Supabase Edge Functions (arquitectura segura)
      console.log('📡 Llamando a Edge Function google-oauth...')
      console.log('📡 Parámetros:', {
        codeLength: code.length,
        userId: userToUse.id,
        redirectUri: REDIRECT_URI
      })
      
      const response = await calendarService.exchangeCodeForTokens(code, userToUse.id)
      console.log('📡 Respuesta de Edge Function:', response)
      
      console.log('✅ OAuth callback procesado exitosamente')
      setIsConnected(true)
      
      // Verificar inmediatamente que los tokens se guardaron
      console.log('🔍 Verificando tokens guardados inmediatamente...')
      const savedTokens = await getGoogleTokens(userToUse.id)
      console.log('🔍 Tokens verificados después de guardar:', savedTokens ? 'Encontrados' : 'NO ENCONTRADOS')
      
      if (!savedTokens) {
        console.error('❌ PROBLEMA: Los tokens no se guardaron en la BD después del OAuth')
        throw new Error('Los tokens no se guardaron correctamente en la base de datos')
      }
      
      return true
    } catch (error) {
      console.error('❌ Error en OAuth callback:', error)
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      throw error
    }
  }, [user, calendarService])

  // Desconectar Google Calendar (memoizada)
  const disconnect = useCallback(async () => {
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
  }, [user])

  // Obtener eventos del calendario (memoizada)
  const fetchEvents = useCallback(async () => {
    if (!user || !isConnected) {
      console.log('⚠️ Hook fetchEvents - No se puede obtener eventos: user =', !!user, 'isConnected =', isConnected)
      return []
    }

    try {
      console.log('📅 Hook fetchEvents - Iniciando obtención de eventos...')
      console.log('📅 Hook fetchEvents - Usuario:', user.id)
      console.log('📅 Hook fetchEvents - isConnected:', isConnected)
      setLoading(true)
      
      console.log('🔑 Hook fetchEvents - Obteniendo/renovando tokens...')
      // Asegurar que los tokens sean válidos (renovar si es necesario usando Edge Functions)
      const accessToken = await ensureValidTokens(user.id, calendarService)
      console.log('🔑 Hook fetchEvents - Token obtenido/renovado:', accessToken ? `Disponible (${accessToken.substring(0, 10)}...)` : 'NO DISPONIBLE')
      
      console.log('📡 Hook fetchEvents - Llamando API de Google Calendar...')
      // Obtener eventos de Google Calendar
      const calendarEvents = await calendarService.getEvents(accessToken, 10)
      console.log('📅 Hook fetchEvents - Eventos obtenidos de Google:', calendarEvents.length)
      
      // Obtener datos locales de eventos (casos, clientes, tags)
      console.log('💾 Hook fetchEvents - Obteniendo datos locales...')
      const { data: localEvents } = await supabase
        .from('calendar_events')
        .select('google_event_id, caso_id, cliente_id')
        .eq('user_id', user.id)

      // Obtener tags de eventos desde event_tags
      console.log('🏷️ Hook fetchEvents - Obteniendo tags de eventos...')
      const eventIds = calendarEvents.map(e => e.id).filter(Boolean)
      const { data: eventTagsData } = await supabase
        .from('event_tags')
        .select('event_id, tag_id')
        .eq('user_id', user.id)
        .in('event_id', eventIds)

      // Crear un mapa de tags por evento
      const eventTagsMap = new Map<string, string[]>()
      eventTagsData?.forEach(et => {
        if (!eventTagsMap.has(et.event_id)) {
          eventTagsMap.set(et.event_id, [])
        }
        eventTagsMap.get(et.event_id)?.push(et.tag_id)
      })

      // Combinar eventos de Google Calendar con datos locales
      const enrichedEvents = calendarEvents.map(googleEvent => {
        const localEvent = localEvents?.find(le => le.google_event_id === googleEvent.id)
        const eventTags = eventTagsMap.get(googleEvent.id || '') || []
        
        return {
          ...googleEvent,
          caso_id: localEvent?.caso_id || undefined,
          cliente_id: localEvent?.cliente_id || undefined,
          tags: eventTags
        }
      })
      
      if (enrichedEvents.length > 0) {
        console.log('📅 Hook fetchEvents - Primeros eventos enriquecidos:', enrichedEvents.slice(0, 3).map(event => ({
          id: event.id,
          summary: event.summary,
          start: event.start,
          caso_id: event.caso_id,
          tags: event.tags
        })))
      }
      
      console.log('💾 Hook fetchEvents - Actualizando estado local...')
      setEvents(enrichedEvents)
      
      console.log('✅ Hook fetchEvents - Proceso completado exitosamente')
      return enrichedEvents
    } catch (error) {
      console.error('❌ Hook fetchEvents - Error obteniendo eventos del calendario:', error)
      console.error('❌ Hook fetchEvents - Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      
      // Si hay error de autenticación, desconectar
      if (error instanceof Error && error.message.includes('401')) {
        console.log('🔌 Hook fetchEvents - Error de autenticación detectado, desconectando...')
        await disconnect()
      }
      throw error
    } finally {
      setLoading(false)
      console.log('🏁 Hook fetchEvents - setLoading(false) completado')
    }
  }, [user, isConnected, calendarService, disconnect])

  // Crear evento (memoizada)
  const createEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    if (!user || !isConnected) {
      throw new Error('User not connected to Google Calendar')
    }

    try {
      console.log('➕ Hook createEvent - Iniciando creación de evento...')
      console.log('➕ Hook createEvent - Usuario:', user.id)
      console.log('➕ Hook createEvent - isConnected:', isConnected)
      console.log('➕ Hook createEvent - Datos del evento:', eventData)
      
      console.log('🔑 Hook createEvent - Obteniendo token de acceso...')
      const accessToken = await ensureValidTokens(user.id, calendarService)
      console.log('🔑 Hook createEvent - Token obtenido:', accessToken ? `Disponible (${accessToken.substring(0, 10)}...)` : 'NO DISPONIBLE')
      
      console.log('📡 Hook createEvent - Llamando API de Google Calendar...')
      const newEvent = await calendarService.createEvent(accessToken, eventData)
      
      console.log('✅ Hook createEvent - Evento creado exitosamente:', newEvent.id)
      console.log('🔄 Hook createEvent - Actualizando lista local de eventos...')
      
      // Actualizar lista local de eventos
      await fetchEvents()
      
      console.log('✅ Hook createEvent - Proceso completado exitosamente')
      return newEvent
    } catch (error) {
      console.error('❌ Hook createEvent - Error creando evento del calendario:', error)
      console.error('❌ Hook createEvent - Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      throw error
    }
  }, [user, isConnected, calendarService, fetchEvents])

  // Actualizar evento (memoizada)
  const updateEvent = useCallback(async (eventId: string, eventData: Partial<CalendarEvent>) => {
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
  }, [user, isConnected, calendarService, fetchEvents])

  // Eliminar evento (memoizada)
  const deleteEvent = useCallback(async (eventId: string) => {
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
  }, [user, isConnected, calendarService, fetchEvents])

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
    forceRefresh,
  }
}