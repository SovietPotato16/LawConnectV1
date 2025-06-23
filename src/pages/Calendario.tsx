import { useState, useEffect } from 'react'
import { Calendar, Plus, Settings, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar'
import { formatDateTime } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/googleCalendar'

export function Calendario() {
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [newEvent, setNewEvent] = useState({
    summary: '',
    description: '',
    start: '',
    end: '',
    location: '',
  })

  const {
    isConnected,
    loading,
    events,
    connect,
    disconnect,
    fetchEvents,
    createEvent,
  } = useGoogleCalendar()

  useEffect(() => {
    if (isConnected) {
      fetchEvents()
    }
  }, [isConnected])

  const handleCreateEvent = async () => {
    if (!newEvent.summary || !newEvent.start || !newEvent.end) return

    try {
      const event: CalendarEvent = {
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
      }

      await createEvent(event)
      setIsCreateEventOpen(false)
      setNewEvent({
        summary: '',
        description: '',
        start: '',
        end: '',
        location: '',
      })
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando calendario...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Calendario</h1>
          <p className="text-subtext0">Gestiona tu agenda y citas</p>
        </div>
        <div className="flex gap-3">
          {isConnected ? (
            <>
              <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Crear nueva cita</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
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

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsCreateEventOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        onClick={handleCreateEvent}
                        disabled={!newEvent.summary || !newEvent.start || !newEvent.end}
                      >
                        Crear Cita
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button variant="outline" onClick={disconnect}>
                <Settings className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </>
          ) : (
            <Button onClick={connect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Conectar Google Calendar
            </Button>
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
                    <p className="font-medium text-sm">Configuración requerida</p>
                    <p className="text-xs text-subtext0">
                      Para usar esta función, necesitas configurar las credenciales de Google Calendar en las variables de entorno.
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={connect} size="lg">
                <ExternalLink className="h-5 w-5 mr-2" />
                Conectar con Google Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Calendar Events */
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
                      <div key={event.id} className="flex items-start gap-3 p-3 bg-surface1 rounded-lg">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue rounded-lg">
                          <Calendar className="h-5 w-5 text-base" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-text truncate">{event.summary}</h4>
                          {event.description && (
                            <p className="text-sm text-subtext0 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-subtext0">
                            <span>{formatDateTime(event.start.dateTime)}</span>
                            {event.location && <span>📍 {event.location}</span>}
                          </div>
                        </div>
                        <Badge variant="outline">Google</Badge>
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
                    <Calendar className="h-4 w-4 mr-2" />
                    Sincronizar eventos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}