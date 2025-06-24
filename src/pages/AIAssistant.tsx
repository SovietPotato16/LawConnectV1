import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, FileText, Briefcase, Settings, AlertCircle, Search, BookOpen, Save, Star, Trash2, MessageSquare, BarChart3, Upload, Paperclip, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ContextSelector } from '@/components/ContextSelector'
import { AIService, type ChatSession, type ChatMessage, type AIUsageStats } from '@/lib/aiService'
import { TextExtractionService } from '@/lib/textExtraction'
import { StorageService } from '@/lib/storage'
import { useAuth } from '@/hooks/useAuth'
import { formatDateTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const suggestedQuestions = [
  {
    category: 'Análisis',
    questions: [
      'Analiza los riesgos legales de este documento',
      'Revisa las cláusulas de este contrato',
      'Identifica posibles problemas en este caso'
    ]
  },
  {
    category: 'Estrategia',
    questions: [
      'Sugiere una estrategia para este caso',
      'Qué precedentes son relevantes aquí',
      'Cuáles son los próximos pasos recomendados'
    ]
  },
  {
    category: 'Redacción',
    questions: [
      'Ayúdame a redactar una demanda',
      'Crea un modelo de contrato',
      'Redacta una carta de requerimiento'
    ]
  }
]

export function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [selectedCase, setSelectedCase] = useState<string | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [usageStats, setUsageStats] = useState<AIUsageStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  // 🔧 NEW: Estados para subida de archivos en el chat
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  useEffect(() => {
    if (user) {
      loadUsageStats()
      loadChatSessions()
      
      // Add welcome message if no current session
      if (!currentSessionId && messages.length === 0) {
        setMessages([{
          id: '1',
          session_id: '',
          role: 'assistant',
          content: '¡Hola! Soy tu asistente legal con IA integrado en LawConnect. Puedo ayudarte con análisis de documentos, estrategias de casos, redacción legal y consultas jurídicas.\n\n**Funcionalidades principales:**\n- Análisis contextual de documentos y casos\n- Estrategias legales personalizadas\n- Redacción asistida de documentos\n- Consultas sobre jurisprudencia\n- Guardado de conversaciones\n\n**Límite diario:** 50 consultas por día\n\n¿En qué puedo asistirte hoy?',
          context_used: {},
          created_at: new Date().toISOString(),
        }])
      }
    }
  }, [user, currentSessionId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadUsageStats = async () => {
    try {
      console.log('🔄 Cargando estadísticas reales desde BD...')
      
      // 🔧 DEBUG: Ejecutar función de debugging para investigar el problema
      console.log('🔍 Ejecutando debugging de estadísticas...')
      const debugResult = await AIService.debugUsageStats()
      console.log('🔍 Resultado debugging completo:', debugResult)
      
      const stats = await AIService.getUsageStats()
      console.log('📊 Estadísticas recibidas desde BD:', stats)
      if (stats) {
        setUsageStats(stats)
        console.log('✅ Estado actualizado - Usado:', stats.requests_used, 'Restante:', stats.requests_remaining, 'Límite:', stats.requests_limit)
      } else {
        console.warn('⚠️ No se recibieron estadísticas desde BD')
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error)
    }
  }

  const loadChatSessions = async () => {
    try {
      const sessions = await AIService.getChatSessions()
      setChatSessions(sessions)
    } catch (error) {
      console.error('Error loading chat sessions:', error)
    }
  }

  const loadChatSession = async (sessionId: string) => {
    try {
      const sessionMessages = await AIService.getChatMessages(sessionId)
      setMessages(sessionMessages)
      setCurrentSessionId(sessionId)
      
      // Load context from session
      const session = chatSessions.find(s => s.id === sessionId)
      if (session) {
        setSelectedDocuments(session.context_documents.map(d => d.id))
        setSelectedCase(session.context_case_id || null)
      }
    } catch (error) {
      console.error('Error loading chat session:', error)
      alert('Error cargando la sesión de chat')
    }
  }

  // 🔧 NEW: Funciones para manejo de archivos en el chat
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const validFiles = files.filter(file => {
      // Validar tamaño (máx 10MB por archivo)
      if (file.size > 10 * 1024 * 1024) {
        setError(`El archivo ${file.name} es demasiado grande. Máximo 10MB por archivo.`)
        return false
      }
      // Validar tipo
      if (!TextExtractionService.isTextExtractable(file)) {
        setError(`El archivo ${file.name} no es compatible. Formatos soportados: PDF, Word, TXT, CSV.`)
        return false
      }
      return true
    })
    
    setUploadedFiles(prev => [...prev, ...validFiles])
    // Limpiar el input
    if (event.target) {
      event.target.value = ''
    }
  }

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processUploadedFiles = async (): Promise<{ extractedContent: string; uploadedDocuments: string[] }> => {
    if (uploadedFiles.length === 0) {
      return { extractedContent: '', uploadedDocuments: [] }
    }

    setIsUploading(true)
    let allExtractedContent = ''
    const uploadedDocuments: string[] = []

    try {
      for (const file of uploadedFiles) {
        // Actualizar progreso
        setUploadProgress(prev => ({ ...prev, [file.name]: 25 }))

        // Extraer texto del archivo
        console.log(`Processing file: ${file.name}`)
        let extractedText = ''
        try {
          extractedText = await TextExtractionService.extractTextFromFile(file)
          setUploadProgress(prev => ({ ...prev, [file.name]: 50 }))
        } catch (extractError) {
          console.error('Error extracting text:', extractError)
          extractedText = `Error al extraer texto de ${file.name}: ${extractError instanceof Error ? extractError.message : 'Error desconocido'}`
        }

        // Subir archivo al storage
        try {
          const uploadResult = await StorageService.uploadDocument(file, user?.id || '', 'chat-uploads')
          setUploadProgress(prev => ({ ...prev, [file.name]: 75 }))

          if (uploadResult.error) {
            throw new Error(uploadResult.error)
          }

          // Guardar en la base de datos
          const { error: dbError } = await supabase
            .from('documentos')
            .insert({
              nombre: file.name,
              tipo: file.type,
              tamaño: file.size,
              url: uploadResult.url,
              contenido: extractedText,
              user_id: user?.id
            })

          if (dbError) throw dbError

          uploadedDocuments.push(file.name)
          allExtractedContent += `\n\n--- ARCHIVO: ${file.name} ---\n${extractedText}\n--- FIN ARCHIVO ---`
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError)
          allExtractedContent += `\n\n--- ARCHIVO: ${file.name} ---\nError al subir archivo: ${uploadError instanceof Error ? uploadError.message : 'Error desconocido'}\n--- FIN ARCHIVO ---`
        }
      }

      return { extractedContent: allExtractedContent, uploadedDocuments }
    } finally {
      setIsUploading(false)
      setUploadProgress({})
      setUploadedFiles([]) // Limpiar archivos después de procesarlos
    }
  }

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && uploadedFiles.length === 0) || isTyping) return

    // 🔧 FIX: Verificación más robusta de límites de uso
    if (usageStats && usageStats.requests_remaining <= 0) {
      setError('Has alcanzado el límite de 50 consultas diarias. El límite se restablece mañana.')
      return
    }

    // 🔧 NEW: Procesar archivos subidos si los hay
    let fileProcessingResult = { extractedContent: '', uploadedDocuments: [] as string[] }
    if (uploadedFiles.length > 0) {
      try {
        fileProcessingResult = await processUploadedFiles()
      } catch (fileError) {
        console.error('Error processing uploaded files:', fileError)
        setError('Error procesando los archivos subidos. Intenta nuevamente.')
        return
      }
    }

    // 🔧 FIX: NO incluir el contenido de archivos en el mensaje visible del usuario
    // El contenido se enviará como contexto separado al backend
    let displayMessage = inputMessage
    if (fileProcessingResult.uploadedDocuments.length > 0) {
      displayMessage += `\n\n📎 **Archivos adjuntos:** ${fileProcessingResult.uploadedDocuments.join(', ')}`
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || '',
      role: 'user',
      content: displayMessage, // Solo mostrar el mensaje + nombres de archivos
      context_used: {
        documents: fileProcessingResult.uploadedDocuments.map(fileName => ({ id: '', nombre: fileName }))
      },
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setError(null)

    // 🔧 FIX: Actualización inmediata de estadísticas para feedback visual
    if (usageStats) {
      setUsageStats(prev => prev ? {
        ...prev,
        requests_used: prev.requests_used + 1,
        requests_remaining: prev.requests_remaining - 1
      } : prev)
      console.log('📈 Incremento local inmediato - usado:', usageStats.requests_used + 1, 'restante:', usageStats.requests_remaining - 1)
    }

    try {
      // Get context data
      const documentContext = await getDocumentContext()
      const caseContext = await getCaseContext()

      // Generate session title if it's a new session
      const sessionTitle = !currentSessionId ? (inputMessage || 'Chat con archivos').substring(0, 50) + '...' : undefined

      // 🔧 FIX: Preparar contexto completo para el AI
      // Combinar contexto de documentos seleccionados + archivos subidos
      let enhancedDocumentContext = documentContext || []
      
      // Agregar documentos subidos como contexto adicional
      if (fileProcessingResult.extractedContent) {
        const uploadedDocsContext = fileProcessingResult.uploadedDocuments.map((fileName, index) => ({
          id: `uploaded-${Date.now()}-${index}`,
          nombre: fileName,
          tipo: 'Archivo subido',
          contenido: fileProcessingResult.extractedContent // Incluir contenido aquí
        }))
        enhancedDocumentContext = [...enhancedDocumentContext, ...uploadedDocsContext]
      }

      // Send message to AI (con el mensaje original + contexto enriquecido)
      const response = await AIService.sendMessage(
        inputMessage, // Solo el mensaje original, sin contenido de archivos
        currentSessionId || undefined,
        sessionTitle,
        enhancedDocumentContext,
        caseContext
      )

      // Update current session ID if it's new
      if (!currentSessionId) {
        setCurrentSessionId(response.sessionId)
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: response.sessionId,
        role: 'assistant',
        content: response.response,
        context_used: {
          documents: documentContext?.map(doc => ({ id: doc.id, nombre: doc.nombre })) || [],
          case: caseContext ? { id: caseContext.id, titulo: caseContext.titulo } : undefined
        },
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, aiMessage])
      
      // 🔧 FIX: Usar estadísticas del backend si están disponibles (son las reales de la BD)
      if (response.usage) {
        console.log('📊 Usando estadísticas del backend (datos reales de BD):', response.usage)
        setUsageStats(response.usage)
      } else {
        // Si no vienen del backend, recargar desde BD con delay
        console.log('⚠️ Backend no devolvió estadísticas, recargando desde BD...')
        setTimeout(async () => {
          await loadUsageStats()
        }, 500)
      }

      // Reload sessions to show new session
      await loadChatSessions()
    } catch (error) {
      console.error('Error sending message:', error)
      
      // 🔧 FIX: Revertir el incremento local porque la solicitud falló
      console.log('❌ Error en solicitud, revirtiendo incremento local...')
      if (usageStats) {
        setUsageStats(prev => prev ? {
          ...prev,
          requests_used: Math.max(0, prev.requests_used - 1),
          requests_remaining: Math.min(prev.requests_limit, prev.requests_remaining + 1)
        } : prev)
        console.log('🔄 Incremento local revertido - usado:', Math.max(0, usageStats.requests_used - 1))
      }
      
      // También recargar desde BD para asegurar consistencia
      setTimeout(async () => {
        await loadUsageStats()
      }, 300)
      
      const errorMessage = error instanceof Error ? error.message : 'Error al comunicarse con la IA'
      setError(errorMessage)
      
      const errorMessageObj: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || '',
        role: 'assistant',
        content: `❌ **Error**: ${errorMessage}\n\nPor favor, intenta nuevamente.`,
        context_used: {},
        created_at: new Date().toISOString(),
      }
      
      setMessages(prev => [...prev, errorMessageObj])
    } finally {
      setIsTyping(false)
    }
  }

  const getDocumentContext = async () => {
    if (selectedDocuments.length === 0) return undefined

    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('id, nombre, tipo')
        .in('id', selectedDocuments)
        .eq('user_id', user?.id)

      if (error) throw error

      return data?.map(doc => ({
        id: doc.id,
        nombre: doc.nombre,
        tipo: doc.tipo || 'Desconocido'
      }))
    } catch (error) {
      console.error('Error fetching document context:', error)
      return undefined
    }
  }

  const getCaseContext = async () => {
    if (!selectedCase) return undefined

    try {
      const { data, error } = await supabase
        .from('casos')
        .select('id, titulo, descripcion, estado, prioridad')
        .eq('id', selectedCase)
        .eq('user_id', user?.id)
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error fetching case context:', error)
      return undefined
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question)
  }



  const startNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setSelectedDocuments([])
    setSelectedCase(null)
    setError(null)
  }

  const saveCurrentChat = async () => {
    if (!currentSessionId || !saveTitle.trim()) return

    try {
      await AIService.updateChatSession(currentSessionId, {
        title: saveTitle,
        description: `Chat guardado el ${new Date().toLocaleDateString()}`
      })
      
      setIsSaveDialogOpen(false)
      setSaveTitle('')
      await loadChatSessions()
      alert('Chat guardado correctamente')
    } catch (error) {
      console.error('Error saving chat:', error)
      alert('Error guardando el chat')
    }
  }

  const toggleFavoriteSession = async (sessionId: string, isFavorite: boolean) => {
    try {
      await AIService.updateChatSession(sessionId, { is_favorite: !isFavorite })
      await loadChatSessions()
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta sesión de chat?')) return

    try {
      await AIService.deleteChatSession(sessionId)
      
      if (currentSessionId === sessionId) {
        startNewChat()
      }
      
      await loadChatSessions()
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Error eliminando la sesión')
    }
  }

  const usagePercentage = usageStats ? (usageStats.requests_used / usageStats.requests_limit) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text">IA Legal Assistant</h1>
          <p className="text-subtext0">Tu asistente inteligente para consultas legales</p>
        </div>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <Card className={`${usageStats.requests_remaining <= 5 ? 'bg-red/5 border-red/20' : usageStats.requests_remaining <= 10 ? 'bg-yellow/5 border-yellow/20' : 'bg-blue/5 border-blue/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uso diario de IA</span>
              <span className="text-sm text-subtext0">
                {usageStats.requests_used} / {usageStats.requests_limit}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-subtext0">
                {usageStats.requests_remaining} consultas restantes hoy
              </p>
              {usageStats.requests_remaining <= 5 && (
                <Badge variant="destructive" className="text-xs">
                  {usageStats.requests_remaining === 0 ? 'Límite alcanzado' : 'Pocas consultas restantes'}
                </Badge>
              )}
            </div>
            {usageStats.requests_remaining === 0 && (
              <p className="text-xs text-red mt-2">
                ⚠️ Has alcanzado el límite diario. Se restablece mañana.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Layout: Chat primero en móvil, sidebar después */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        {/* Chat Interface - Prioridad en móvil */}
        <div className="order-1 lg:order-1 lg:col-span-3">
          <Card className="h-[calc(100vh-300px)] min-h-[500px] max-h-[800px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue" />
                  Chat Legal
                  {currentSessionId && (
                    <Badge variant="outline" className="text-xs">
                      Sesión activa
                    </Badge>
                  )}
                  {usageStats?.requests_remaining === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Sin consultas disponibles
                    </Badge>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {(selectedDocuments.length > 0 || selectedCase) && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        {selectedDocuments.length} docs
                      </Badge>
                      {selectedCase && (
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          1 caso
                        </Badge>
                      )}
                    </>
                  )}
                  {currentSessionId && (
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Guardar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Guardar chat</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="save-title">Título del chat</Label>
                            <Input
                              id="save-title"
                              value={saveTitle}
                              onChange={(e) => setSaveTitle(e.target.value)}
                              placeholder="Ej: Análisis de contrato laboral..."
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={saveCurrentChat} disabled={!saveTitle.trim()}>
                              Guardar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scroll-smooth px-1">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-blue text-base">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue text-base ml-auto'
                          : 'bg-surface1 text-text'
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        {message.content.split('\n').map((line, index) => {
                          if (line.startsWith('**') && line.endsWith('**')) {
                            return <p key={index} className="font-bold">{line.slice(2, -2)}</p>
                          } else if (line.startsWith('- ')) {
                            return <li key={index} className="ml-4">{line.slice(2)}</li>
                          } else if (line.trim() === '') {
                            return <br key={index} />
                          } else {
                            return <p key={index}>{line}</p>
                          }
                        })}
                      </div>
                      
                      {message.context_used && ((message.context_used.documents && message.context_used.documents.length > 0) || message.context_used.case) && (
                        <div className="mt-3 pt-3 border-t border-surface2">
                          <p className="text-xs text-subtext0 mb-2">Contexto utilizado:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.context_used.documents && message.context_used.documents.map(doc => (
                              <Badge key={doc.id} variant="outline" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                {doc.nombre}
                              </Badge>
                            ))}
                            {message.context_used.case && (
                              <Badge variant="outline" className="text-xs">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {message.context_used.case.titulo}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-2">
                        {formatDateTime(message.created_at)}
                      </p>
                    </div>

                    {message.role === 'user' && (
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-surface2 text-text">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-blue text-base">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-surface1 text-text p-4 rounded-lg">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-subtext0 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-subtext0 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-subtext0 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 🔧 NEW: Archivos subidos */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 p-3 bg-surface1 rounded-lg border border-surface2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text">Archivos para enviar:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFiles([])}
                      className="text-red hover:text-red"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-surface0 rounded">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-blue flex-shrink-0" />
                          <span className="text-sm text-text truncate flex-1">{file.name}</span>
                          <span className="text-xs text-subtext0 flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        {isUploading && uploadProgress[file.name] && (
                          <div className="flex items-center gap-2">
                            <Progress value={uploadProgress[file.name]} className="w-20 h-2" />
                            <span className="text-xs text-subtext0">{uploadProgress[file.name]}%</span>
                          </div>
                        )}
                        {!isUploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeUploadedFile(index)}
                            className="text-red hover:text-red h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {isUploading && (
                    <div className="mt-2 text-xs text-blue">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue"></div>
                        Procesando archivos...
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2 items-end">
                <div className="flex gap-1 flex-shrink-0">
                  {/* Botón de contexto con animación hover */}
                  <div className="group">
                    <ContextSelector
                      selectedDocuments={selectedDocuments}
                      selectedCase={selectedCase}
                      onDocumentsChange={setSelectedDocuments}
                      onCaseChange={setSelectedCase}
                    />
                  </div>
                  
                  {/* Botón nuevo chat */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startNewChat}
                    disabled={isTyping || isUploading}
                    title="Iniciar nuevo chat"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  
                  {/* Botón de subir archivos */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isTyping || isUploading || (usageStats?.requests_remaining === 0)}
                    title="Subir archivos (PDF, Word, TXT, CSV)"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  {/* Input de archivo oculto */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.csv"
                    className="hidden"
                  />
                </div>
                
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe tu consulta legal o sube archivos..."
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isTyping || isUploading || (usageStats?.requests_remaining === 0)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={(!inputMessage.trim() && uploadedFiles.length === 0) || isTyping || isUploading || (usageStats?.requests_remaining === 0)}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b border-base"></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-2 p-3 bg-red/10 border border-red/20 rounded-lg">
                  <p className="text-sm text-red">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Después del chat en móvil */}
        <div className="order-2 lg:order-2 space-y-4 lg:space-y-6">
          {/* Capacidades - Primero */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Capacidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue" />
                  <span className="text-sm">Análisis de documentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-green" />
                  <span className="text-sm">Subida directa de archivos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-yellow" />
                  <span className="text-sm">Extracción de texto PDF/Word</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple" />
                  <span className="text-sm">Redacción asistida</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-red" />
                  <span className="text-sm">Consultas jurisprudenciales</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-teal" />
                  <span className="text-sm">Estrategias de caso</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue/10 border border-blue/20 rounded-lg">
                <p className="text-xs text-blue font-medium mb-1">💡 Nuevo: Subida de archivos</p>
                <p className="text-xs text-subtext0">
                  Ahora puedes subir PDFs, documentos Word, archivos TXT y CSV directamente en el chat. 
                  El texto se extrae automáticamente para análisis.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chats Guardados - Dropdown */}
          <Card>
            <CardHeader>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="text-lg">Chats guardados ({chatSessions.length})</CardTitle>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 max-h-64 overflow-y-auto">
                  {chatSessions.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-subtext0">No tienes chats guardados</p>
                    </div>
                  ) : (
                    <>
                      {chatSessions.slice(0, 10).map((session, index) => (
                        <div key={session.id}>
                          <DropdownMenuItem
                            className={`flex items-start justify-between p-3 cursor-pointer ${
                              currentSessionId === session.id ? 'bg-blue/10' : ''
                            }`}
                            onClick={() => loadChatSession(session.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium truncate">{session.title}</h4>
                              <p className="text-xs text-subtext0">
                                {new Date(session.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleFavoriteSession(session.id, session.is_favorite)
                                }}
                              >
                                <Star className={`h-3 w-3 ${session.is_favorite ? 'fill-yellow text-yellow' : 'text-subtext0'}`} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red hover:text-red"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteSession(session.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </DropdownMenuItem>
                          {index < chatSessions.slice(0, 10).length - 1 && <DropdownMenuSeparator />}
                        </div>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
          </Card>

          {/* Consultas Sugeridas - Dropdown */}
          <Card>
            <CardHeader>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                    <CardTitle className="text-lg">Consultas sugeridas</CardTitle>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-96 max-h-80 overflow-y-auto">
                  {suggestedQuestions.map((category, categoryIndex) => (
                    <div key={categoryIndex}>
                      <div className="px-3 py-2 bg-surface1">
                        <h4 className="font-medium text-sm text-text">{category.category}</h4>
                      </div>
                      {category.questions.map((question, questionIndex) => (
                        <DropdownMenuItem
                          key={questionIndex}
                          className="p-3 cursor-pointer text-xs whitespace-normal break-words leading-relaxed min-h-[3rem]"
                          onClick={() => handleSuggestedQuestion(question)}
                        >
                          <span className="text-left">{question}</span>
                        </DropdownMenuItem>
                      ))}
                      {categoryIndex < suggestedQuestions.length - 1 && <DropdownMenuSeparator />}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
}