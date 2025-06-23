import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, User, Mail, Phone, Building, MapPin, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ContactClientActions } from '@/components/ContactClientActions'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface Cliente {
  id: string
  nombre: string
  email: string | null
  telefono: string | null
  empresa: string | null
  direccion: string | null
  user_id: string
  created_at: string
  updated_at: string
}

// Cliente de ejemplo
const clienteEjemplo: Cliente = {
  id: 'ejemplo-cliente-001',
  nombre: '👤 Cliente de Ejemplo',
  email: 'ejemplo@demo.com',
  telefono: '+1 234 567 8900',
  empresa: 'Empresa Demo S.L.',
  direccion: 'Calle Ejemplo 123, Ciudad',
  user_id: 'ejemplo',
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z'
}

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    direccion: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchClientes()
  }, [user])

  const fetchClientes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error

      // Agregar cliente de ejemplo al inicio
      const clientesConEjemplo = [clienteEjemplo, ...(data || [])]
      setClientes(clientesConEjemplo)
    } catch (error) {
      console.error('Error fetching clientes:', error)
      setClientes([clienteEjemplo])
    } finally {
      setLoading(false)
    }
  }

  const createCliente = async () => {
    if (!user || !form.nombre.trim()) return

    try {
      const { error } = await supabase
        .from('clientes')
        .insert({
          nombre: form.nombre,
          email: form.email || null,
          telefono: form.telefono || null,
          empresa: form.empresa || null,
          direccion: form.direccion || null,
          user_id: user.id
        })

      if (error) throw error

      await fetchClientes()
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error creating cliente:', error)
      alert('Error al crear el cliente')
    }
  }

  const updateCliente = async () => {
    if (!editingCliente || !form.nombre.trim() || editingCliente.id === 'ejemplo-cliente-001') return

    try {
      const { error } = await supabase
        .from('clientes')
        .update({
          nombre: form.nombre,
          email: form.email || null,
          telefono: form.telefono || null,
          empresa: form.empresa || null,
          direccion: form.direccion || null
        })
        .eq('id', editingCliente.id)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchClientes()
      setEditingCliente(null)
      resetForm()
    } catch (error) {
      console.error('Error updating cliente:', error)
      alert('Error al actualizar el cliente')
    }
  }

  const deleteCliente = async (clienteId: string) => {
    if (clienteId === 'ejemplo-cliente-001') {
      alert('No puedes eliminar el cliente de ejemplo')
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) return

    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', clienteId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchClientes()
    } catch (error) {
      console.error('Error deleting cliente:', error)
      alert('Error al eliminar el cliente')
    }
  }

  const resetForm = () => {
    setForm({
      nombre: '',
      email: '',
      telefono: '',
      empresa: '',
      direccion: ''
    })
  }

  const openEditDialog = (cliente: Cliente) => {
    if (cliente.id === 'ejemplo-cliente-001') {
      alert('No puedes editar el cliente de ejemplo')
      return
    }

    setEditingCliente(cliente)
    setForm({
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      empresa: cliente.empresa || '',
      direccion: cliente.direccion || ''
    })
  }

  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.empresa?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando clientes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Clientes</h1>
          <p className="text-subtext0">Gestiona tu base de clientes</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="juan@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={form.telefono}
                  onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="+34 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="empresa">Empresa</Label>
                <Input
                  id="empresa"
                  value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  placeholder="Empresa S.L."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={form.direccion}
                  onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Calle Principal 123, Ciudad"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={createCliente} disabled={!form.nombre.trim()}>
                  Crear Cliente
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
        <Input
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      {filteredClientes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-16 w-16 text-subtext0 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              {clientes.length === 0 ? 'No tienes clientes' : 'No se encontraron clientes'}
            </h3>
            <p className="text-subtext0 mb-4">
              {clientes.length === 0 
                ? 'Crea tu primer cliente para comenzar'
                : 'Intenta ajustar la búsqueda'
              }
            </p>
            {clientes.length === 0 && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente) => (
            <Card key={cliente.id} className="hover:bg-surface1 transition-colors h-[320px] flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-blue rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg line-clamp-1">{cliente.nombre}</CardTitle>
                      {cliente.empresa && (
                        <p className="text-sm text-subtext0 line-clamp-1">{cliente.empresa}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2 flex-1">
                  {cliente.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-blue flex-shrink-0" />
                      <span className="text-subtext0 line-clamp-1">{cliente.email}</span>
                    </div>
                  )}
                  
                  {cliente.telefono && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-green flex-shrink-0" />
                      <span className="text-subtext0 line-clamp-1">{cliente.telefono}</span>
                    </div>
                  )}
                  
                  {cliente.direccion && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-purple flex-shrink-0" />
                      <span className="text-subtext0 line-clamp-2">{cliente.direccion}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-surface2 mt-4">
                  <span className="text-xs text-subtext0">
                    {formatDate(cliente.created_at)}
                  </span>
                  <div className="flex gap-1">
                    <ContactClientActions 
                      cliente={cliente} 
                      onEmailSent={() => {
                        // Refresh or show notification
                        console.log('Email sent to', cliente.nombre)
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(cliente)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCliente(cliente.id)}
                      className="h-8 w-8 p-0 text-red hover:text-red"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {clientes.length === 1 && clientes[0].id === 'ejemplo-cliente-001' && (
        <Card className="border-blue/20 bg-blue/5">
          <CardContent className="text-center py-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-text mb-2">¡Comienza a gestionar tus clientes!</h3>
              <p className="text-subtext0 mb-4">
                Arriba puedes ver un cliente de ejemplo. Crea tu primer cliente real para comenzar a organizar tu base de datos y usar las funciones de contacto.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primer cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      {editingCliente && (
        <Dialog open={!!editingCliente} onOpenChange={() => { setEditingCliente(null); resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre completo *</Label>
                <Input
                  id="edit-nombre"
                  value={form.nombre}
                  onChange={(e) => setForm(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="juan@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefono">Teléfono</Label>
                <Input
                  id="edit-telefono"
                  value={form.telefono}
                  onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                  placeholder="+34 123 456 789"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-empresa">Empresa</Label>
                <Input
                  id="edit-empresa"
                  value={form.empresa}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa: e.target.value }))}
                  placeholder="Empresa S.L."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-direccion">Dirección</Label>
                <Input
                  id="edit-direccion"
                  value={form.direccion}
                  onChange={(e) => setForm(prev => ({ ...prev, direccion: e.target.value }))}
                  placeholder="Calle Principal 123, Ciudad"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEditingCliente(null); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={updateCliente} disabled={!form.nombre.trim()}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}