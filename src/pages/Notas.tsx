import { useState, useEffect } from 'react'
import { Plus, Search, Star, FileText, Hash, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { TagManager } from '@/components/TagManager'
import { NoteViewer } from '@/components/NoteViewer'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface Nota {
  id: string
  titulo: string
  contenido: any
  contenido_texto: string
  caso_id: string | null
  cliente_id: string | null
  user_id: string
  is_favorita: boolean
  created_at: string
  updated_at: string
  tags?: Array<{ id: string; nombre: string; color: string }>
  caso?: { id: string; titulo: string }
  cliente?: { id: string; nombre: string }
}

// Nota de ejemplo
const notaEjemplo: Nota = {
  id: 'ejemplo-nota-001',
  titulo: '📝 Nota de Ejemplo - Bienvenida',
  contenido: 'Esta es una nota de ejemplo para mostrar cómo funciona el sistema de notas de LawConnect.\n\nPuedes usar el editor para formatear texto, agregar negritas, cursivas, listas y más.\n\nFuncionalidades principales:\n• Organiza tus ideas\n• Toma notas de reuniones\n• Documenta estrategias legales\n• Adjunta imágenes\n• Usa tags para categorizar\n\n¡Crea tu primera nota real para comenzar!',
  contenido_texto: 'Esta es una nota de ejemplo para mostrar cómo funciona el sistema de notas de LawConnect. Puedes usar el editor para formatear texto, agregar negritas, cursivas, listas y más. Organiza tus ideas, toma notas de reuniones, documenta estrategias legales. ¡Crea tu primera nota real para comenzar!',
  caso_id: null,
  cliente_id: null,
  user_id: 'ejemplo',
  is_favorita: false,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T10:00:00Z',
  tags: [
    { id: 'ejemplo-tag-1', nombre: 'bienvenida', color: '#89b4fa' },
    { id: 'ejemplo-tag-2', nombre: 'tutorial', color: '#a6e3a1' }
  ]
}

export function Notas() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [casoFilter, setCasoFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Nota | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [newNota, setNewNota] = useState({
    titulo: '',
    contenido: '',
    caso_id: '',
    cliente_id: '',
    tags: [] as string[],
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchNotas()
  }, [user])

  const fetchNotas = async () => {
    if (!user) return

    try {
      // Fetch notes with their tags
      const { data: notasData, error: notasError } = await supabase
        .from('notas')
        .select(`
          *,
          caso:casos(id, titulo),
          cliente:clientes(id, nombre)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (notasError) throw notasError

      // Fetch tags for each note
      const notasWithTags = await Promise.all(
        (notasData || []).map(async (nota) => {
          const { data: tagsData } = await supabase
            .from('nota_tags')
            .select(`
              tag:tags(id, nombre, color)
            `)
            .eq('nota_id', nota.id)

          return {
            ...nota,
            tags: tagsData?.map(t => t.tag) || []
          }
        })
      )

      // Agregar nota de ejemplo al inicio
      const notasConEjemplo = [notaEjemplo, ...notasWithTags]
      setNotas(notasConEjemplo)
    } catch (error) {
      console.error('Error fetching notas:', error)
      setNotas([notaEjemplo])
    } finally {
      setLoading(false)
    }
  }

  const createNota = async () => {
    if (!user || !newNota.titulo.trim()) return

    try {
      // Create the note
      const { data: notaData, error: notaError } = await supabase
        .from('notas')
        .insert({
          titulo: newNota.titulo,
          contenido: newNota.contenido,
          contenido_texto: newNota.contenido,
          caso_id: newNota.caso_id || null,
          cliente_id: newNota.cliente_id || null,
          user_id: user.id,
        })
        .select()
        .single()

      if (notaError) throw notaError

      // Add tags
      if (newNota.tags.length > 0) {
        const tagInserts = newNota.tags.map(tagId => ({
          nota_id: notaData.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase
          .from('nota_tags')
          .insert(tagInserts)

        if (tagsError) throw tagsError
      }

      await fetchNotas()
      setIsCreateOpen(false)
      setNewNota({
        titulo: '',
        contenido: '',
        caso_id: '',
        cliente_id: '',
        tags: [],
      })
    } catch (error) {
      console.error('Error creating nota:', error)
    }
  }

  const deleteNota = async (notaId: string) => {
    if (notaId === 'ejemplo-nota-001') {
      alert('No puedes eliminar la nota de ejemplo')
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar esta nota?')) return

    try {
      const { error } = await supabase
        .from('notas')
        .delete()
        .eq('id', notaId)

      if (error) throw error
      await fetchNotas()
    } catch (error) {
      console.error('Error deleting nota:', error)
    }
  }

  const toggleFavorite = async (notaId: string, currentFavoriteState: boolean) => {
    if (notaId === 'ejemplo-nota-001') return

    try {
      const { error } = await supabase
        .from('notas')
        .update({ is_favorita: !currentFavoriteState })
        .eq('id', notaId)
        .eq('user_id', user.id)

      if (error) throw error
      
      // Update local state immediately for better UX
      setNotas(prevNotas => 
        prevNotas.map(nota => 
          nota.id === notaId 
            ? { ...nota, is_favorita: !currentFavoriteState }
            : nota
        )
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
      // Revert local state if there was an error
      await fetchNotas()
    }
  }

  const openNoteViewer = (nota: Nota) => {
    setSelectedNote(nota)
    setIsViewerOpen(true)
  }

  const filteredNotas = notas.filter(nota => {
    const matchesSearch = nota.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         nota.contenido_texto?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tagId => nota.tags?.some(tag => tag.id === tagId))
    
    const matchesCaso = casoFilter === 'all' || nota.caso_id === casoFilter
    
    return matchesSearch && matchesTags && matchesCaso
  })

  // Get unique cases for filter
  const uniqueCasos = Array.from(
    new Map(
      notas.filter(nota => nota.caso)
        .map(nota => [nota.caso!.id, nota.caso!])
    ).values()
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando notas...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Notas</h1>
          <p className="text-subtext0">Organiza tus ideas y documentos con tags</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear nueva nota</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={newNota.titulo}
                  onChange={(e) => setNewNota(prev => ({ ...prev, titulo: e.target.value }))}
                  placeholder="Título de la nota..."
                />
              </div>

              <div className="space-y-2">
                <Label>Contenido</Label>
                <Textarea
                  value={newNota.contenido}
                  onChange={(e) => setNewNota(prev => ({ ...prev, contenido: e.target.value }))}
                  placeholder="Escribe tu nota aquí..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagManager
                  selectedTags={newNota.tags}
                  onTagsChange={(tags) => setNewNota(prev => ({ ...prev, tags }))}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createNota} disabled={!newNota.titulo.trim()}>
                  Crear Nota
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters - Compact Design */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
              <Input
                placeholder="Buscar en notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {uniqueCasos.length > 0 && (
              <Select value={casoFilter} onValueChange={setCasoFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por caso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los casos</SelectItem>
                  {uniqueCasos.map((caso) => (
                    <SelectItem key={caso.id} value={caso.id}>
                      {caso.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-subtext0" />
              <TagManager
                selectedTags={selectedTags}
                onTagsChange={setSelectedTags}
                showCreateButton={false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid */}
      {filteredNotas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-subtext0 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              {notas.length <= 1 ? 'No tienes notas' : 'No se encontraron notas'}
            </h3>
            <p className="text-subtext0 mb-4">
              {notas.length <= 1 
                ? 'Crea tu primera nota para comenzar a organizar tus ideas'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
            {notas.length <= 1 && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera nota
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotas.map((nota) => (
            <div key={nota.id} className="relative">
              <Card className="hover:bg-surface1 transition-colors cursor-pointer h-[320px] flex flex-col" onClick={() => openNoteViewer(nota)}>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2 flex-1">{nota.titulo}</CardTitle>
                    <div className="flex gap-1 flex-shrink-0 ml-2">
                      {nota.id === 'ejemplo-nota-001' && (
                        <Badge variant="secondary" className="bg-yellow text-black">
                          Ejemplo
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(nota.id, nota.is_favorita)
                        }}
                      >
                        <Star 
                          className={`h-4 w-4 ${
                            nota.is_favorita ? 'fill-yellow text-yellow' : 'text-subtext0'
                          }`} 
                        />
                      </Button>
                    </div>
                  </div>
                  
                  {nota.tags && nota.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {nota.tags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: tag.color, color: tag.color }}
                        >
                          <Hash className="h-3 w-3 mr-1" />
                          {tag.nombre}
                        </Badge>
                      ))}
                      {nota.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{nota.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {nota.caso && (
                    <Badge variant="outline" className="text-xs w-fit">
                      📁 {nota.caso.titulo}
                    </Badge>
                  )}
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-3 flex-1">
                    {nota.contenido_texto && (
                      <p className="text-sm text-subtext0 line-clamp-4">
                        {nota.contenido_texto}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-subtext0 pt-3 border-t border-surface2 mt-4">
                    <span>{formatDate(nota.updated_at)}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          openNoteViewer(nota)
                        }}
                      >
                        Ver
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-red hover:text-red"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNota(nota.id)
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {notas.length === 1 && notas[0].id === 'ejemplo-nota-001' && (
        <Card className="border-blue/20 bg-blue/5">
          <CardContent className="text-center py-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-text mb-2">¡Comienza a tomar notas!</h3>
              <p className="text-subtext0 mb-4">
                Arriba puedes ver una nota de ejemplo. Crea tu primera nota real para comenzar a organizar tus ideas y documentos.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear mi primera nota
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Note Viewer */}
      <NoteViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setSelectedNote(null)
        }}
        note={selectedNote}
        onUpdate={fetchNotas}
      />
    </div>
  )
}