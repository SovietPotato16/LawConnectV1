import { supabase } from './supabase'

export interface GoogleCalendarConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
  }>
}

export class GoogleCalendarService {
  private config: GoogleCalendarConfig

  constructor(config: GoogleCalendarConfig) {
    this.config = config
  }

  // Generate OAuth URL for Google Calendar authorization
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

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens')
    }

    return response.json()
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    expires_in: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to refresh access token')
    }

    return response.json()
  }

  // Get user's calendar events
  async getEvents(accessToken: string, timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
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
  async createEvent(accessToken: string, event: CalendarEvent): Promise<CalendarEvent> {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
  async updateEvent(accessToken: string, eventId: string, event: CalendarEvent): Promise<CalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
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

// Store tokens in Supabase
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
    throw new Error(`Failed to store tokens: ${error.message}`)
  }
}

// Get stored tokens from Supabase
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

// Check if tokens need refresh and refresh if necessary
export async function ensureValidTokens(userId: string, calendarService: GoogleCalendarService) {
  const tokens = await getGoogleTokens(userId)
  if (!tokens) {
    throw new Error('No Google Calendar tokens found')
  }

  const now = new Date()
  const expiresAt = new Date(tokens.expires_at)

  // If token expires in less than 5 minutes, refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await calendarService.refreshAccessToken(tokens.refresh_token)
    
    await storeGoogleTokens(
      userId,
      refreshed.access_token,
      tokens.refresh_token,
      refreshed.expires_in,
      tokens.scope
    )

    return refreshed.access_token
  }

  return tokens.access_token
}