import { useState, useEffect } from 'react'
import { FileText, Briefcase, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Document {
  id: string
  nombre: string
  tipo: string | null
  caso_id: string | null
  cliente_id: string | null
  created_at: string
}

interface Case {
  id: string
  titulo: string
  descripcion: string | null
  estado: string
  prioridad: string
  created_at: string
  cliente?: {
    nombre: string
  }
}

interface ContextSelectorProps {
  selectedDocuments: string[]
  selectedCase: string | null
  onDocumentsChange: (documentIds: string[]) => void
  onCaseChange: (caseId: string | null) => void
}

export function ContextSelector({
  selectedDocuments,
  selectedCase,
  onDocumentsChange,
  onCaseChange
}: ContextSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && user) {
      fetchData()
    }
  }, [isOpen, user])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch documents
      const { data: docsData, error: docsError } = await supabase
        .from('documentos')
        .select('id, nombre, tipo, caso_id, cliente_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (docsError) throw docsError

      // Fetch cases
      const { data: casesData, error: casesError } = await supabase
        .from('casos')
        .select(`
          id, titulo, descripcion, estado, prioridad, created_at,
          cliente:clientes(nombre)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (casesError) throw casesError

      setDocuments(docsData || [])
      setCases(casesData || [])
    } catch (error) {
      console.error('Error fetching context data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = documents.filter(doc =>
    doc.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredCases = cases.filter(caso =>
    caso.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caso.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleDocument = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onDocumentsChange(selectedDocuments.filter(id => id !== docId))
    } else {
      onDocumentsChange([...selectedDocuments, docId])
    }
  }

  const selectCase = (caseId: string) => {
    onCaseChange(selectedCase === caseId ? null : caseId)
  }

  const clearAll = () => {
    onDocumentsChange([])
    onCaseChange(null)
  }

  const selectedDocsCount = selectedDocuments.length
  const hasSelectedCase = !!selectedCase

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <FileText className="h-4 w-4 mr-2" />
          Contexto
          {(selectedDocsCount > 0 || hasSelectedCase) && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
              {selectedDocsCount + (hasSelectedCase ? 1 : 0)}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Seleccionar contexto para IA</DialogTitle>
            {(selectedDocsCount > 0 || hasSelectedCase) && (
              <Button variant="outline" size="sm" onClick={clearAll}>
                <X className="h-4 w-4 mr-2" />
                Limpiar todo
              </Button>
            )}
          </div>
          <p className="text-sm text-subtext0">
            Selecciona documentos y/o un caso para proporcionar contexto a la IA
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-subtext0" />
            <Input
              placeholder="Buscar documentos o casos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected Context Summary */}
          {(selectedDocsCount > 0 || hasSelectedCase) && (
            <Card className="bg-blue/5 border-blue/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Contexto seleccionado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {hasSelectedCase && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue" />
                    <span className="text-sm">
                      Caso: {cases.find(c => c.id === selectedCase)?.titulo}
                    </span>
                  </div>
                )}
                {selectedDocsCount > 0 && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green" />
                    <span className="text-sm">
                      {selectedDocsCount} documento{selectedDocsCount > 1 ? 's' : ''} seleccionado{selectedDocsCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tabs for Documents and Cases */}
          <Tabs defaultValue="documents" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents">
                Documentos ({filteredDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="cases">
                Casos ({filteredCases.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="mt-4 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-subtext0">Cargando documentos...</div>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                  <p className="text-subtext0">
                    {searchTerm ? 'No se encontraron documentos' : 'No tienes documentos'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <Card
                      key={doc.id}
                      className={`cursor-pointer transition-colors ${
                        selectedDocuments.includes(doc.id)
                          ? 'bg-blue/10 border-blue/30'
                          : 'hover:bg-surface1'
                      }`}
                      onClick={() => toggleDocument(doc.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{doc.nombre}</h4>
                            <p className="text-xs text-subtext0">
                              {doc.tipo} • {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          {selectedDocuments.includes(doc.id) && (
                            <Badge variant="secondary" className="ml-2">
                              Seleccionado
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="cases" className="mt-4 max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-subtext0">Cargando casos...</div>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-subtext0 mx-auto mb-4" />
                  <p className="text-subtext0">
                    {searchTerm ? 'No se encontraron casos' : 'No tienes casos'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCases.map((caso) => (
                    <Card
                      key={caso.id}
                      className={`cursor-pointer transition-colors ${
                        selectedCase === caso.id
                          ? 'bg-blue/10 border-blue/30'
                          : 'hover:bg-surface1'
                      }`}
                      onClick={() => selectCase(caso.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{caso.titulo}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {caso.estado}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {caso.prioridad}
                              </Badge>
                              {caso.cliente && (
                                <span className="text-xs text-subtext0">
                                  {caso.cliente.nombre}
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedCase === caso.id && (
                            <Badge variant="secondary" className="ml-2">
                              Seleccionado
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Aplicar contexto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}