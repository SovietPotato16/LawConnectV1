import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Upload, 
  FileText, 
  Download,
  Calendar,
  User,
  Clock,
  AlertCircle,
  Plus,
  StickyNote,
  Hash,
  Star,
  Search,
  Eye,
  Image as ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TagManager } from '@/components/TagManager'
import { DocumentViewer } from '@/components/DocumentViewer'
import { NoteViewer } from '@/components/NoteViewer'
import { StorageService } from '@/lib/storage'
import { ImageStorageSetup } from '@/lib/setupImageStorage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, formatDateTime } from '@/lib/utils'

interface CasoDetalle {
  id: string
  titulo: string
  descripcion: string | null
  estado: 'Activo' | 'Pendiente' | 'Cerrado' | 'En Revisión'
  prioridad: 'Alta' | 'Media' | 'Baja'
  cliente_id: string | null
  user_id: string
  fecha_vencimiento: string | null
  created_at: string
  updated_at: string
  cliente?: {
    id: string
    nombre: string
    email: string | null
  }
}

interface Documento {
  id: string
  nombre: string
  tipo: string | null
  tamaño: number | null
  url: string
  caso_id: string | null
  user_id: string
  created_at: string
  contenido?: string | null
}

interface Imagen {
  id: string
  nombre: string
  tipo: string | null
  tamaño: number | null
  url: string
  caso_id: string | null
  user_id: string
  created_at: string
}

interface Nota {
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
}

// Caso de ejemplo importado
const casoEjemplo: CasoDetalle = {
  id: 'ejemplo-demo-caso-001',
  titulo: '📋 Caso de Ejemplo - Demanda Laboral',
  descripcion: 'Este es un caso de ejemplo para mostrar cómo funciona la plataforma. Incluye una descripción detallada del caso, información del cliente, y demuestra todas las funcionalidades disponibles en la vista de detalle. Puedes explorar todas las secciones pero no podrás editar este caso de ejemplo.',
  estado: 'Activo',
  prioridad: 'Media',
  cliente_id: 'ejemplo-cliente-001',
  user_id: 'ejemplo-user-001',
  fecha_vencimiento: '2024-06-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
  cliente: {
    id: 'ejemplo-cliente-001',
    nombre: 'Cliente de Ejemplo',
    email: 'ejemplo@demo.com'
  }
}

// Documentos de ejemplo
const documentosEjemplo: Documento[] = [
  {
    id: 'doc-ejemplo-001',
    nombre: 'Contrato_Laboral_Ejemplo.pdf',
    tipo: 'application/pdf',
    tamaño: 245760,
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    created_at: '2024-01-16T10:00:00Z'
  },
  {
    id: 'doc-ejemplo-002',
    nombre: 'Evidencia_Comunicaciones.docx',
    tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    tamaño: 156432,
    url: '#',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    created_at: '2024-01-18T10:00:00Z'
  }
]

// Imágenes de ejemplo
const imagenesEjemplo: Imagen[] = [
  {
    id: 'img-ejemplo-001',
    nombre: 'Evidencia_Fotografica_1.jpg',
    tipo: 'image/jpeg',
    tamaño: 1024000,
    url: 'https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    created_at: '2024-01-17T10:00:00Z'
  },
  {
    id: 'img-ejemplo-002',
    nombre: 'Documento_Escaneado.png',
    tipo: 'image/png',
    tamaño: 2048000,
    url: 'https://images.pexels.com/photos/6077326/pexels-photo-6077326.jpeg?auto=compress&cs=tinysrgb&w=800',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    created_at: '2024-01-19T10:00:00Z'
  }
]

// Notas de ejemplo
const notasEjemplo: Nota[] = [
  {
    id: 'nota-ejemplo-001',
    titulo: 'Reunión inicial con cliente',
    contenido: 'El cliente expuso los detalles del despido. Considera que fue improcedente debido a la falta de notificación previa. Se acordó revisar el contrato laboral y las comunicaciones previas.',
    contenido_texto: 'El cliente expuso los detalles del despido. Considera que fue improcedente debido a la falta de notificación previa. Se acordó revisar el contrato laboral y las comunicaciones previas.',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    is_favorita: true,
    created_at: '2024-01-16T14:30:00Z',
    updated_at: '2024-01-16T14:30:00Z',
    tags: [
      { id: 'tag-1', nombre: 'reunion', color: '#89b4fa' },
      { id: 'tag-2', nombre: 'cliente', color: '#a6e3a1' }
    ]
  },
  {
    id: 'nota-ejemplo-002',
    titulo: 'Análisis del contrato laboral',
    contenido: 'Revisé el contrato laboral. La cláusula 15 establece un período de preaviso de 30 días. El despido se realizó sin cumplir este requisito. Esto fortalece nuestra posición legal.',
    contenido_texto: 'Revisé el contrato laboral. La cláusula 15 establece un período de preaviso de 30 días. El despido se realizó sin cumplir este requisito. Esto fortalece nuestra posición legal.',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    is_favorita: false,
    created_at: '2024-01-17T09:15:00Z',
    updated_at: '2024-01-17T09:15:00Z',
    tags: [
      { id: 'tag-3', nombre: 'contrato', color: '#f9e2af' },
      { id: 'tag-4', nombre: 'analisis', color: '#fab387' }
    ]
  },
  {
    id: 'nota-ejemplo-003',
    titulo: 'Estrategia legal',
    contenido: 'Basándome en el análisis del contrato y las comunicaciones, recomiendo proceder con una demanda por despido improcedente. Los precedentes son favorables y tenemos evidencia sólida.',
    contenido_texto: 'Basándome en el análisis del contrato y las comunicaciones, recomiendo proceder con una demanda por despido improcedente. Los precedentes son favorables y tenemos evidencia sólida.',
    caso_id: 'ejemplo-demo-caso-001',
    user_id: 'ejemplo-user-001',
    is_favorita: true,
    created_at: '2024-01-18T16:45:00Z',
    updated_at: '2024-01-18T16:45:00Z',
    tags: [
      { id: 'tag-5', nombre: 'estrategia', color: '#cba6f7' },
      { id: 'tag-6', nombre: 'demanda', color: '#f38ba8' }
    ]
  }
]

export function CasoDetalle() {
  const { id } = useParams<{ id: string }>()
  const [caso, setCaso] = useState<CasoDetalle | null>(null)
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [imagenes, setImagenes] = useState<Imagen[]>([])
  const [notas, setNotas] = useState<Nota[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Nota | null>(null)
  const [isNoteViewerOpen, setIsNoteViewerOpen] = useState(false)
  const [notesSearchTerm, setNotesSearchTerm] = useState('')
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [isSetupLoading, setIsSetupLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo: '',
    descripcion: '',
    estado: '',
    prioridad: '',
    fecha_vencimiento: '',
    cliente_id: ''
  })
  const [clientes, setClientes] = useState<{ id: string; nombre: string; email: string | null }[]>([])
  const [noteForm, setNoteForm] = useState({
    titulo: '',
    contenido: '',
    tags: [] as string[]
  })
  const { user } = useAuth()

  // Check if this is the example case
  const isExampleCase = id === 'ejemplo-demo-caso-001'

  useEffect(() => {
    if (id) {
      fetchCaso()
      fetchDocumentos()
      fetchImagenes()
      fetchNotas()
      fetchClientes()
    }
  }, [id, user])

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

  const fetchCaso = async () => {
    if (!user || !id) return

    try {
      // Handle example case
      if (isExampleCase) {
        setCaso(casoEjemplo)
        setEditForm({
          titulo: casoEjemplo.titulo,
          descripcion: casoEjemplo.descripcion || '',
          estado: casoEjemplo.estado,
          prioridad: casoEjemplo.prioridad,
          fecha_vencimiento: casoEjemplo.fecha_vencimiento ? casoEjemplo.fecha_vencimiento.split('T')[0] : '',
          cliente_id: casoEjemplo.cliente_id || ''
        })
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('casos')
        .select(`
          *,
          cliente:clientes(id, nombre, email)
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) throw error
      setCaso(data)
      if (data) {
        setEditForm({
          titulo: data.titulo,
          descripcion: data.descripcion || '',
          estado: data.estado,
          prioridad: data.prioridad,
          fecha_vencimiento: data.fecha_vencimiento ? data.fecha_vencimiento.split('T')[0] : '',
          cliente_id: data.cliente_id || ''
        })
      }
    } catch (error) {
      console.error('Error fetching caso:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDocumentos = async () => {
    if (!user || !id) return

    try {
      // Handle example case
      if (isExampleCase) {
        setDocumentos(documentosEjemplo)
        return
      }

      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('caso_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocumentos(data || [])
    } catch (error) {
      console.error('Error fetching documentos:', error)
    }
  }

  const fetchImagenes = async () => {
    if (!user || !id) return

    try {
      // Handle example case
      if (isExampleCase) {
        setImagenes(imagenesEjemplo)
        return
      }

      const { data, error } = await supabase
        .from('imagenes')
        .select('*')
        .eq('caso_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setImagenes(data || [])
    } catch (error) {
      console.error('Error fetching imagenes:', error)
    }
  }

  const fetchNotas = async () => {
    if (!user || !id) return

    try {
      // Handle example case
      if (isExampleCase) {
        setNotas(notasEjemplo)
        return
      }

      // Fetch notes for this case
      const { data: notasData, error: notasError } = await supabase
        .from('notas')
        .select('*')
        .eq('caso_id', id)
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

      setNotas(notasWithTags)
    } catch (error) {
      console.error('Error fetching notas:', error)
    }
  }

  const createNota = async () => {
    if (!user || !noteForm.titulo.trim() || isExampleCase) return

    try {
      // Create the note
      const { data: notaData, error: notaError } = await supabase
        .from('notas')
        .insert({
          titulo: noteForm.titulo,
          contenido: noteForm.contenido,
          contenido_texto: noteForm.contenido,
          caso_id: id,
          user_id: user.id,
        })
        .select()
        .single()

      if (notaError) throw notaError

      // Add tags
      if (noteForm.tags.length > 0) {
        const tagInserts = noteForm.tags.map(tagId => ({
          nota_id: notaData.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase
          .from('nota_tags')
          .insert(tagInserts)

        if (tagsError) throw tagsError
      }

      await fetchNotas()
      setIsCreateNoteOpen(false)
      setNoteForm({ titulo: '', contenido: '', tags: [] })
    } catch (error) {
      console.error('Error creating nota:', error)
      alert('Error al crear la nota')
    }
  }

  const deleteNota = async (notaId: string) => {
    if (isExampleCase) {
      alert('No puedes eliminar notas del caso de ejemplo')
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

  const toggleFavoriteNota = async (notaId: string, isFavorita: boolean) => {
    if (isExampleCase) return

    try {
      const { error } = await supabase
        .from('notas')
        .update({ is_favorita: !isFavorita })
        .eq('id', notaId)

      if (error) throw error
      await fetchNotas()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !id || isExampleCase) return

    setUploading(true)
    try {
      console.log('📤 Iniciando subida de archivo desde detalle de caso:', file.name)
      
      // Use StorageService which includes text extraction
      const uploadResult = await StorageService.uploadDocument(
        file, 
        user.id, 
        'documentos'
      )

      if (uploadResult.error) {
        throw new Error(uploadResult.error)
      }

      console.log('✅ Archivo subido exitosamente:', uploadResult.url)

      // Save document record with extracted content
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: file.name,
          tipo: file.type,
          tamaño: file.size,
          url: uploadResult.url,
          contenido: uploadResult.contenido,
          caso_id: id,
          user_id: user.id
        })

      if (dbError) throw dbError

      console.log('✅ Documento guardado en BD con contenido extraído')
      await fetchDocumentos()
    } catch (error) {
      console.error('❌ Error uploading file:', error)
      alert(`Error al subir el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !id || isExampleCase) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen')
      return
    }

    setUploadingImage(true)
    try {
      console.log('🖼️ Iniciando subida de imagen:', file.name, 'Tipo:', file.type, 'Tamaño:', file.size)
      
      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/casos/${id}/${Date.now()}-${file.name}`
      
      console.log('📁 Ruta de archivo:', fileName)

      // Check if the bucket exists first
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
      
      if (bucketsError) {
        console.error('❌ Error listando buckets:', bucketsError)
        throw new Error('Error verificando almacenamiento: ' + bucketsError.message)
      }
      
      const hasImagesBucket = buckets?.some(bucket => bucket.name === 'imagenes')
      if (!hasImagesBucket) {
        console.error('❌ Bucket "imagenes" no encontrado')
        throw new Error('El bucket de imágenes no está configurado. Contacta al administrador.')
      }

      console.log('✅ Bucket "imagenes" encontrado, subiendo archivo...')

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error subiendo a storage:', uploadError)
        throw new Error('Error al subir imagen: ' + uploadError.message)
      }

      console.log('✅ Imagen subida exitosamente:', uploadData.path)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('imagenes')
        .getPublicUrl(fileName)

      console.log('🔗 URL pública generada:', publicUrl)

      // Save image record
      const imageRecord = {
        nombre: file.name,
        tipo: file.type,
        tamaño: file.size,
        url: publicUrl,
        caso_id: id,
        user_id: user.id
      }
      
      console.log('💾 Guardando registro en BD:', imageRecord)

      const { error: dbError } = await supabase
        .from('imagenes')
        .insert(imageRecord)

      if (dbError) {
        console.error('❌ Error guardando en BD:', dbError)
        // Try to clean up the uploaded file
        await supabase.storage.from('imagenes').remove([fileName])
        throw new Error('Error al guardar imagen en base de datos: ' + dbError.message)
      }

      console.log('✅ Imagen guardada exitosamente en BD')
      await fetchImagenes()
      
      // Clear the input
      if (event.target) {
        event.target.value = ''
      }
      
    } catch (error) {
      console.error('💥 Error completo al subir imagen:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al subir imagen'
      alert(errorMessage)
    } finally {
      setUploadingImage(false)
    }
  }

  const updateCaso = async () => {
    if (!user || !id || isExampleCase) return

    try {
      const { error } = await supabase
        .from('casos')
        .update({
          titulo: editForm.titulo,
          descripcion: editForm.descripcion,
          estado: editForm.estado,
          prioridad: editForm.prioridad,
          fecha_vencimiento: editForm.fecha_vencimiento || null,
          cliente_id: editForm.cliente_id || null
        })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      await fetchCaso()
      setIsEditOpen(false)
    } catch (error) {
      console.error('Error updating caso:', error)
    }
  }

  const deleteCaso = async () => {
    if (!user || !id || isExampleCase) return

    if (!confirm('¿Estás seguro de que quieres eliminar este caso? Esta acción eliminará también todos sus documentos, notas e imágenes asociadas.')) return

    try {
      // Eliminar documentos asociados del storage
      if (documentos.length > 0) {
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
      if (imagenes.length > 0) {
        for (const img of imagenes) {
          if (img.url.includes('supabase')) {
            const fileName = img.url.split('/').pop()
            if (fileName) {
              await supabase.storage
                .from('imagenes')
                .remove([`${user.id}/casos/${id}/${fileName}`])
            }
          }
        }
      }

      // Eliminar el caso de la base de datos (cascade eliminará notas, documentos e imágenes)
      const { error: deleteError } = await supabase
        .from('casos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Redirigir a la lista de casos
      window.location.href = '/casos'
    } catch (error) {
      console.error('Error deleting caso:', error)
      alert('Error al eliminar el caso')
    }
  }

  const deleteDocumento = async (docId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este documento?') || isExampleCase) return

    try {
      // Get document info to delete from storage
      const documento = documentos.find(d => d.id === docId)
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', docId)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Delete from storage if it's a real document
      if (documento && documento.url.includes('supabase')) {
        const fileName = documento.url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('documentos')
            .remove([`${user.id}/${fileName}`])
        }
      }

      await fetchDocumentos()
    } catch (error) {
      console.error('Error deleting documento:', error)
    }
  }

  const deleteImagen = async (imgId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta imagen?') || isExampleCase) return

    try {
      // Get image info to delete from storage
      const imagen = imagenes.find(i => i.id === imgId)
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('imagenes')
        .delete()
        .eq('id', imgId)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Delete from storage if it's a real image
      if (imagen && imagen.url.includes('supabase')) {
        const fileName = imagen.url.split('/').pop()
        if (fileName) {
          await supabase.storage
            .from('imagenes')
            .remove([`${user.id}/casos/${id}/${fileName}`])
        }
      }

      await fetchImagenes()
    } catch (error) {
      console.error('Error deleting imagen:', error)
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Desconocido'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDocumentClick = (doc: Documento) => {
    setSelectedDocument(doc)
    setIsViewerOpen(true)
  }

  const handleDownload = (doc: Documento) => {
    if (isExampleCase && doc.url === '#') {
      alert('Los documentos de ejemplo no se pueden descargar')
      return
    }
    
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.nombre
    link.click()
  }

  const openNoteViewer = (nota: Nota) => {
    setSelectedNote(nota)
    setIsNoteViewerOpen(true)
  }

  const setupImageStorage = async () => {
    if (!user) return
    
    setIsSetupLoading(true)
    try {
      const result = await ImageStorageSetup.ensureImagesBucketExists()
      
      if (result.success) {
        // Probar la subida
        const testResult = await ImageStorageSetup.testImageUpload(user.id)
        alert(result.message + '\n\n' + testResult.message)
      } else {
        // Si falla, mostrar instrucciones específicas
        if (result.message.includes('tabla')) {
          // Problema con la tabla
          const shouldApply = confirm(result.message + '\n\n¿Quieres que intente aplicar la migración automáticamente?')
          if (shouldApply) {
            await applyImagesMigration()
          }
        } else {
          alert(result.message)
        }
      }
    } catch (error) {
      console.error('Error configurando almacenamiento:', error)
      alert('Error al configurar almacenamiento: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSetupLoading(false)
    }
  }

  const applyImagesMigration = async () => {
    try {
      setIsSetupLoading(true)
      console.log('📝 Aplicando migración de tabla imágenes...')
      
      // Ejecutar la migración SQL directamente
      const migrationSQL = `
        -- Crear tabla de imágenes
        CREATE TABLE IF NOT EXISTS imagenes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre text NOT NULL,
          tipo text,
          tamaño bigint,
          url text NOT NULL,
          caso_id uuid REFERENCES casos(id) ON DELETE CASCADE,
          nota_id uuid REFERENCES notas(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );

        -- Habilitar RLS en la tabla de imágenes
        ALTER TABLE imagenes ENABLE ROW LEVEL SECURITY;

        -- Políticas RLS para imágenes
        DROP POLICY IF EXISTS "Users can manage own images" ON imagenes;
        CREATE POLICY "Users can manage own images"
          ON imagenes
          FOR ALL
          TO authenticated
          USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());

        -- Trigger para updated_at
        DROP TRIGGER IF EXISTS imagenes_updated_at ON imagenes;
        CREATE TRIGGER imagenes_updated_at
          BEFORE UPDATE ON imagenes
          FOR EACH ROW
          EXECUTE FUNCTION handle_updated_at();

        -- Índices para performance
        CREATE INDEX IF NOT EXISTS idx_imagenes_user_id ON imagenes(user_id);
        CREATE INDEX IF NOT EXISTS idx_imagenes_caso_id ON imagenes(caso_id);
        CREATE INDEX IF NOT EXISTS idx_imagenes_nota_id ON imagenes(nota_id);
        CREATE INDEX IF NOT EXISTS idx_imagenes_created_at ON imagenes(created_at DESC);
      `
      
      // Ejecutar la migración usando supabase.rpc si existe una función para ello
      // Si no, mostrar instrucciones
      alert(`❌ No se puede aplicar la migración automáticamente.

🔧 SOLUCIÓN MANUAL:

1. Ve a tu panel de Supabase → SQL Editor
2. Ejecuta esta migración:

${migrationSQL}

3. O desde terminal:
   npx supabase db reset

4. Después haz clic en el botón "🔧 Config" nuevamente`)
      
    } catch (error) {
      console.error('Error aplicando migración:', error)
      alert('Error aplicando migración: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSetupLoading(false)
    }
  }

  // Filter notes based on search and tags
  const filteredNotas = notas.filter(nota => {
    const matchesSearch = nota.titulo.toLowerCase().includes(notesSearchTerm.toLowerCase()) ||
                         nota.contenido_texto.toLowerCase().includes(notesSearchTerm.toLowerCase())
    
    const matchesTag = selectedTagFilter === 'all' || 
                      nota.tags?.some(tag => tag.id === selectedTagFilter)
    
    return matchesSearch && matchesTag
  })

  // Get all unique tags from notes
  const allTags = Array.from(
    new Map(
      notas.flatMap(nota => nota.tags || [])
        .map(tag => [tag.id, tag])
    ).values()
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando caso...</div>
      </div>
    )
  }

  if (!caso) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text mb-2">Caso no encontrado</h2>
        <p className="text-subtext0 mb-4">El caso que buscas no existe o no tienes permisos para verlo.</p>
        <Link to="/casos">
          <Button>Volver a casos</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/casos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-text">{caso.titulo}</h1>
            <p className="text-subtext0">
              Caso #{caso.id.slice(0, 8)}
              {isExampleCase && (
                <Badge variant="secondary" className="ml-2 bg-yellow text-base">
                  Ejemplo - Solo lectura
                </Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={isExampleCase}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar caso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="titulo">Título</Label>
                  <Input
                    id="titulo"
                    value={editForm.titulo}
                    onChange={(e) => setEditForm(prev => ({ ...prev, titulo: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={editForm.descripcion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, descripcion: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={editForm.estado} onValueChange={(value) => setEditForm(prev => ({ ...prev, estado: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En Revisión">En Revisión</SelectItem>
                        <SelectItem value="Cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select value={editForm.prioridad} onValueChange={(value) => setEditForm(prev => ({ ...prev, prioridad: value }))}>
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
                  <Label htmlFor="fecha_vencimiento">Fecha de vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={editForm.fecha_vencimiento}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cliente (opcional)</Label>
                  <Select value={editForm.cliente_id || "none"} onValueChange={(value) => setEditForm(prev => ({ ...prev, cliente_id: value === "none" ? "" : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin cliente asignado</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nombre} {cliente.email && `(${cliente.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={updateCaso}>
                    Guardar cambios
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            variant="destructive" 
            onClick={deleteCaso}
            disabled={isExampleCase}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Caso
          </Button>
        </div>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del caso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <StatusBadge status={caso.estado} />
              <PriorityBadge priority={caso.prioridad} />
            </div>

            {caso.descripcion && (
              <div>
                <h4 className="font-medium text-text mb-2">Descripción</h4>
                <p className="text-subtext0">{caso.descripcion}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue" />
                <span className="text-subtext0">Creado: {formatDate(caso.created_at)}</span>
              </div>
              {caso.fecha_vencimiento && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow" />
                  <span className="text-subtext0">Vence: {formatDate(caso.fecha_vencimiento)}</span>
                </div>
              )}
              {caso.cliente && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green" />
                  <span className="text-subtext0">Cliente: {caso.cliente.nombre}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Documents, Images and Notes */}
      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documentos">
            <FileText className="h-4 w-4 mr-2" />
            Documentos ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="imagenes">
            <ImageIcon className="h-4 w-4 mr-2" />
            Imágenes ({imagenes.length})
          </TabsTrigger>
          <TabsTrigger value="notas">
            <StickyNote className="h-4 w-4 mr-2" />
            Notas ({notas.length})
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vault de documentos</CardTitle>
                  <CardDescription>
                    Documentos asociados a este caso
                    {isExampleCase && (
                      <span className="block text-yellow mt-1">
                        Los documentos de ejemplo tienen funcionalidad limitada
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading || isExampleCase}
                  />
                  <Button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading || isExampleCase}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Subiendo...' : 'Subir archivo'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {documentos.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                  <p className="text-subtext0 mb-4">No hay documentos en este caso</p>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading || isExampleCase}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir primer documento
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-surface1 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue" />
                        <div>
                          <h4 className="font-medium text-text">{doc.nombre}</h4>
                          <div className="flex items-center gap-4 text-xs text-subtext0">
                            <span>{formatFileSize(doc.tamaño)}</span>
                            <span>{formatDate(doc.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDocumentClick(doc)}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(doc)}
                          title="Descargar documento"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocumento(doc.id)}
                          className="text-red hover:text-red"
                          disabled={isExampleCase}
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="imagenes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Galería de imágenes</CardTitle>
                  <CardDescription>
                    Imágenes y evidencia fotográfica del caso
                    {isExampleCase && (
                      <span className="block text-yellow mt-1">
                        Las imágenes de ejemplo tienen funcionalidad limitada
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={setupImageStorage}
                    disabled={isSetupLoading}
                    title="Configurar almacenamiento de imágenes"
                  >
                    {isSetupLoading ? '⚙️' : '🔧'}
                    {isSetupLoading ? ' Configurando...' : ' Config'}
                  </Button>
                  <input
                    type="file"
                    id="image-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage || isExampleCase}
                  />
                  <Button
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImage || isExampleCase}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {imagenes.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                  <p className="text-subtext0 mb-4">No hay imágenes en este caso</p>
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploadingImage || isExampleCase}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir primera imagen
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                          {!isExampleCase && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 w-8 p-0 text-red hover:text-red"
                              onClick={() => deleteImagen(imagen.id)}
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notas del caso</CardTitle>
                  <CardDescription>
                    Notas y observaciones relacionadas con este caso
                  </CardDescription>
                </div>
                <Dialog open={isCreateNoteOpen} onOpenChange={setIsCreateNoteOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={isExampleCase}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Nota
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Crear nueva nota</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="note-titulo">Título</Label>
                        <Input
                          id="note-titulo"
                          value={noteForm.titulo}
                          onChange={(e) => setNoteForm(prev => ({ ...prev, titulo: e.target.value }))}
                          placeholder="Título de la nota..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="note-contenido">Contenido</Label>
                        <Textarea
                          id="note-contenido"
                          value={noteForm.contenido}
                          onChange={(e) => setNoteForm(prev => ({ ...prev, contenido: e.target.value }))}
                          placeholder="Escribe tu nota aquí..."
                          rows={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Tags</Label>
                        <TagManager
                          selectedTags={noteForm.tags}
                          onTagsChange={(tags) => setNoteForm(prev => ({ ...prev, tags }))}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateNoteOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={createNota} disabled={!noteForm.titulo.trim()}>
                          Crear Nota
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Notes Filters */}
              {notas.length > 0 && (
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
                    <Input
                      placeholder="Buscar en notas..."
                      value={notesSearchTerm}
                      onChange={(e) => setNotesSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {allTags.length > 0 && (
                    <Select value={selectedTagFilter} onValueChange={setSelectedTagFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Filtrar por tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tags</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag.id} value={tag.id}>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              #{tag.nombre}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {filteredNotas.length === 0 ? (
                <div className="text-center py-8">
                  <StickyNote className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                  <p className="text-subtext0 mb-4">
                    {notas.length === 0 ? 'No hay notas en este caso' : 'No se encontraron notas con los filtros aplicados'}
                  </p>
                  {notas.length === 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateNoteOpen(true)}
                      disabled={isExampleCase}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primera nota
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotas.map((nota) => (
                    <div key={nota.id} className="p-4 bg-surface1 rounded-lg cursor-pointer hover:bg-surface2 transition-colors" onClick={() => openNoteViewer(nota)}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-text">{nota.titulo}</h4>
                            {nota.is_favorita && (
                              <Star className="h-4 w-4 fill-yellow text-yellow" />
                            )}
                          </div>
                          
                          {nota.tags && nota.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {nota.tags.map(tag => (
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
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavoriteNota(nota.id, nota.is_favorita)
                            }}
                            disabled={isExampleCase}
                          >
                            <Star 
                              className={`h-4 w-4 ${
                                nota.is_favorita ? 'fill-yellow text-yellow' : 'text-subtext0'
                              }`} 
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red hover:text-red"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNota(nota.id)
                            }}
                            disabled={isExampleCase}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-subtext0 mb-3 line-clamp-3">
                        {nota.contenido}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-subtext0">
                        <span>Creado: {formatDate(nota.created_at)}</span>
                        <span>Actualizado: {formatDate(nota.updated_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setSelectedDocument(null)
        }}
        document={selectedDocument}
      />

      {/* Note Viewer */}
      <NoteViewer
        isOpen={isNoteViewerOpen}
        onClose={() => {
          setIsNoteViewerOpen(false)
          setSelectedNote(null)
        }}
        note={selectedNote}
        onUpdate={fetchNotas}
      />
    </div>
  )
}