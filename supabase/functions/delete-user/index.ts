// Supabase Edge Function: delete-user
// Deletes a user from both profiles table and Supabase Auth
//
// Deploy: supabase functions deploy delete-user
// Invoke: supabase.functions.invoke('delete-user', { body: { userId } })

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()

    if (!userId) {
      return json({ error: 'userId is required' }, 400)
    }

    // The anon key is itself a valid JWT, so verify_jwt alone lets anyone in.
    // Resolve the real signed-in caller and require an admin.
    const supabaseCaller = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user: caller } } = await supabaseCaller.auth.getUser()
    if (!caller) {
      return json({ error: 'Not authenticated' }, 401)
    }

    // Create admin client with service_role key (server-side only)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: isAdmin } = await supabaseAdmin.rpc('is_profile_admin', { uid: caller.id })
    if (!isAdmin) {
      return json({ error: 'Only an administrator may delete users' }, 403)
    }
    if (caller.id === userId) {
      return json({ error: 'Administrators may not delete their own account' }, 403)
    }

    // 1. Delete from profiles table (CASCADE will handle this too, but explicit is better)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Profile delete error:', profileError)
      // forms / form_responses / campaigns reference profiles with no ON DELETE rule.
      const message = profileError.code === '23503'
        ? 'This user owns forms or campaigns. Reassign or remove them before deleting the user.'
        : `Profile delete failed: ${profileError.message}`
      return json({ error: message }, 409)
    }

    // 2. Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      return json({ error: `Auth delete failed: ${authError.message}` }, 500)
    }

    return json({ success: true, message: `User ${userId} deleted from auth and profiles` }, 200)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
