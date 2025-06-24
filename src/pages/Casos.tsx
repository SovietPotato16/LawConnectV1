import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CaseCard } from '@/components/CaseCard'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Caso } from '@/types'

// Caso de ejemplo que se muestra a todos los usuarios
const casoEjemplo: Caso = {
  id: 'ejemplo-demo-caso-001',
  titulo: '📋 Caso de Ejemplo - Demanda Laboral',
  descripcion: 'Este es un caso de ejemplo para mostrar cómo funciona la plataforma. Puedes explorarlo pero no editarlo.',
  estado: 'Activo',
  prioridad: 'Media',
  created_at: '2024-01-15T10:00:00Z',
  fecha_vencimiento: '2024-06-15T10:00:00Z',
  cliente: {
    id: 'ejemplo-cliente-001',
    nombre: 'Cliente de Ejemplo',
    email: 'ejemplo@demo.com',
    created_at: '2024-01-01T10:00:00Z'
  }
}

export function Casos() {
  const [casos, setCasos] = useState<Caso[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const { user } = useAuth()

  useEffect(() => {
    fetchCasos()
  }, [user])

  const fetchCasos = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('casos')
        .select(`
          *,
          cliente:clientes(id, nombre, email)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Agregar el caso de ejemplo al inicio
      const casosConEjemplo = [casoEjemplo, ...(data || [])]
      setCasos(casosConEjemplo)
    } catch (error) {
      console.error('Error fetching casos:', error)
      // Si hay error, al menos mostrar el caso de ejemplo
      setCasos([casoEjemplo])
    } finally {
      setLoading(false)
    }
  }

  const deleteCaso = async (casoId: string) => {
    if (casoId === 'ejemplo-demo-caso-001') {
      alert('No puedes eliminar el caso de ejemplo')
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este caso? Esta acción eliminará también todos sus documentos, notas e imágenes asociadas.')) return

    if (!user) return

    try {
      // Eliminar documentos asociados del storage
      const { data: documentos } = await supabase
        .from('documentos')
        .select('url')
        .eq('caso_id', casoId)
        .eq('user_id', user.id)

      // Eliminar archivos del storage
      if (documentos && documentos.length > 0) {
        for (const doc of documentos) {
          if (doc.url.includes('supabase')) {
            const fileName = doc.url.split('/').pop()
            if (fileName) {
              await supabase.storage
                .from('documentos')
                .remove([`${user.id}/${fileName}`])
            }
          }
        }
      }

      // Eliminar imágenes asociadas del storage
      const { data: imagenes } = await supabase
        .from('imagenes')
        .select('url')
        .eq('caso_id', casoId)
        .eq('user_id', user.id)

      if (imagenes && imagenes.length > 0) {
        for (const img of imagenes) {
          if (img.url.includes('supabase')) {
            const fileName = img.url.split('/').pop()
            if (fileName) {
              await supabase.storage
                .from('imagenes')
                .remove([`${user.id}/casos/${casoId}/${fileName}`])
            }
          }
        }
      }

      // Eliminar el caso de la base de datos (cascade eliminará notas, documentos e imágenes)
      const { error: deleteError } = await supabase
        .from('casos')
        .delete()
        .eq('id', casoId)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      await fetchCasos()
    } catch (error) {
      console.error('Error deleting caso:', error)
      alert('Error al eliminar el caso')
    }
  }

  const filteredCasos = casos.filter(caso => {
    const matchesSearch = caso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caso.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || caso.estado === statusFilter
    const matchesPriority = priorityFilter === 'all' || caso.prioridad === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando casos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Casos</h1>
          <p className="text-subtext0">Gestiona todos tus casos legales</p>
        </div>
        <Link to="/casos/nuevo">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Caso
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
          <Input
            placeholder="Buscar casos o clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Pendiente">Pendiente</SelectItem>
            <SelectItem value="En Revisión">En Revisión</SelectItem>
            <SelectItem value="Cerrado">Cerrado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Media">Media</SelectItem>
            <SelectItem value="Baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCasos.map((caso) => (
          <CaseCard key={caso.id} caso={caso} onDelete={deleteCaso} />
        ))}
      </div>

      {filteredCasos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-subtext0 mb-4">No se encontraron casos que coincidan con los filtros.</p>
            <Link to="/casos/nuevo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear primer caso
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {casos.length === 1 && casos[0].id === 'ejemplo-demo-caso-001' && (
        <Card className="border-blue/20 bg-blue/5">
          <CardContent className="text-center py-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-text mb-2">¡Bienvenido a LawConnect!</h3>
              <p className="text-subtext0 mb-4">
                Arriba puedes ver un caso de ejemplo. Crea tu primer caso real para comenzar a gestionar tu práctica legal.
              </p>
              <Link to="/casos/nuevo">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear mi primer caso
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}