import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    if (userError) throw userError

    const targetUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!targetUser) {
      return new Response(
        JSON.stringify({ hasActiveSession: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if there's an active session for this user
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('user_id', targetUser.id)
      .limit(1)

    if (sessionError) throw sessionError

    const hasActiveSession = sessions && sessions.length > 0

    return new Response(
      JSON.stringify({ 
        hasActiveSession,
        deviceInfo: hasActiveSession ? sessions[0].device_info : null,
        loggedInAt: hasActiveSession ? sessions[0].logged_in_at : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
