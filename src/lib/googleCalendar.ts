import { supabase } from './supabase'

export interface GoogleCalendarConfig {
  clientId: string
  // Client Secret se maneja SOLO en Supabase Edge Functions
  redirectUri: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
    responseStatus?: string
  }>
  status?: string
  htmlLink?: string
  // Recordatorios de Google Calendar
  reminders?: {
    useDefault?: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
  // Campos para asociación con casos y tags del sistema LawConnect
  caso_id?: string
  cliente_id?: string
  tags?: string[]
}

export class GoogleCalendarService {
  private config: GoogleCalendarConfig

  constructor(config: GoogleCalendarConfig) {
    this.config = config
  }

  // Generate OAuth URL for Google Calendar authorization (solo usa Client ID público)
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  // Exchange authorization code for tokens usando SOLO Supabase Edge Function
  async exchangeCodeForTokens(code: string, userId: string): Promise<boolean> {
    console.log('🔄 Intercambiando código por tokens usando Supabase Edge Function...')
    
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
          code,
          userId,
          redirectUri: this.config.redirectUri,
        },
      })

      if (error) {
        console.error('❌ Error en Edge Function:', error)
        throw new Error(`Error en Edge Function: ${error.message}`)
      }

      if (!data?.success) {
        console.error('❌ Edge Function no devolvió éxito:', data)
        throw new Error('Edge Function no completó exitosamente')
      }

      console.log('✅ Edge Function completada exitosamente')
      return true

    } catch (error) {
      console.error('❌ Error llamando Edge Function:', error)
      
      // Verificar si es un error de Edge Function no desplegada
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error('Las Edge Functions no están desplegadas. Ve a tu Dashboard de Supabase → Edge Functions para desplegarlas.')
      }
      
      throw error
    }
  }

  // Refresh access token usando SOLO Supabase Edge Function
  async refreshAccessToken(userId: string): Promise<string> {
    console.log('🔄 Renovando tokens usando Supabase Edge Function...')
    
    try {
      const { data, error } = await supabase.functions.invoke('google-oauth-refresh', {
        body: { userId },
      })

      if (error) {
        console.error('❌ Error en Edge Function refresh:', error)
        throw new Error(`Error renovando tokens: ${error.message}`)
      }

      if (!data?.access_token) {
        console.error('❌ Edge Function no devolvió access_token:', data)
        throw new Error('No se pudo renovar el token de acceso')
      }

      console.log('✅ Tokens renovados exitosamente')
      return data.access_token

    } catch (error) {
      console.error('❌ Error renovando tokens:', error)
      
      // Verificar si es un error de Edge Function no desplegada
      if (error instanceof Error && error.message.includes('not found')) {
        throw new Error('Las Edge Functions no están desplegadas para renovación de tokens.')
      }
      
      throw error
    }
  }

  // Fetch calendar events from Google Calendar API
  async getEvents(accessToken: string, maxResults = 10): Promise<CalendarEvent[]> {
    console.log('📅 getEvents - Obteniendo eventos de Google Calendar...')
    console.log('📅 getEvents - maxResults:', maxResults)
    console.log('📅 getEvents - Token:', accessToken ? `Disponible (${accessToken.substring(0, 10)}...)` : 'NO DISPONIBLE')
    
    const timeMin = new Date().toISOString()
    console.log('📅 getEvents - timeMin:', timeMin)
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${timeMin}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('📅 getEvents - Respuesta HTTP status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ getEvents - Error en respuesta:', errorText)
      throw new Error(`Failed to fetch calendar events: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('📅 getEvents - Respuesta completa de Google:', data)
    console.log('📅 getEvents - Número de eventos encontrados:', data.items ? data.items.length : 0)
    
    if (data.items && data.items.length > 0) {
      console.log('📅 getEvents - Primeros eventos:', data.items.slice(0, 3).map((event: any) => ({
        id: event.id,
        summary: event.summary,
        start: event.start
      })))
    }
    
    return data.items || []
  }

  // Create a new calendar event
  async createEvent(accessToken: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    console.log('➕ createEvent - Datos del evento a crear:', event)
    console.log('➕ createEvent - Token de acceso:', accessToken ? `Disponible (${accessToken.substring(0, 10)}...)` : 'NO DISPONIBLE')
    
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    console.log('➕ createEvent - Respuesta HTTP status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ createEvent - Error en respuesta:', errorText)
      throw new Error(`Failed to create calendar event: ${response.status} - ${errorText}`)
    }

    const createdEvent = await response.json()
    console.log('✅ createEvent - Evento creado exitosamente:', {
      id: createdEvent.id,
      summary: createdEvent.summary,
      htmlLink: createdEvent.htmlLink
    })
    
    return createdEvent
  }

  // Update an existing calendar event
  async updateEvent(accessToken: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    console.log('✏️ updateEvent - ID del evento:', eventId)
    console.log('✏️ updateEvent - Datos a actualizar:', event)
    
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    console.log('✏️ updateEvent - Respuesta HTTP status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ updateEvent - Error en respuesta:', errorText)
      throw new Error(`Failed to update calendar event: ${response.status} - ${errorText}`)
    }

    const updatedEvent = await response.json()
    console.log('✅ updateEvent - Evento actualizado exitosamente:', {
      id: updatedEvent.id,
      summary: updatedEvent.summary
    })

    return updatedEvent
  }

  // Delete a calendar event
  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete calendar event')
    }
  }
}

// Store Google Calendar tokens in Supabase (sin cambios - sigue siendo seguro)
export async function storeGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scope: string
) {
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  const { error } = await supabase
    .from('google_calendar_tokens')
    .upsert({
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt.toISOString(),
      scope,
    })

  if (error) {
    throw new Error('Failed to store Google Calendar tokens')
  }
}

// Get stored tokens from Supabase - Manejo robusto de múltiples filas
export async function getGoogleTokens(userId: string) {
  console.log('🔍 getGoogleTokens - Consultando tokens para usuario:', userId)
  
  try {
    // Obtener todos los tokens para el usuario, ordenados por fecha de creación (más reciente primero)
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .order('expires_at', { ascending: false })  // El más reciente primero
    
    if (error) {
      console.error('❌ Error consultando tokens:', error)
      return null
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No se encontraron tokens para el usuario')
      return null
    }

    // Si hay múltiples filas, usar la más reciente
    if (data.length > 1) {
      console.log(`⚠️ Se encontraron ${data.length} tokens para el usuario, usando el más reciente`)
      
      // Limpiar tokens duplicados (mantener solo el más reciente)
      const tokensToDelete = data.slice(1) // Todos excepto el primero (más reciente)
      if (tokensToDelete.length > 0) {
        console.log(`🧹 Limpiando ${tokensToDelete.length} tokens duplicados...`)
        const idsToDelete = tokensToDelete.map(token => token.id).filter(Boolean)
        
        if (idsToDelete.length > 0) {
          await supabase
            .from('google_calendar_tokens')
            .delete()
            .in('id', idsToDelete)
          console.log('✅ Tokens duplicados eliminados')
        }
      }
    }

    const token = data[0] // El más reciente
    console.log('✅ Token encontrado:', {
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      expiresAt: token.expires_at,
      isExpired: new Date(token.expires_at) < new Date()
    })

    return token

  } catch (error) {
    console.error('❌ Excepción en getGoogleTokens:', error)
    return null
  }
}

// Check if tokens need refresh and refresh if necessary usando Supabase Edge Function
export async function ensureValidTokens(userId: string, calendarService: GoogleCalendarService) {
  const tokens = await getGoogleTokens(userId)
  if (!tokens) {
    throw new Error('No Google Calendar tokens found')
  }

  const now = new Date()
  const expiresAt = new Date(tokens.expires_at)

  // If token expires in less than 5 minutes, refresh it usando Supabase Edge Function
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const newAccessToken = await calendarService.refreshAccessToken(userId)
    return newAccessToken
  }

  return tokens.access_token
}