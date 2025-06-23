import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, FileText, Briefcase, Settings, AlertCircle, Sparkles, Zap, Search, BookOpen, Save, Star, Trash2, MessageSquare, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ContextSelector } from '@/components/ContextSelector'
import { AIService, type ChatSession, type ChatMessage, type AIUsageStats } from '@/lib/aiService'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
      const stats = await AIService.getUsageStats()
      setUsageStats(stats)
    } catch (error) {
      console.error('Error loading usage stats:', error)
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

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return

    // Check usage limits
    if (usageStats && usageStats.requests_remaining <= 0) {
      alert('Has alcanzado el límite de 50 consultas diarias. El límite se restablece mañana.')
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: currentSessionId || '',
      role: 'user',
      content: inputMessage,
      context_used: {},
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)
    setError(null)

    try {
      // Get context data
      const documentContext = await getDocumentContext()
      const caseContext = await getCaseContext()

      // Generate session title if it's a new session
      const sessionTitle = !currentSessionId ? inputMessage.substring(0, 50) + '...' : undefined

      // Send message to AI
      const response = await AIService.sendMessage(
        inputMessage,
        currentSessionId || undefined,
        sessionTitle,
        documentContext,
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
      
      // Update usage stats
      if (response.usage) {
        setUsageStats(response.usage)
      }

      // Reload sessions to show new session
      await loadChatSessions()
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Error al comunicarse con la IA')
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: currentSessionId || '',
        role: 'assistant',
        content: `❌ **Error**: ${error instanceof Error ? error.message : 'Error al comunicarse con la IA'}\n\nPor favor, intenta nuevamente.`,
        context_used: {},
        created_at: new Date().toISOString(),
      }
      
      setMessages(prev => [...prev, errorMessage])
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

  const handleQuickAnalysis = async (type: 'document' | 'case') => {
    let prompt = ''
    if (type === 'document' && selectedDocuments.length > 0) {
      prompt = 'Proporciona un análisis detallado de los documentos seleccionados, incluyendo riesgos, oportunidades y recomendaciones.'
    } else if (type === 'case' && selectedCase) {
      prompt = 'Analiza este caso y proporciona una estrategia legal recomendada con pasos específicos.'
    }

    if (prompt) {
      setInputMessage(prompt)
      setTimeout(() => handleSendMessage(), 100)
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">IA Legal Assistant</h1>
          <p className="text-subtext0">Tu asistente inteligente para consultas legales</p>
        </div>
        <div className="flex gap-3">
          <ContextSelector
            selectedDocuments={selectedDocuments}
            selectedCase={selectedCase}
            onDocumentsChange={setSelectedDocuments}
            onCaseChange={setSelectedCase}
          />
          <Button variant="outline" onClick={startNewChat}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Nuevo Chat
          </Button>
        </div>
      </div>

      {/* Usage Stats */}
      {usageStats && (
        <Card className="bg-blue/5 border-blue/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Uso diario de IA</span>
              <span className="text-sm text-subtext0">
                {usageStats.requests_used} / {usageStats.requests_limit}
              </span>
            </div>
            <Progress value={usagePercentage} className="h-2" />
            <p className="text-xs text-subtext0 mt-1">
              {usageStats.requests_remaining} consultas restantes hoy
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[700px] flex flex-col">
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
            <CardContent className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
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
                      
                      {message.context_used && (message.context_used.documents?.length > 0 || message.context_used.case) && (
                        <div className="mt-3 pt-3 border-t border-surface2">
                          <p className="text-xs text-subtext0 mb-2">Contexto utilizado:</p>
                          <div className="flex flex-wrap gap-1">
                            {message.context_used.documents?.map(doc => (
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

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Escribe tu consulta legal..."
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={isTyping || (usageStats?.requests_remaining === 0)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!inputMessage.trim() || isTyping || (usageStats?.requests_remaining === 0)}
                >
                  <Send className="h-4 w-4" />
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Saved Chats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Chats guardados</CardTitle>
            </CardHeader>
            <CardContent>
              {chatSessions.length === 0 ? (
                <p className="text-sm text-subtext0 text-center py-4">
                  No tienes chats guardados
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {chatSessions.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className={`p-2 rounded-lg cursor-pointer transition-colors group ${
                        currentSessionId === session.id ? 'bg-blue/10 border border-blue/30' : 'hover:bg-surface1'
                      }`}
                      onClick={() => loadChatSession(session.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{session.title}</h4>
                          <p className="text-xs text-subtext0">
                            {new Date(session.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análisis rápido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAnalysis('document')}
                disabled={selectedDocuments.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analizar documentos
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleQuickAnalysis('case')}
                disabled={!selectedCase}
              >
                <Zap className="h-4 w-4 mr-2" />
                Estrategia de caso
              </Button>
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consultas sugeridas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestedQuestions.map((category, categoryIndex) => (
                  <div key={categoryIndex}>
                    <h4 className="font-medium text-sm text-text mb-2">{category.category}</h4>
                    <div className="space-y-2">
                      {category.questions.map((question, questionIndex) => (
                        <Button
                          key={questionIndex}
                          variant="ghost"
                          size="sm"
                          className="w-full text-left justify-start h-auto p-2 text-xs"
                          onClick={() => handleSuggestedQuestion(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
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
                  <Search className="h-4 w-4 text-green" />
                  <span className="text-sm">Búsqueda de precedentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-yellow" />
                  <span className="text-sm">Redacción asistida</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple" />
                  <span className="text-sm">Consultas jurisprudenciales</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-red" />
                  <span className="text-sm">Estrategias de caso</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}