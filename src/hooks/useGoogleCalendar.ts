import { useState, useEffect } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'
import { GoogleCalendarService, storeGoogleTokens, getGoogleTokens, ensureValidTokens, type CalendarEvent } from '@/lib/googleCalendar'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = `${window.location.origin}/calendar/callback`

export function useGoogleCalendar() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const { user } = useAuth()

  const calendarService = new GoogleCalendarService({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: REDIRECT_URI,
  })

  useEffect(() => {
    checkConnection()
  }, [user])

  const checkConnection = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const tokens = await getGoogleTokens(user.id)
      setIsConnected(!!tokens)
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error)
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  const connect = () => {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured')
    }
    
    const authUrl = calendarService.getAuthUrl()
    window.location.href = authUrl
  }

  const handleCallback = async (code: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const tokens = await calendarService.exchangeCodeForTokens(code)
      
      await storeGoogleTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token,
        tokens.expires_in,
        tokens.scope
      )

      setIsConnected(true)
      return true
    } catch (error) {
      console.error('Error handling Google Calendar callback:', error)
      throw error
    }
  }

  const disconnect = async () => {
    if (!user) return

    try {
      // In a real implementation, you would also revoke the token with Google
      // For now, we just remove it from our database
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setIsConnected(false)
      setEvents([])
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      throw error
    }
  }

  const fetchEvents = async (timeMin?: string, timeMax?: string) => {
    if (!user || !isConnected) return

    try {
      const accessToken = await ensureValidTokens(user.id, calendarService)
      const googleEvents = await calendarService.getEvents(accessToken, timeMin, timeMax)
      setEvents(googleEvents)
      return googleEvents
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      throw error
    }
  }

  const createEvent = async (event: CalendarEvent) => {
    if (!user || !isConnected) throw new Error('Not connected to Google Calendar')

    try {
      const accessToken = await ensureValidTokens(user.id, calendarService)
      const createdEvent = await calendarService.createEvent(accessToken, event)
      
      // Refresh events list
      await fetchEvents()
      
      return createdEvent
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw error
    }
  }

  const updateEvent = async (eventId: string, event: CalendarEvent) => {
    if (!user || !isConnected) throw new Error('Not connected to Google Calendar')

    try {
      const accessToken = await ensureValidTokens(user.id, calendarService)
      const updatedEvent = await calendarService.updateEvent(accessToken, eventId, event)
      
      // Refresh events list
      await fetchEvents()
      
      return updatedEvent
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw error
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!user || !isConnected) throw new Error('Not connected to Google Calendar')

    try {
      const accessToken = await ensureValidTokens(user.id, calendarService)
      await calendarService.deleteEvent(accessToken, eventId)
      
      // Refresh events list
      await fetchEvents()
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw error
    }
  }

  return {
    isConnected,
    loading,
    events,
    connect,
    disconnect,
    handleCallback,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    refetch: checkConnection,
  }
}