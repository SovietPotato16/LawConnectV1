import { useState, useEffect } from 'react'
import { Upload, Search, Filter, FileText, Download, Trash2, Eye, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DocumentViewer } from '@/components/DocumentViewer'
import { StorageService } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface Documento {
  id: string
  nombre: string
  tipo: string | null
  tamaño: number | null
  url: string
  caso_id: string | null
  cliente_id: string | null
  user_id: string
  created_at: string
  caso?: { id: string; titulo: string }
  cliente?: { id: string; nombre: string }
}

interface Caso {
  id: string
  titulo: string
}

interface Cliente {
  id: string
  nombre: string
}

// Documento de ejemplo
const documentoEjemplo: Documento = {
  id: 'ejemplo-documento-001',
  nombre: '📄 Documento de Ejemplo - Contrato Modelo.pdf',
  tipo: 'application/pdf',
  tamaño: 245760, // 240 KB
  url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', // URL de ejemplo para PDF
  caso_id: null,
  cliente_id: null,
  user_id: 'ejemplo',
  created_at: '2024-01-01T10:00:00Z'
}

export function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [casos, setCasos] = useState<Caso[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [casoFilter, setCasoFilter] = useState<string>('all')
  const [clienteFilter, setClienteFilter] = useState<string>('all')
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    caso_id: '',
    cliente_id: ''
  })
  const { user } = useAuth()

  useEffect(() => {
    fetchDocumentos()
    fetchCasos()
    fetchClientes()
  }, [user])

  const fetchDocumentos = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('documentos')
        .select(`
          *,
          caso:casos(id, titulo),
          cliente:clientes(id, nombre)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Agregar documento de ejemplo al inicio
      const documentosConEjemplo = [documentoEjemplo, ...(data || [])]
      setDocumentos(documentosConEjemplo)
    } catch (error) {
      console.error('Error fetching documentos:', error)
      setDocumentos([documentoEjemplo])
    } finally {
      setLoading(false)
    }
  }

  const fetchCasos = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('casos')
        .select('id, titulo')
        .eq('user_id', user.id)
        .order('titulo')

      if (error) throw error
      setCasos(data || [])
    } catch (error) {
      console.error('Error fetching casos:', error)
    }
  }

  const fetchClientes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .eq('user_id', user.id)
        .order('nombre')

      if (error) throw error
      setClientes(data || [])
    } catch (error) {
      console.error('Error fetching clientes:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setUploadError(null)

    try {
      // Use the StorageService for better error handling
      const uploadResult = await StorageService.uploadDocument(
        file, 
        user.id, 
        uploadForm.caso_id ? `casos/${uploadForm.caso_id}` : undefined
      )

      if (uploadResult.error) {
        throw new Error(uploadResult.error)
      }

      // Save document record
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          nombre: file.name,
          tipo: file.type,
          tamaño: file.size,
          url: uploadResult.url,
          caso_id: uploadForm.caso_id || null,
          cliente_id: uploadForm.cliente_id || null,
          user_id: user.id
        })

      if (dbError) throw dbError

      await fetchDocumentos()
      setIsUploadOpen(false)
      setUploadForm({ caso_id: '', cliente_id: '' })
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadError(error instanceof Error ? error.message : 'Error al subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  const deleteDocumento = async (docId: string) => {
    if (docId === 'ejemplo-documento-001') {
      alert('No puedes eliminar el documento de ejemplo')
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este documento?')) return

    try {
      // Get document info to delete from storage
      const documento = documentos.find(d => d.id === docId)
      
      // Delete from database first
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', docId)
        .eq('user_id', user.id)

      if (dbError) throw dbError

      // Delete from storage if it's a real document
      if (documento && documento.url.includes('supabase')) {
        const pathParts = documento.url.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const folderPath = pathParts[pathParts.length - 2]
        const fullPath = `${user.id}/${folderPath}/${fileName}`
        
        await StorageService.deleteFile('documentos', fullPath)
      }

      await fetchDocumentos()
    } catch (error) {
      console.error('Error deleting documento:', error)
      alert('Error al eliminar el documento')
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Desconocido'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (tipo: string | null) => {
    if (!tipo) return FileText
    if (tipo.includes('pdf')) return FileText
    if (tipo.includes('image')) return Eye
    if (tipo.includes('word') || tipo.includes('document')) return FileText
    return FileText
  }

  const handleDocumentClick = (doc: Documento) => {
    setSelectedDocument(doc)
    setIsViewerOpen(true)
  }

  const handleDownload = async (doc: Documento) => {
    if (doc.id === 'ejemplo-documento-001') {
      alert('Este es un documento de ejemplo. Sube tus propios documentos para descargarlos.')
      return
    }
    
    try {
      // Try direct download first
      const link = document.createElement('a')
      link.href = doc.url
      link.download = doc.nombre
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error al descargar el documento. Intenta abrirlo en una nueva pestaña.')
    }
  }

  const filteredDocumentos = documentos.filter(doc => {
    const matchesSearch = doc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCaso = casoFilter === 'all' || doc.caso_id === casoFilter
    const matchesCliente = clienteFilter === 'all' || doc.cliente_id === clienteFilter
    
    return matchesSearch && matchesCaso && matchesCliente
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-subtext0">Cargando documentos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Documentos</h1>
          <p className="text-subtext0">Gestiona todos tus documentos legales</p>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Subir Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir nuevo documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Asociar a caso (opcional)</Label>
                <Select value={uploadForm.caso_id} onValueChange={(value) => setUploadForm(prev => ({ ...prev, caso_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar caso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {casos.map((caso) => (
                      <SelectItem key={caso.id} value={caso.id}>
                        {caso.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Asociar a cliente (opcional)</Label>
                <Select value={uploadForm.cliente_id} onValueChange={(value) => setUploadForm(prev => ({ ...prev, cliente_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Seleccionar archivo</Label>
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.zip"
                  className="block w-full text-sm text-subtext0 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue file:text-base hover:file:bg-blue/90"
                />
                <p className="text-xs text-subtext0">
                  Formatos soportados: PDF, Word, Excel, TXT, CSV, ZIP (máx. 50MB)
                </p>
              </div>

              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red" />
                  <p className="text-sm text-red">{uploadError}</p>
                </div>
              )}

              {uploading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue mx-auto mb-2"></div>
                  <div className="text-subtext0">Subiendo archivo...</div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={casoFilter} onValueChange={setCasoFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por caso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los casos</SelectItem>
            {casos.map((caso) => (
              <SelectItem key={caso.id} value={caso.id}>
                {caso.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clienteFilter} onValueChange={setClienteFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filtrar por cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Documents Grid */}
      {filteredDocumentos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-subtext0 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text mb-2">
              {documentos.length <= 1 ? 'No tienes documentos' : 'No se encontraron documentos'}
            </h3>
            <p className="text-subtext0 mb-4">
              {documentos.length <= 1 
                ? 'Sube tu primer documento para comenzar'
                : 'Intenta ajustar los filtros de búsqueda'
              }
            </p>
            {documentos.length <= 1 && (
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Subir primer documento
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocumentos.map((doc) => {
            const IconComponent = getFileIcon(doc.tipo)
            return (
              <Card key={doc.id} className="hover:bg-surface1 transition-colors cursor-pointer h-[280px] flex flex-col" onClick={() => handleDocumentClick(doc)}>
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <IconComponent className="h-8 w-8 text-blue flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">{doc.nombre}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-subtext0">{formatFileSize(doc.tamaño)}</span>
                          <span className="text-xs text-subtext0">{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap gap-1">
                      {doc.caso && (
                        <Badge variant="outline" className="text-xs">
                          📁 {doc.caso.titulo}
                        </Badge>
                      )}
                      {doc.cliente && (
                        <Badge variant="outline" className="text-xs">
                          👤 {doc.cliente.nombre}
                        </Badge>
                      )}
                      {doc.id === 'ejemplo-documento-001' && (
                        <Badge variant="secondary" className="text-xs bg-yellow text-base">
                          Ejemplo
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-surface2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDocumentClick(doc)
                      }}
                      title="Ver documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc)
                      }}
                      title="Descargar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteDocumento(doc.id)
                      }}
                      className="text-red hover:text-red"
                      title="Eliminar documento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {documentos.length === 1 && documentos[0].id === 'ejemplo-documento-001' && (
        <Card className="border-blue/20 bg-blue/5">
          <CardContent className="text-center py-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-lg font-medium text-text mb-2">¡Comienza a organizar tus documentos!</h3>
              <p className="text-subtext0 mb-4">
                Arriba puedes ver un documento de ejemplo. Sube tus propios documentos para crear tu vault legal.
              </p>
              <Button onClick={() => setIsUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Subir mi primer documento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Viewer */}
      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false)
          setSelectedDocument(null)
        }}
        document={selectedDocument}
      />
    </div>
  )
}