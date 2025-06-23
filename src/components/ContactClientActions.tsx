import { useState } from 'react'
import { Mail, MessageCircle, Calendar, Send, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { EmailService } from '@/lib/emailService'

interface Cliente {
  id: string
  nombre: string
  email?: string | null
  telefono?: string | null
}

interface ContactClientActionsProps {
  cliente: Cliente
  onEmailSent?: () => void
}

export function ContactClientActions({ cliente, onEmailSent }: ContactClientActionsProps) {
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: '',
    scheduledFor: ''
  })
  const [sending, setSending] = useState(false)

  const handleWhatsAppContact = () => {
    if (!cliente.telefono) {
      alert('Este cliente no tiene número de teléfono registrado')
      return
    }

    // Limpiar el número de teléfono (remover espacios, guiones, etc.)
    const cleanPhone = cliente.telefono.replace(/[^\d+]/g, '')
    
    // Crear mensaje predeterminado
    const message = encodeURIComponent(`Hola ${cliente.nombre}, espero que te encuentres bien. Te contacto desde LawConnect.`)
    
    // Abrir WhatsApp Web
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
  }

  const handleSendEmail = async () => {
    if (!emailForm.subject.trim() || !emailForm.message.trim()) {
      alert('Por favor completa el asunto y el mensaje')
      return
    }

    setSending(true)
    try {
      const scheduledDate = emailForm.scheduledFor ? new Date(emailForm.scheduledFor) : undefined
      
      const result = await EmailService.sendEmailReminder(
        cliente.id,
        emailForm.subject,
        emailForm.message,
        scheduledDate
      )

      alert(result.message)
      setIsEmailDialogOpen(false)
      setEmailForm({ subject: '', message: '', scheduledFor: '' })
      onEmailSent?.()
    } catch (error) {
      console.error('Error sending email:', error)
      alert(error instanceof Error ? error.message : 'Error enviando email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-2">
      {/* Email */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={!cliente.email}
            title={!cliente.email ? 'Cliente sin email registrado' : 'Enviar email'}
          >
            <Mail className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar email a {cliente.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-to">Para:</Label>
              <Input
                id="email-to"
                value={cliente.email || ''}
                disabled
                className="bg-surface1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-subject">Asunto</Label>
              <Input
                id="email-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Asunto del email..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-message">Mensaje</Label>
              <Textarea
                id="email-message"
                value={emailForm.message}
                onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Escribe tu mensaje aquí..."
                rows={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-scheduled">Programar envío (opcional)</Label>
              <Input
                id="email-scheduled"
                type="datetime-local"
                value={emailForm.scheduledFor}
                onChange={(e) => setEmailForm(prev => ({ ...prev, scheduledFor: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-xs text-subtext0">
                Si no seleccionas fecha, se enviará inmediatamente
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSendEmail} disabled={sending}>
                {sending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    Enviando...
                  </>
                ) : emailForm.scheduledFor ? (
                  <>
                    <Calendar className="h-4 w-4 mr-2" />
                    Programar
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar ahora
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleWhatsAppContact}
        disabled={!cliente.telefono}
        title={!cliente.telefono ? 'Cliente sin teléfono registrado' : 'Contactar por WhatsApp'}
        className="text-green hover:text-green"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
    </div>
  )
}