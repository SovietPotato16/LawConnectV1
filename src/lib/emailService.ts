import { supabase } from './supabase'

export interface EmailReminder {
  id: string
  cliente_id: string
  caso_id?: string
  subject: string
  message: string
  recipient_email: string
  scheduled_for: string
  sent_at?: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  error_message?: string
  created_at: string
}

export class EmailService {
  static async sendEmailReminder(
    clienteId: string,
    subject: string,
    message: string,
    scheduledFor?: Date
  ): Promise<{ success: boolean; message: string }> {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No estás autenticado')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email-reminder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clienteId,
        subject,
        message,
        scheduledFor: scheduledFor?.toISOString()
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Error enviando email')
    }

    return response.json()
  }

  static async getEmailReminders(): Promise<EmailReminder[]> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('No estás autenticado')
    }

    const { data, error } = await supabase
      .from('email_reminders')
      .select(`
        *,
        cliente:clientes(nombre)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('Error obteniendo recordatorios de email')
    }

    return data || []
  }

  static async cancelEmailReminder(reminderId: string): Promise<void> {
    const { error } = await supabase
      .from('email_reminders')
      .update({ status: 'cancelled' })
      .eq('id', reminderId)

    if (error) {
      throw new Error('Error cancelando recordatorio')
    }
  }
}