import { useState, useEffect } from 'react'
import { X, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink, AlertCircle, FileText, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DocumentViewerProps {
  isOpen: boolean
  onClose: () => void
  document: {
    id: string
    nombre: string
    tipo: string | null
    url: string
    tamaño: number | null
  } | null
}

export function DocumentViewer({ isOpen, onClose, document }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documentUrl, setDocumentUrl] = useState<string>('')

  const isExampleDocument = document?.id === 'ejemplo-documento-001' || document?.url === '#'

  useEffect(() => {
    if (document && isOpen) {
      setIsLoading(true)
      setError(null)
      setZoom(100)
      setRotation(0)
      
      if (isExampleDocument) {
        // Para documentos de ejemplo, usar URL directa
        setDocumentUrl(document.url)
        setIsLoading(false)
      } else {
        // Para documentos reales, verificar accesibilidad
        checkDocumentAccess()
      }
    }
  }, [document, isOpen])

  const checkDocumentAccess = async () => {
    if (!document) return

    try {
      // Intentar acceder a la URL directamente
      const response = await fetch(document.url, { method: 'HEAD' })
      
      if (response.ok) {
        setDocumentUrl(document.url)
      } else {
        setError('No se puede acceder al documento. Puede que el archivo haya sido movido o eliminado.')
      }
    } catch (error) {
      console.error('Error checking document access:', error)
      setError('Error al verificar el acceso al documento.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!document) return null

  const isPDF = document.tipo?.includes('pdf') || document.nombre.toLowerCase().endsWith('.pdf')
  const isImage = document.tipo?.includes('image') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(document.nombre)
  const isText = document.tipo?.includes('text') || /\.(txt|csv)$/i.test(document.nombre)
  const isWord = document.tipo?.includes('word') || document.tipo?.includes('document') || /\.(doc|docx)$/i.test(document.nombre)
  const isExcel = document.tipo?.includes('excel') || document.tipo?.includes('sheet') || /\.(xls|xlsx)$/i.test(document.nombre)
  const isZip = document.tipo?.includes('zip') || /\.(zip|rar|7z)$/i.test(document.nombre)

  const handleDownload = async () => {
    if (isExampleDocument) {
      alert('Este es un documento de ejemplo. Sube tus propios documentos para descargarlos.')
      return
    }

    try {
      setIsLoading(true)
      
      // Crear enlace de descarga
      const link = document.createElement('a')
      link.href = documentUrl
      link.download = document.nombre
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      
      // Agregar al DOM temporalmente para hacer clic
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error al descargar el documento. Intenta abrirlo en una nueva pestaña.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenInNewTab = () => {
    if (isExampleDocument) {
      alert('Este es un documento de ejemplo. Sube tus propios documentos para visualizarlos.')
      return
    }
    
    window.open(documentUrl, '_blank', 'noopener,noreferrer')
  }

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Desconocido'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileTypeIcon = () => {
    if (isPDF) return '📄'
    if (isImage) return '🖼️'
    if (isWord) return '📝'
    if (isExcel) return '📊'
    if (isText) return '📃'
    if (isZip) return '🗜️'
    return '📄'
  }

  const getFileTypeDescription = () => {
    if (isPDF) return 'Documento PDF'
    if (isImage) return 'Imagen'
    if (isWord) return 'Documento de Word'
    if (isExcel) return 'Hoja de cálculo'
    if (isText) return 'Archivo de texto'
    if (isZip) return 'Archivo comprimido'
    return 'Documento'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">{getFileTypeIcon()}</span>
                {document.nombre}
              </DialogTitle>
              <p className="text-sm text-subtext0 mt-1">
                {getFileTypeDescription()} • {formatFileSize(document.tamaño)}
                {isExampleDocument && (
                  <span className="text-yellow ml-2">• Documento de ejemplo</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {(isPDF || isImage) && !isExampleDocument && !error && (
                <>
                  <Button variant="outline" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-subtext0 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Button variant="outline" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  
                  {isImage && (
                    <Button variant="outline" size="sm" onClick={handleRotate}>
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab} disabled={isLoading}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                {isLoading ? 'Descargando...' : 'Descargar'}
              </Button>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6 pt-4">
          <div className="flex items-center justify-center min-h-[400px] bg-surface0 rounded-lg">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue mx-auto mb-4"></div>
                <p className="text-subtext0">Cargando documento...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text mb-2">
                  Error al cargar el documento
                </h3>
                <p className="text-subtext0 mb-4 max-w-md">
                  {error}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={checkDocumentAccess}>
                    Reintentar
                  </Button>
                  <Button variant="outline" onClick={handleOpenInNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en nueva pestaña
                  </Button>
                </div>
              </div>
            ) : isExampleDocument ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">{getFileTypeIcon()}</div>
                <h3 className="text-lg font-medium text-text mb-2">
                  Documento de ejemplo
                </h3>
                <p className="text-subtext0 mb-4 max-w-md">
                  Este es un documento de ejemplo para mostrar cómo funciona el previsualizador. 
                  Sube tus propios documentos para visualizarlos y descargarlos.
                </p>
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            ) : isPDF ? (
              <div className="w-full h-[600px] relative">
                <iframe
                  src={`${documentUrl}#zoom=${zoom}&toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0 rounded"
                  title={document.nombre}
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top left',
                    width: `${100 / (zoom / 100)}%`,
                    height: `${100 / (zoom / 100)}%`
                  }}
                  onError={() => {
                    setError('Error al cargar el PDF. Intenta abrirlo en una nueva pestaña.')
                  }}
                />
              </div>
            ) : isImage ? (
              <div className="max-w-full max-h-[600px] overflow-auto">
                <img
                  src={documentUrl}
                  alt={document.nombre}
                  className="max-w-none"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease',
                    transformOrigin: 'center'
                  }}
                  onError={() => {
                    setError('Error al cargar la imagen. El archivo puede estar dañado o no ser accesible.')
                  }}
                />
              </div>
            ) : isText ? (
              <div className="w-full h-[600px] bg-surface1 rounded p-4 overflow-auto">
                <iframe
                  src={documentUrl}
                  className="w-full h-full border-0"
                  title={document.nombre}
                  onError={() => {
                    setError('Error al cargar el archivo de texto.')
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">{getFileTypeIcon()}</div>
                <h3 className="text-lg font-medium text-text mb-2">
                  {getFileTypeDescription()}
                </h3>
                <p className="text-subtext0 mb-4 max-w-md">
                  {isWord && "Los documentos de Word no se pueden previsualizar directamente en el navegador."}
                  {isExcel && "Las hojas de cálculo no se pueden previsualizar directamente en el navegador."}
                  {isZip && "Los archivos comprimidos no se pueden previsualizar. Descárgalo para ver su contenido."}
                  {!isWord && !isExcel && !isZip && "Este tipo de archivo no se puede previsualizar en el navegador."}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleOpenInNewTab}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en nueva pestaña
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar archivo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}