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
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${new Date().toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events')
    }

    const data = await response.json()
    return data.items || []
  }

  // Create a new calendar event
  async createEvent(accessToken: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
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

    if (!response.ok) {
      throw new Error('Failed to create calendar event')
    }

    return response.json()
  }

  // Update an existing calendar event
  async updateEvent(accessToken: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
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

    if (!response.ok) {
      throw new Error('Failed to update calendar event')
    }

    return response.json()
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

// Get stored tokens from Supabase (sin cambios)
export async function getGoogleTokens(userId: string) {
  const { data, error } = await supabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return null
  }

  return data
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