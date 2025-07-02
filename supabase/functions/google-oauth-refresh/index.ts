import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener credenciales de Google desde Supabase secrets
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!googleClientId || !googleClientSecret || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables')
    }

    // Crear cliente de Supabase con service key para operaciones administrativas
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: userId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Obtener tokens actuales del usuario
    const { data: tokenData, error: fetchError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (fetchError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          error: 'No Google Calendar tokens found for user' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Renovar token con Google
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret, // ✅ Seguro en Supabase Edge Function
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!refreshResponse.ok) {
      const errorData = await refreshResponse.text()
      console.error('Google token refresh failed:', errorData)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to refresh tokens',
          details: errorData
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const newTokens = await refreshResponse.json()

    // Calcular nueva fecha de expiración
    const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

    // Actualizar tokens en la base de datos
    const { error: updateError } = await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: newTokens.access_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update tokens',
          details: updateError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        access_token: newTokens.access_token,
        expires_at: expiresAt.toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Token refresh handler error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 