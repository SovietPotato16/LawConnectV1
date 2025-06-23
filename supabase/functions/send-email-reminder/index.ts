import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  clienteId: string
  subject: string
  message: string
  scheduledFor?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const { clienteId, subject, message, scheduledFor }: EmailRequest = await req.json()

    // Obtener información del cliente
    const { data: cliente, error: clienteError } = await supabaseClient
      .from('clientes')
      .select('nombre, email')
      .eq('id', clienteId)
      .eq('user_id', user.id)
      .single()

    if (clienteError || !cliente) {
      throw new Error('Cliente no encontrado')
    }

    if (!cliente.email) {
      throw new Error('El cliente no tiene email registrado')
    }

    // Obtener token de Google del usuario
    const { data: googleToken, error: tokenError } = await supabaseClient
      .from('google_calendar_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !googleToken) {
      throw new Error('No tienes conectado Google Calendar. Conéctalo primero para enviar emails.')
    }

    // Verificar si el token necesita renovación
    let accessToken = googleToken.access_token
    const expiresAt = new Date(googleToken.expires_at)
    const now = new Date()

    if (expiresAt <= now) {
      // Renovar token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
          client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
          refresh_token: googleToken.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      if (!refreshResponse.ok) {
        throw new Error('Error renovando token de Google')
      }

      const refreshData = await refreshResponse.json()
      accessToken = refreshData.access_token

      // Actualizar token en la base de datos
      await supabaseClient
        .from('google_calendar_tokens')
        .update({
          access_token: accessToken,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
        })
        .eq('user_id', user.id)
    }

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : new Date()
    const isImmediate = scheduledDate <= new Date()

    if (isImmediate) {
      // Enviar email inmediatamente usando Gmail API
      const emailContent = `To: ${cliente.email}
Subject: ${subject}
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #89b4fa; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>LawConnect</h1>
        </div>
        <div class="content">
            <p>Estimado/a ${cliente.nombre},</p>
            <div>${message.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="footer">
            <p>Este email fue enviado desde LawConnect</p>
        </div>
    </div>
</body>
</html>`

      const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      const gmailResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail
        })
      })

      if (!gmailResponse.ok) {
        const errorData = await gmailResponse.json()
        throw new Error(`Error enviando email: ${errorData.error?.message || 'Error desconocido'}`)
      }

      // Guardar registro del email enviado
      await supabaseClient
        .from('email_reminders')
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          subject,
          message,
          recipient_email: cliente.email,
          scheduled_for: scheduledDate.toISOString(),
          sent_at: new Date().toISOString(),
          status: 'sent'
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email enviado correctamente' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      // Programar email para más tarde
      await supabaseClient
        .from('email_reminders')
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          subject,
          message,
          recipient_email: cliente.email,
          scheduled_for: scheduledDate.toISOString(),
          status: 'pending'
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email programado correctamente' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})