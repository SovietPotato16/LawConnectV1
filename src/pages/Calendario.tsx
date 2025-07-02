import { useState, useEffect } from 'react'
import { Calendar, Plus, Settings, ExternalLink, AlertCircle, Edit, Trash2, RefreshCw, Clock, MapPin, Bell, Grid, List, FolderOpen, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TagManager } from '@/components/TagManager'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/googleCalendar'
import type { Caso, Cliente, Tag } from '@/types'

// Tipos simplificados para esta página
interface CasoSimple {
  id: string
  titulo: string
  descripcion?: string
  estado: string
  prioridad: string
  created_at: string
  cliente?: { id: string; nombre: string }
}

interface ClienteSimple {
  id: string
  nombre: string
  email?: string
  empresa?: string
  created_at: string
}

export function Calendario() {
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [currentView, setCurrentView] = useState<'list' | 'month' | 'week'>('list')
  
  // Estados para casos y clientes
  const [casos, setCasos] = useState<CasoSimple[]>([])
  const [clientes, setClientes] = useState<ClienteSimple[]>([])
  const [loadingCasos, setLoadingCasos] = useState(false)
  const [tags, setTags] = useState<{ id: string; nombre: string; color: string }[]>([])
  
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    location: '',
    emailReminder: '15', // minutos antes
    popupReminder: '10', // minutos antes
    caso_id: '', // nuevo campo
    cliente_id: '', // nuevo campo  
    tags: [] as string[], // Reactivado - funcionalidad de tags
  })

  const { user } = useAuth()
  const {
    isConnected,
    loading,
    events,
    connect,
    disconnect,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    forceRefresh,
  } = useGoogleCalendar()

  // Funciones auxiliares para fechas y vistas de calendario
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(new Date())

  // Obtener el inicio de la semana (Lunes)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Ajustar para que lunes sea el primer día
    return new Date(d.setDate(diff))
  }

  // Obtener el inicio del mes
  const getMonthStart = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }

  // Obtener días de la semana
  const getWeekDays = (startDate: Date) => {
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Obtener días del mes
  const getMonthDays = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = getWeekStart(firstDay)
    
    const days = []
    const totalDays = 42 // 6 semanas * 7 días
    
    for (let i = 0; i < totalDays; i++) {
      const day = new Date(startDate)
      day.setDate(startDate.getDate() + i)
      days.push(day)
    }
    
    return days
  }

  // Filtrar eventos por día
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      if (!event.start.dateTime) return false
      const eventDate = new Date(event.start.dateTime)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  // Navegación de fechas
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (currentView === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else if (currentView === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  // Formatear título de la vista actual
  const getViewTitle = () => {
    if (currentView === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      return `${weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
    } else if (currentView === 'month') {
      return currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    }
    return 'Lista de eventos'
  }

  // Verificación inicial más robusta
  useEffect(() => {
    console.log('🔄 Calendario mounted - Usuario:', user ? user.id : 'No autenticado')
    console.log('🔄 Calendario mounted - isConnected:', isConnected)
    console.log('🔄 Calendario mounted - loading:', loading)
    
    if (user && !loading) {
      // Forzar verificación de conexión cuando el componente se monta
      console.log('🔄 Forzando verificación de estado de conexión...')
      setIsInitialLoad(false)
      // Cargar casos y clientes disponibles
      fetchCasos()
      fetchClientes()
      fetchTags()
    }
  }, [user, loading])

  // Verificación adicional cuando el usuario cambia
  useEffect(() => {
    if (user) {
      console.log('👤 Usuario disponible en Calendario:', user.id)
      console.log('📊 Estado actual - isConnected:', isConnected, 'loading:', loading)
      
      // Forzar refresh del estado de conexión
      console.log('🔄 Forzando refresh porque hay usuario...')
      forceRefresh()
    }
  }, [user, forceRefresh])

  // Fetch events when connected
  useEffect(() => {
    console.log('📅 useEffect fetchEvents - isConnected:', isConnected, 'isInitialLoad:', isInitialLoad)
    if (isConnected && !isInitialLoad) {
      console.log('📅 Obteniendo eventos porque isConnected=true')
      fetchEvents()
    }
  }, [isConnected, isInitialLoad])

  // Función para refrescar manualmente el estado de conexión
  const handleRefreshConnection = async () => {
    console.log('🔄 Refrescando estado de conexión manualmente...')
    await forceRefresh()
  }

  // Función para crear o actualizar evento
  const handleSaveEvent = async () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return

    try {
      console.log('💾 CREAR EVENTO - Iniciando proceso...')
      console.log('💾 CREAR EVENTO - Datos del formulario:', newEvent)
      
      // Configurar recordatorios
      const reminders: Array<{ method: 'email' | 'popup'; minutes: number }> = []
      
      if (newEvent.emailReminder !== 'none') {
        reminders.push({
          method: 'email',
          minutes: parseInt(newEvent.emailReminder)
        })
      }
      
      if (newEvent.popupReminder !== 'none') {
        reminders.push({
          method: 'popup',
          minutes: parseInt(newEvent.popupReminder)
        })
      }
      
      const event: Partial<CalendarEvent> = {
        summary: newEvent.summary,
        description: newEvent.description,
        start: {
          dateTime: new Date(newEvent.start).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(newEvent.end).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: newEvent.location,
        // Configurar recordatorios automáticos de Google Calendar
        reminders: {
          useDefault: false,
          overrides: reminders
        },
        // Incluir información de casos y tags (temporalmente simplificado)
        caso_id: newEvent.caso_id && newEvent.caso_id !== 'none' ? newEvent.caso_id : undefined,
        cliente_id: newEvent.cliente_id && newEvent.cliente_id !== 'none' ? newEvent.cliente_id : undefined,
        tags: newEvent.tags, // Reactivado
      }

      console.log('💾 CREAR EVENTO - Objeto evento preparado:', event)
      console.log('💾 CREAR EVENTO - Timezone detectado:', Intl.DateTimeFormat().resolvedOptions().timeZone)

      if (editingEvent?.id) {
        console.log('✏️ CREAR EVENTO - Actualizando evento existente:', editingEvent.id)
        // Actualizar evento existente
        const updatedEvent = await updateEvent(editingEvent.id, event)
        console.log('✅ CREAR EVENTO - Evento actualizado exitosamente en Google Calendar')
        
        // Asegurar que el evento actualizado tenga los tags
        const eventWithTags = {
          ...updatedEvent,
          tags: newEvent.tags,
          caso_id: newEvent.caso_id && newEvent.caso_id !== 'none' ? newEvent.caso_id : undefined,
          cliente_id: newEvent.cliente_id && newEvent.cliente_id !== 'none' ? newEvent.cliente_id : undefined,
        }
        
        console.log('💾 ACTUALIZAR EVENTO - Evento con tags:', eventWithTags)
        
        // Actualizar también en tabla local calendar_events si existe
        await updateLocalEvent(editingEvent.id, eventWithTags) // Reactivado
      } else {
        console.log('➕ CREAR EVENTO - Creando nuevo evento...')
        // Crear nuevo evento
        const createdEvent = await createEvent(event)
        console.log('✅ CREAR EVENTO - Evento creado exitosamente en Google Calendar:', createdEvent)
        
        // Asegurar que el evento creado tenga los tags
        const eventWithTags = {
          ...createdEvent,
          tags: newEvent.tags,
          caso_id: newEvent.caso_id && newEvent.caso_id !== 'none' ? newEvent.caso_id : undefined,
          cliente_id: newEvent.cliente_id && newEvent.cliente_id !== 'none' ? newEvent.cliente_id : undefined,
        }
        
        console.log('💾 CREAR EVENTO - Evento con tags:', eventWithTags)
        
        // Guardar también en tabla local calendar_events para tracking de casos/tags
        await saveLocalEvent(eventWithTags) // Reactivado
      }

      console.log('🔄 CREAR EVENTO - Cerrando modal y limpiando formulario...')
      // Limpiar formulario y cerrar modal
      handleCloseModal()
      
      console.log('🔄 CREAR EVENTO - Refrescando eventos...')
      // Refrescar eventos para cargar tags actualizados
      await fetchEvents()
      
      console.log('✅ CREAR EVENTO - Proceso completado')
    } catch (error) {
      console.error('❌ CREAR EVENTO - Error saving event:', error)
      console.error('❌ CREAR EVENTO - Stack trace:', error instanceof Error ? error.stack : 'No stack available')
      
      // Aquí podrías agregar una notificación al usuario del error
      alert('Error al guardar el evento: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    }
  }

  // Función para guardar evento en tabla local calendar_events
  const saveLocalEvent = async (googleEvent: CalendarEvent) => {
    if (!user) return

    try {
      console.log('💾 Guardando evento en tabla local calendar_events...')
      
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          google_event_id: googleEvent.id,
          user_id: user.id,
          titulo: googleEvent.summary,
          descripcion: googleEvent.description || null,
          fecha_inicio: googleEvent.start.dateTime || '',
          fecha_fin: googleEvent.end.dateTime || '',
          ubicacion: googleEvent.location || null,
          caso_id: googleEvent.caso_id || null,
          cliente_id: googleEvent.cliente_id || null,
          is_synced_with_google: true,
        })

      if (error) throw error

      // Guardar tags si existen
      if (googleEvent.tags && googleEvent.tags.length > 0) {
        await saveEventTags(googleEvent.id, googleEvent.tags)
      }

      console.log('✅ Evento guardado en tabla local exitosamente')
    } catch (error) {
      console.error('❌ Error guardando evento en tabla local:', error)
      // No lanzar error para no interrumpir el flujo principal
    }
  }

  // Función para actualizar evento en tabla local calendar_events
  const updateLocalEvent = async (eventId: string, googleEvent: CalendarEvent) => {
    if (!user) return

    try {
      console.log('💾 Actualizando evento en tabla local calendar_events...')
      
      const { error } = await supabase
        .from('calendar_events')
        .update({
          titulo: googleEvent.summary,
          descripcion: googleEvent.description || null,
          fecha_inicio: googleEvent.start.dateTime || '',
          fecha_fin: googleEvent.end.dateTime || '',
          ubicacion: googleEvent.location || null,
          caso_id: googleEvent.caso_id || null,
          cliente_id: googleEvent.cliente_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('google_event_id', eventId)
        .eq('user_id', user.id)

      if (error) throw error

      // Actualizar tags
      if (googleEvent.tags && googleEvent.tags.length > 0) {
        await saveEventTags(eventId, googleEvent.tags)
      }

      console.log('✅ Evento actualizado en tabla local exitosamente')
    } catch (error) {
      console.error('❌ Error actualizando evento en tabla local:', error)
    }
  }

  // Función para guardar tags de eventos
  const saveEventTags = async (eventId: string, tagIds: string[]) => {
    if (!user) {
      console.log('⚠️ saveEventTags - No hay usuario')
      return
    }

    console.log('🏷️ saveEventTags - Iniciando para evento:', eventId)
    console.log('🏷️ saveEventTags - Tags a guardar:', tagIds)
    console.log('🏷️ saveEventTags - Usuario:', user.id)

    try {
      // Primero eliminar tags existentes del evento
      console.log('🗑️ saveEventTags - Eliminando tags existentes...')
      const { error: deleteError } = await supabase
        .from('event_tags')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (deleteError) {
        console.error('❌ saveEventTags - Error eliminando tags existentes:', deleteError)
        throw deleteError
      }

      console.log('✅ saveEventTags - Tags existentes eliminados')

      // Si no hay tags nuevos, terminar aquí
      if (!tagIds.length) {
        console.log('ℹ️ saveEventTags - No hay tags para agregar, terminando')
        return
      }

      // Agregar nuevos tags
      console.log('➕ saveEventTags - Insertando nuevos tags...')
      const tagInserts = tagIds.map(tagId => ({
        event_id: eventId,
        tag_id: tagId,
        user_id: user.id,
      }))

      console.log('➕ saveEventTags - Datos a insertar:', tagInserts)

      const { error } = await supabase
        .from('event_tags')
        .insert(tagInserts)

      if (error) {
        console.error('❌ saveEventTags - Error insertando tags:', error)
        throw error
      }
      
      console.log('✅ saveEventTags - Tags del evento guardados exitosamente')

      // Verificar que se guardaron
      const { data: verificacion } = await supabase
        .from('event_tags')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      console.log('🔍 saveEventTags - Verificación tags guardados:', verificacion)
    } catch (error) {
      console.error('❌ saveEventTags - Error guardando tags del evento:', error)
    }
  }

  // Función para abrir modal de edición
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setNewEvent({
      summary: event.summary || '',
      description: event.description || '',
      start: event.start.dateTime ? new Date(event.start.dateTime).toISOString().slice(0, 16) : '',
      end: event.end.dateTime ? new Date(event.end.dateTime).toISOString().slice(0, 16) : '',
      location: event.location || '',
      emailReminder: '15', // Default para edición
      popupReminder: '10', // Default para edición
      caso_id: event.caso_id || '',
      cliente_id: event.cliente_id || '',
      tags: event.tags || [],
    })
    setIsCreateEventOpen(true)
  }

  // Función para eliminar evento
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return

    try {
      await deleteEvent(eventId)
    } catch (error) {
      console.error('Error deleting event:', error)
    }
  }

  // Función para cerrar modal y limpiar estado
  const handleCloseModal = () => {
    setIsCreateEventOpen(false)
    setEditingEvent(null)
    setNewEvent({
      summary: '',
      description: '',
      start: '',
      end: '',
      location: '',
      emailReminder: '15',
      popupReminder: '10',
      caso_id: '',
      cliente_id: '',
      tags: [],
    })
  }

  // Función para obtener casos disponibles
  const fetchCasos = async () => {
    if (!user) return

    try {
      setLoadingCasos(true)
      console.log('📁 Obteniendo casos disponibles...')
      
      const { data, error } = await supabase
        .from('casos')
        .select(`
          id,
          titulo,
          descripcion,
          estado,
          prioridad,
          created_at,
          cliente:clientes(id, nombre)
        `)
        .eq('user_id', user.id)
        .in('estado', ['Activo', 'Pendiente', 'En Revisión']) // Solo casos activos
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transformar datos para que coincidan con nuestros tipos
      const casosTransformados = (data || []).map(caso => ({
        ...caso,
        cliente: Array.isArray(caso.cliente) && caso.cliente.length > 0 
          ? caso.cliente[0] 
          : undefined
      }))
      
      setCasos(casosTransformados)
      console.log('✅ Casos obtenidos:', casosTransformados.length)
    } catch (error) {
      console.error('❌ Error obteniendo casos:', error)
    } finally {
      setLoadingCasos(false)
    }
  }

  // Función para obtener clientes disponibles  
  const fetchClientes = async () => {
    if (!user) return

    try {
      console.log('👥 Obteniendo clientes disponibles...')
      
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, email, empresa, created_at')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error
      
      setClientes(data || [])
      console.log('✅ Clientes obtenidos:', data?.length || 0)
    } catch (error) {
      console.error('❌ Error obteniendo clientes:', error)
    }
  }

  // Función para obtener tags disponibles
  const fetchTags = async () => {
    if (!user) return

    try {
      console.log('🏷️ Obteniendo tags disponibles...')
      
      const { data, error } = await supabase
        .from('tags')
        .select('id, nombre, color')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error
      
      setTags(data || [])
      console.log('✅ Tags obtenidos:', data?.length || 0)
    } catch (error) {
      console.error('❌ Error obteniendo tags:', error)
    }
  }

  // Función para obtener el nombre de un tag por ID
  const getTagName = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    return tag ? tag.nombre : `tag-${tagId.substring(0, 6)}`
  }

  // Función para obtener el color de un tag por ID
  const getTagColor = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    return tag ? tag.color : '#89b4fa'
  }

  // Función para obtener tags de un evento desde la base de datos
  const getEventTags = async (eventId: string): Promise<string[]> => {
    if (!user) return []

    try {
      const { data, error } = await supabase
        .from('event_tags')
        .select('tag_id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)

      if (error) throw error
      return data?.map(et => et.tag_id) || []
    } catch (error) {
      console.error('❌ Error obteniendo tags del evento:', error)
      return []
    }
  }

  // Función para obtener el color del evento basado en el primer tag
  const getEventColor = (event: CalendarEvent) => {
    console.log('🎨 getEventColor - Evento:', event.id, 'Tags:', event.tags)
    if (event.tags && event.tags.length > 0) {
      const color = getTagColor(event.tags[0])
      console.log('🎨 getEventColor - Color obtenido:', color, 'para tag:', event.tags[0])
      return color
    }
    console.log('🎨 getEventColor - Sin tags, usando color por defecto')
    return '#89b4fa' // Color por defecto
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue mx-auto"></div>
          <div className="text-subtext0">Verificando conexión de Google Calendar...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Panel de Diagnóstico (temporal) */}
      {isConnected && (
        <Card className="bg-surface0 border-blue/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue">Estado de Diagnóstico (Temporal)</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-subtext0">Usuario:</span>
                <p className="font-mono text-xs">{user?.id.substring(0, 8)}...</p>
              </div>
              <div>
                <span className="text-subtext0">Conectado:</span>
                <p className={isConnected ? 'text-green' : 'text-red'}>{isConnected ? 'Sí' : 'No'}</p>
              </div>
              <div>
                <span className="text-subtext0">Cargando:</span>
                <p className={loading ? 'text-yellow' : 'text-green'}>{loading ? 'Sí' : 'No'}</p>
              </div>
              <div>
                <span className="text-subtext0">Eventos:</span>
                <p className="font-bold">{events.length}</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  console.log('🎯 DIAGNÓSTICO - Estado actual:')
                  console.log('  - Usuario:', user?.id)
                  console.log('  - isConnected:', isConnected)
                  console.log('  - loading:', loading)
                  console.log('  - events.length:', events.length)
                  console.log('  - events:', events)
                }}
              >
                Imprimir Estado en Consola
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Calendario</h1>
          <p className="text-subtext0">Gestiona tu agenda y citas</p>
        </div>
        <div className="flex gap-3">
          {isConnected && (
            <>
              {/* Selector de Vista */}
              <div className="flex bg-surface1 rounded-lg p-1">
                <Button
                  variant={currentView === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('list')}
                  className="h-8"
                >
                  <List className="h-4 w-4 mr-1" />
                  Lista
                </Button>
                <Button
                  variant={currentView === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('week')}
                  className="h-8"
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Semana
                </Button>
                <Button
                  variant={currentView === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCurrentView('month')}
                  className="h-8"
                >
                  <Grid className="h-4 w-4 mr-1" />
                  Mes
                </Button>
              </div>
            </>
          )}
          
          {isConnected ? (
            <>
              <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEvent ? 'Editar cita' : 'Crear nueva cita'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 p-1">
                    <div className="space-y-2">
                      <Label htmlFor="summary">Título</Label>
                      <Input
                        id="summary"
                        value={newEvent.summary}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, summary: e.target.value }))}
                        placeholder="Reunión con cliente..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detalles de la cita..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start">Fecha y hora inicio</Label>
                        <Input
                          id="start"
                          type="datetime-local"
                          value={newEvent.start}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end">Fecha y hora fin</Label>
                        <Input
                          id="end"
                          type="datetime-local"
                          value={newEvent.end}
                          onChange={(e) => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Ubicación</Label>
                      <Input
                        id="location"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Oficina, videollamada..."
                      />
                    </div>

                    {/* Sección de Recordatorios */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue" />
                        <Label className="text-sm font-medium">Recordatorios automáticos</Label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="emailReminder" className="text-xs">Recordatorio por Email</Label>
                          <Select 
                            value={newEvent.emailReminder} 
                            onValueChange={(value) => setNewEvent(prev => ({ ...prev, emailReminder: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin recordatorio</SelectItem>
                              <SelectItem value="5">5 minutos antes</SelectItem>
                              <SelectItem value="10">10 minutos antes</SelectItem>
                              <SelectItem value="15">15 minutos antes</SelectItem>
                              <SelectItem value="30">30 minutos antes</SelectItem>
                              <SelectItem value="60">1 hora antes</SelectItem>
                              <SelectItem value="120">2 horas antes</SelectItem>
                              <SelectItem value="1440">1 día antes</SelectItem>
                              <SelectItem value="2880">2 días antes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="popupReminder" className="text-xs">Recordatorio Popup</Label>
                          <Select 
                            value={newEvent.popupReminder} 
                            onValueChange={(value) => setNewEvent(prev => ({ ...prev, popupReminder: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin recordatorio</SelectItem>
                              <SelectItem value="5">5 minutos antes</SelectItem>
                              <SelectItem value="10">10 minutos antes</SelectItem>
                              <SelectItem value="15">15 minutos antes</SelectItem>
                              <SelectItem value="30">30 minutos antes</SelectItem>
                              <SelectItem value="60">1 hora antes</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="text-xs text-subtext0 bg-surface1 p-2 rounded">
                        💡 Los recordatorios se enviarán automáticamente desde Google Calendar a tu email y como notificaciones.
                      </div>
                    </div>

                    {/* Sección de Asociaciones - Casos y Clientes */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-green" />
                        <Label className="text-sm font-medium">Asociar a caso/cliente</Label>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="caso_id" className="text-xs">Caso (opcional)</Label>
                          <Select 
                            value={newEvent.caso_id || 'none'} 
                            onValueChange={(value) => {
                              const casoId = value === 'none' ? '' : value
                              setNewEvent(prev => ({ 
                                ...prev, 
                                caso_id: casoId,
                                // Auto-seleccionar cliente si el caso tiene uno asociado
                                cliente_id: casoId ? (casos.find(c => c.id === casoId)?.cliente?.id || prev.cliente_id) : prev.cliente_id
                              }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar caso..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin caso asociado</SelectItem>
                              {casos.map((caso) => (
                                <SelectItem key={caso.id} value={caso.id}>
                                  <div className="flex items-center justify-between w-full">
                                    <span className="truncate">{caso.titulo}</span>
                                    <div className="flex gap-1 ml-2">
                                      <Badge variant="outline" className="text-xs">
                                        {caso.estado}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {caso.prioridad}
                                      </Badge>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {loadingCasos && (
                            <p className="text-xs text-subtext0">Cargando casos...</p>
                          )}
                          {casos.length === 0 && !loadingCasos && (
                            <p className="text-xs text-subtext0">
                              No hay casos activos disponibles.
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cliente_id" className="text-xs">Cliente (opcional)</Label>
                          <Select 
                            value={newEvent.cliente_id || 'none'} 
                            onValueChange={(value) => {
                              const clienteId = value === 'none' ? '' : value
                              setNewEvent(prev => ({ ...prev, cliente_id: clienteId }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sin cliente asociado</SelectItem>
                              {clientes.map((cliente) => (
                                <SelectItem key={cliente.id} value={cliente.id}>
                                  <div className="flex flex-col">
                                    <span>{cliente.nombre}</span>
                                    {(cliente.email || cliente.empresa) && (
                                      <span className="text-xs text-subtext0">
                                        {cliente.empresa && `${cliente.empresa}`}
                                        {cliente.empresa && cliente.email && ' • '}
                                        {cliente.email}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {clientes.length === 0 && (
                            <p className="text-xs text-subtext0">
                              No hay clientes disponibles.
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-subtext0 bg-surface1 p-2 rounded">
                        💡 Asociar eventos a casos y clientes te ayuda a mantener todo organizado y tener un historial completo.
                      </div>
                    </div>

                    {/* Sección de Tags */}
                    <div className="space-y-4 border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-purple" />
                        <Label className="text-sm font-medium">Tags</Label>
                      </div>
                      
                      <TagManager
                        selectedTags={newEvent.tags}
                        onTagsChange={(tags) => setNewEvent(prev => ({ ...prev, tags }))}
                        showCreateButton={true}
                      />
                      
                      <div className="text-xs text-subtext0 bg-surface1 p-2 rounded">
                        💡 Usa tags para categorizar y filtrar tus eventos (ej: #urgente, #reunion, #tribunal).
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCloseModal}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleSaveEvent}
                        disabled={!newEvent.summary || !newEvent.start || !newEvent.end}
                      >
                        {editingEvent ? 'Actualizar Cita' : 'Crear Cita'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Botón de Sincronizar prominente */}
              <Button 
                variant="outline" 
                onClick={async () => {
                  console.log('🔄 BOTÓN SINCRONIZAR - Iniciando sincronización manual...')
                  try {
                    await fetchEvents()
                    console.log('✅ BOTÓN SINCRONIZAR - Sincronización completada')
                  } catch (error) {
                    console.error('❌ BOTÓN SINCRONIZAR - Error:', error)
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Sincronizando...' : 'Sincronizar'}
              </Button>
              
              <Button variant="outline" onClick={disconnect}>
                <Settings className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button onClick={connect}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Conectar Google Calendar
              </Button>
              <Button variant="outline" onClick={handleRefreshConnection}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refrescar
              </Button>
            </div>
          )}
        </div>
      </div>

      {!isConnected ? (
        /* Google Calendar Connection */
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-blue rounded-full mx-auto mb-4">
              <Calendar className="h-8 w-8 text-base" />
            </div>
            <CardTitle>Conecta tu Google Calendar</CardTitle>
            <CardDescription>
              Sincroniza tus citas y eventos con Google Calendar para una gestión completa de tu agenda
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-green rounded-full flex items-center justify-center mx-auto">
                    <span className="text-base font-bold">1</span>
                  </div>
                  <p className="font-medium">Autorización segura</p>
                  <p className="text-subtext0">Conecta de forma segura con OAuth 2.0</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-yellow rounded-full flex items-center justify-center mx-auto">
                    <span className="text-base font-bold">2</span>
                  </div>
                  <p className="font-medium">Sincronización automática</p>
                  <p className="text-subtext0">Tus eventos se sincronizan automáticamente</p>
                </div>
                <div className="space-y-2">
                  <div className="w-8 h-8 bg-purple rounded-full flex items-center justify-center mx-auto">
                    <span className="text-base font-bold">3</span>
                  </div>
                  <p className="font-medium">Gestión completa</p>
                  <p className="text-subtext0">Crea y edita eventos desde LawConnect</p>
                </div>
              </div>

              <div className="bg-surface1 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow mt-0.5" />
                  <div className="text-left">
                    <p className="font-medium text-sm">Estado actual</p>
                    <p className="text-xs text-subtext0">
                      {user 
                        ? 'Usuario autenticado. Si acabas de conectar Google Calendar, haz clic en "Refrescar".' 
                        : 'Necesitas iniciar sesión para conectar Google Calendar.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={connect} size="lg">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Conectar con Google Calendar
                </Button>
                <Button onClick={handleRefreshConnection} variant="outline" size="lg">
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Refrescar Estado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Calendar Views */
        <div className="space-y-6">
          {/* Navigation Header para vistas de calendario */}
          {(currentView === 'week' || currentView === 'month') && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getViewTitle()}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                      ← Anterior
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                      Hoy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                      Siguiente →
                    </Button>
                  </div>
                </div>
                {/* Leyenda de indicadores */}
                <div className="flex items-center gap-4 text-xs text-subtext0 mt-2">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-green rounded-full" />
                    <span>Con caso asociado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 bg-purple rounded-full" />
                    <span>Con tags</span>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Vista Lista */}
          {currentView === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Events List */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Próximos eventos</CardTitle>
                    <CardDescription>
                      Eventos sincronizados desde Google Calendar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {events.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                        <p className="text-subtext0 mb-4">No tienes eventos próximos</p>
                        <Button onClick={() => setIsCreateEventOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Crear primer evento
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {events.slice(0, 10).map((event) => (
                          <div key={event.id} className="group relative flex items-start gap-3 p-4 bg-surface1 rounded-lg hover:bg-surface2 transition-colors">
                            <div className="flex items-center justify-center w-10 h-10 bg-blue rounded-lg">
                              <Calendar className="h-5 w-5 text-base" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-text truncate">{event.summary}</h4>
                              {event.description && (
                                <p className="text-sm text-subtext0 line-clamp-2 mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-subtext0">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{event.start.dateTime ? formatDateTime(event.start.dateTime) : 'Fecha no disponible'}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                                {/* Mostrar recordatorios si existen */}
                                {event.reminders?.overrides && event.reminders.overrides.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Bell className="h-3 w-3 text-yellow" />
                                    <span>{event.reminders.overrides.length} recordatorio{event.reminders.overrides.length > 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Mostrar información de caso y cliente */}
                              <div className="flex items-center gap-2 mt-2">
                                {event.caso_id && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <FolderOpen className="h-3 w-3" />
                                    Caso: {casos.find(c => c.id === event.caso_id)?.titulo || 'Caso no encontrado'}
                                  </Badge>
                                )}
                                {event.cliente_id && (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    👤 {clientes.find(c => c.id === event.cliente_id)?.nombre || 'Cliente no encontrado'}
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Mostrar tags */}
                              {event.tags && event.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {event.tags.slice(0, 3).map((tagId) => (
                                    <Badge
                                      key={tagId}
                                      variant="outline"
                                      className="text-xs"
                                      style={{ 
                                        borderColor: getTagColor(tagId), 
                                        color: getTagColor(tagId) 
                                      }}
                                    >
                                      #{getTagName(tagId)}
                                    </Badge>
                                  ))}
                                  {event.tags.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{event.tags.length - 3} más
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Botones de acción */}
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">Google</Badge>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditEvent(event)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => event.id && handleDeleteEvent(event.id)}
                                  className="h-8 w-8 p-0 text-red hover:text-red hover:bg-red/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Calendar Stats */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Estadísticas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-subtext0">Eventos este mes</span>
                        <span className="font-medium">{events.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-subtext0">Próximos 7 días</span>
                        <span className="font-medium">
                          {events.filter(event => {
                            if (!event.start.dateTime) return false
                            const eventDate = new Date(event.start.dateTime)
                            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            return eventDate <= nextWeek
                          }).length}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Acciones rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => setIsCreateEventOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva cita
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => fetchEvents()}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sincronizar eventos
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => window.open('https://calendar.google.com', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir Google Calendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Vista Semanal */}
          {currentView === 'week' && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-8 gap-1">
                  {/* Header de horas */}
                  <div className="text-xs text-subtext0 p-2"></div>
                  {getWeekDays(getWeekStart(currentDate)).map((day, index) => (
                    <div key={index} className="text-center p-2 border-b border-surface2">
                      <div className="text-xs text-subtext0 uppercase">
                        {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </div>
                      <div className={`text-lg font-medium ${
                        day.toDateString() === today.toDateString() 
                          ? 'text-blue bg-blue/10 rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                          : 'text-text'
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                  ))}
                  
                  {/* Horas del día */}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div key={hour} className="contents">
                      <div className="text-xs text-subtext0 p-2 text-right border-r border-surface2">
                        {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                      </div>
                      {getWeekDays(getWeekStart(currentDate)).map((day, dayIndex) => {
                        const dayEvents = getEventsForDay(day).filter(event => {
                          if (!event.start.dateTime) return false
                          const eventHour = new Date(event.start.dateTime).getHours()
                          return eventHour === hour
                        })
                        
                        return (
                          <div key={dayIndex} className="min-h-[40px] p-1 border-r border-b border-surface2 hover:bg-surface1 transition-colors relative">
                            {dayEvents.map((event, eventIndex) => (
                              <div 
                                key={event.id || eventIndex}
                                className="text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80"
                                style={{ 
                                  backgroundColor: getEventColor(event),
                                  color: '#000000' // Texto negro para mejor legibilidad
                                }}
                                onClick={() => handleEditEvent(event)}
                                title={`${event.summary}${event.caso_id ? `\nCaso: ${casos.find(c => c.id === event.caso_id)?.titulo}` : ''}${event.tags?.length ? `\nTags: ${event.tags.map(t => getTagName(t)).join(', ')}` : ''}`}
                              >
                                <div className="truncate font-medium">{event.summary}</div>
                                {(event.caso_id || event.tags?.length) && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {event.caso_id && (
                                      <span className="inline-block w-2 h-2 bg-green rounded-full" title="Tiene caso asociado" />
                                    )}
                                    {event.tags && event.tags.length > 0 && (
                                      <span className="inline-block w-2 h-2 bg-purple rounded-full" title={`Tags: ${event.tags.map(t => getTagName(t)).join(', ')}`} />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vista Mensual */}
          {currentView === 'month' && (
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-7 gap-1">
                  {/* Headers de días de la semana */}
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                    <div key={day} className="text-center p-3 text-sm font-medium text-subtext0 border-b border-surface2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Días del mes */}
                  {getMonthDays(currentDate).map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                    const isToday = day.toDateString() === today.toDateString()
                    const dayEvents = getEventsForDay(day)
                    
                    return (
                      <div 
                        key={index} 
                        className={`min-h-[100px] p-2 border border-surface2 hover:bg-surface1 transition-colors ${
                          !isCurrentMonth ? 'text-subtext0 bg-surface0' : 'text-text'
                        }`}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          isToday 
                            ? 'text-blue bg-blue/10 rounded-full w-6 h-6 flex items-center justify-center' 
                            : ''
                        }`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event, eventIndex) => (
                            <div 
                              key={event.id || eventIndex}
                              className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                              style={{ 
                                backgroundColor: getEventColor(event),
                                color: '#000000' // Texto negro para mejor legibilidad
                              }}
                              onClick={() => handleEditEvent(event)}
                              title={`${event.summary}${event.caso_id ? `\nCaso: ${casos.find(c => c.id === event.caso_id)?.titulo}` : ''}${event.tags?.length ? `\nTags: ${event.tags.map(t => getTagName(t)).join(', ')}` : ''}`}
                            >
                              <div className="truncate font-medium">{event.summary}</div>
                                                              {(event.caso_id || event.tags?.length) && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {event.caso_id && (
                                      <span className="inline-block w-1.5 h-1.5 bg-green rounded-full" />
                                    )}
                                    {event.tags && event.tags.length > 0 && (
                                      <span className="inline-block w-1.5 h-1.5 bg-purple rounded-full" />
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-subtext0">
                              +{dayEvents.length - 3} más
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}