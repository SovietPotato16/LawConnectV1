import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Cliente {
  id: string
  nombre: string
  email: string | null
}

export function NuevoCaso() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    estado: 'Pendiente',
    prioridad: 'Media',
    cliente_id: '',
    fecha_vencimiento: ''
  })
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchClientes()
  }, [user])

  const fetchClientes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, email')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Error fetching clientes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.titulo.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('casos')
        .insert({
          titulo: form.titulo,
          descripcion: form.descripcion || null,
          estado: form.estado,
          prioridad: form.prioridad,
          cliente_id: form.cliente_id || null,
          fecha_vencimiento: form.fecha_vencimiento || null,
          user_id: user.id
        })
        .select()
        .single()

      if (error) throw error

      navigate(`/casos/${data.id}`)
    } catch (error) {
      console.error('Error creating caso:', error)
      alert('Error al crear el caso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/casos">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-text">Nuevo Caso</h1>
          <p className="text-subtext0">Crea un nuevo caso legal</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Información del caso</CardTitle>
            <CardDescription>
              Completa los detalles del nuevo caso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título del caso *</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Ej: Demanda laboral - Empresa XYZ"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  placeholder="Describe los detalles del caso..."
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado inicial</Label>
                  <Select value={form.estado} onValueChange={(value) => setForm(prev => ({ ...prev, estado: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="En Revisión">En Revisión</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={form.prioridad} onValueChange={(value) => setForm(prev => ({ ...prev, prioridad: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select value={form.cliente_id} onValueChange={(value) => setForm(prev => ({ ...prev, cliente_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.email && `(${cliente.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clientes.length === 0 && (
                  <p className="text-xs text-subtext0">
                    No tienes clientes registrados. <Link to="/clientes/nuevo" className="text-blue hover:underline">Crear cliente</Link>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_vencimiento">Fecha de vencimiento (opcional)</Label>
                <Input
                  id="fecha_vencimiento"
                  type="date"
                  value={form.fecha_vencimiento}
                  onChange={(e) => setForm(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Link to="/casos">
                  <Button variant="outline" type="button">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !form.titulo.trim()}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creando...' : 'Crear Caso'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}