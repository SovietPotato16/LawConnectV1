import React, { useState } from 'react'
import { X, Edit, Star, Hash, Calendar, User, Download, Upload, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TagManager } from '@/components/TagManager'
import { formatDate } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface NoteViewerProps {
  isOpen: boolean
  onClose: () => void
  note: {
    id: string
    titulo: string
    contenido: string
    contenido_texto: string
    caso_id: string | null
    user_id: string
    is_favorita: boolean
    created_at: string
    updated_at: string
    tags?: Array<{ id: string; nombre: string; color: string }>
    caso?: { id: string; titulo: string }
    imagenes?: Array<{ id: string; nombre: string; url: string; created_at: string }>
  } | null
  onUpdate?: () => void
}

export function NoteViewer({ isOpen, onClose, note, onUpdate }: NoteViewerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo: '',
    contenido: '',
    tags: [] as string[]
  })
  const [imagenes, setImagenes] = useState<Array<{ id: string; nombre: string; url: string; created_at: string }>>([])
  const { user } = useAuth()

  const isExampleNote = note?.id.startsWith('ejemplo-') || note?.id.startsWith('nota-ejemplo-')

  // Initialize edit form when note changes
  React.useEffect(() => {
    if (note) {
      setEditForm({
        titulo: note.titulo,
        contenido: note.contenido,
        tags: note.tags?.map(t => t.id) || []
      })
      fetchImagenes()
    }
  }, [note])

  const fetchImagenes = async () => {
    if (!note || !user || isExampleNote) return

    try {
      const { data, error } = await supabase
        .from('imagenes')
        .select('*')
        .eq('nota_id', note.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setImagenes(data || [])
    } catch (error) {
      console.error('Error fetching imagenes:', error)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !note || isExampleNote) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen')
      return
    }

    setUploading(true)
    try {
      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/notas/${note.id}/${Date.now()}-${file.name}`

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(fileName)

      // Save image record
      const { error: dbError } = await supabase
        .from('imagenes')
        .insert({
          nombre: file.name,
          tipo: file.type,
          tamaño: file.size,
          url: publicUrl,
          nota_id: note.id,
          user_id: user.id
        })

      if (dbError) throw dbError

      await fetchImagenes()
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error al subir la imagen')
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?') || isExampleNote) return

    try {
      const { error } = await supabase
        .from('imagenes')
        .delete()
        .eq('id', imageId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchImagenes()
    } catch (error) {
      console.error('Error deleting image:', error)
    }
  }

  const toggleFavorite = async () => {
    if (!note || !user || isExampleNote) return

    try {
      const { error } = await supabase
        .from('notas')
        .update({ is_favorita: !note.is_favorita })
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (error) throw error
      onUpdate?.()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const saveNote = async () => {
    if (!note || !user || !editForm.titulo.trim() || isExampleNote) return

    try {
      // Update the note
      const { error: noteError } = await supabase
        .from('notas')
        .update({
          titulo: editForm.titulo,
          contenido: editForm.contenido,
          contenido_texto: editForm.contenido,
        })
        .eq('id', note.id)
        .eq('user_id', user.id)

      if (noteError) throw noteError

      // Update tags - remove all and add new ones
      await supabase
        .from('nota_tags')
        .delete()
        .eq('nota_id', note.id)

      if (editForm.tags.length > 0) {
        const tagInserts = editForm.tags.map(tagId => ({
          nota_id: note.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase
          .from('nota_tags')
          .insert(tagInserts)

        if (tagsError) throw tagsError
      }

      setIsEditing(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error updating note:', error)
      alert('Error al actualizar la nota')
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (!note) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              {isEditing ? (
                <Input
                  value={editForm.titulo}
                  onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle className="text-xl">{note.titulo}</DialogTitle>
              )}
              
              <div className="flex items-center gap-4 mt-2 text-sm text-subtext0">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Creado: {formatDate(note.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Actualizado: {formatDate(note.updated_at)}</span>
                </div>
                {note.caso && (
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>Caso: {note.caso.titulo}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFavorite}
                disabled={isExampleNote}
              >
                <Star 
                  className={`h-4 w-4 ${
                    note.is_favorita ? 'fill-yellow text-yellow' : 'text-subtext0'
                  }`} 
                />
              </Button>
              
              {!isExampleNote && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing) {
                      saveNote()
                    } else {
                      setIsEditing(true)
                    }
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {isEditing ? 'Guardar' : 'Editar'}
                </Button>
              )}
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tags */}
          {isEditing ? (
            <div className="space-y-2">
              <Label>Tags</Label>
              <TagManager
                selectedTags={editForm.tags}
                onTagsChange={(tags) => setEditForm(prev => ({ ...prev, tags }))}
              />
            </div>
          ) : (
            note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {note.tags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tag.nombre}
                  </Badge>
                ))}
              </div>
            )
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label>Contenido</Label>
            {isEditing ? (
              <Textarea
                value={editForm.contenido}
                onChange={(e) => setEditForm(prev => ({ ...prev, contenido: e.target.value }))}
                rows={8}
                className="min-h-[200px]"
              />
            ) : (
              <div className="bg-surface1 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap">
                {note.contenido}
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Imágenes adjuntas ({imagenes.length})</Label>
              {!isExampleNote && (
                <div>
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                </div>
              )}
            </div>

            {imagenes.length === 0 ? (
              <div className="text-center py-8 bg-surface1 rounded-lg">
                <div className="text-4xl mb-2">🖼️</div>
                <p className="text-subtext0">No hay imágenes adjuntas</p>
                {!isExampleNote && (
                  <p className="text-xs text-subtext0 mt-1">
                    Sube imágenes para complementar tu nota
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {imagenes.map((imagen) => (
                  <div key={imagen.id} className="relative group">
                    <div className="aspect-square bg-surface1 rounded-lg overflow-hidden">
                      <img
                        src={imagen.url}
                        alt={imagen.nombre}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => window.open(imagen.url, '_blank')}
                      />
                    </div>
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(imagen.url, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const link = document.createElement('a')
                            link.href = imagen.url
                            link.download = imagen.nombre
                            link.click()
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!isExampleNote && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 text-red hover:text-red"
                            onClick={() => deleteImage(imagen.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs">
                      <p className="truncate">{imagen.nombre}</p>
                      <p className="text-xs opacity-75">{formatDate(imagen.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isExampleNote && (
            <div className="bg-yellow/10 border border-yellow/20 rounded-lg p-4">
              <p className="text-sm text-yellow">
                Esta es una nota de ejemplo. Las funciones de edición y subida de imágenes están deshabilitadas.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}