import { useState, useEffect } from 'react'
import { Plus, X, Hash, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Tag {
  id: string
  nombre: string
  color: string
  user_id: string
  created_at: string
}

interface TagManagerProps {
  selectedTags?: string[]
  onTagsChange?: (tagIds: string[]) => void
  showCreateButton?: boolean
}

const defaultColors = [
  '#89b4fa', '#a6e3a1', '#f9e2af', '#fab387', '#f38ba8', 
  '#cba6f7', '#74c7ec', '#94e2d5', '#eba0ac', '#f5c2e7'
]

export function TagManager({ selectedTags = [], onTagsChange, showCreateButton = true }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(defaultColors[0])
  const { user } = useAuth()

  useEffect(() => {
    fetchTags()
  }, [user])

  const fetchTags = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error
      setTags(data || [])
    } catch (error) {
      console.error('Error fetching tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const createTag = async () => {
    if (!user || !newTagName.trim()) return

    try {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          nombre: newTagName.trim(),
          color: newTagColor,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      setTags(prev => [...prev, data])
      setNewTagName('')
      setNewTagColor(defaultColors[0])
      setIsCreating(false)

      // Auto-select the new tag
      if (onTagsChange) {
        onTagsChange([...selectedTags, data.id])
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    }
  }

  const deleteTag = async (tagId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId)
        .eq('user_id', user.id)

      if (error) throw error

      setTags(prev => prev.filter(tag => tag.id !== tagId))
      
      // Remove from selected tags
      if (onTagsChange && selectedTags.includes(tagId)) {
        onTagsChange(selectedTags.filter(id => id !== tagId))
      }
    } catch (error) {
      console.error('Error deleting tag:', error)
    }
  }

  const toggleTag = (tagId: string) => {
    if (!onTagsChange) return

    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
    }
  }

  if (loading) {
    return <div className="text-subtext0">Cargando tags...</div>
  }

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tags seleccionados</Label>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map(tagId => {
              const tag = tags.find(t => t.id === tagId)
              if (!tag) return null
              
              return (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="flex items-center gap-1"
                  style={{ borderColor: tag.color, color: tag.color }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  #{tag.nombre}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => toggleTag(tag.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Tags */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Tags disponibles</Label>
          {showCreateButton && (
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear nuevo tag</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tagName">Nombre del tag</Label>
                    <Input
                      id="tagName"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Ej: importante, urgente, cliente..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {defaultColors.map(color => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            newTagColor === color ? 'border-text' : 'border-surface2'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewTagColor(color)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={createTag} disabled={!newTagName.trim()}>
                      Crear Tag
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <Badge
              key={tag.id}
              variant={selectedTags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer flex items-center gap-1 group"
              style={selectedTags.includes(tag.id) ? 
                { backgroundColor: tag.color, color: '#1e1e2e' } : 
                { borderColor: tag.color, color: tag.color }
              }
              onClick={() => toggleTag(tag.id)}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              #{tag.nombre}
              {showCreateButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteTag(tag.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>

        {tags.length === 0 && (
          <div className="text-center py-8 text-subtext0">
            <Hash className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tienes tags creados</p>
            {showCreateButton && (
              <p className="text-sm">Crea tu primer tag para organizar mejor tu contenido</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}