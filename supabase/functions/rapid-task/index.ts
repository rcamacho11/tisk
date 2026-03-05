import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(supabaseUrl, serviceRoleKey)

// Get user ID from Authorization header
const getAuthUser = async (req: Request): Promise<string | null> => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  
  const token = authHeader.replace('Bearer ', '')
  try {
    const { data } = await supabase.auth.getUser(token)
    return data.user?.id || null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    
    // Extract endpoint from full path
    const match = path.match(/\/rapid-task(.*)/)
    const endpoint = match ? match[1] : path
    
    console.log(`${req.method} ${endpoint}`)

    // ============================================
    // PUBLIC AUTH ROUTES
    // ============================================
    
    if (endpoint.startsWith('/auth')) {
      const action = url.searchParams.get('action')
      
      try {
        const body = await req.json()
        const { email, password, name } = body

        if (action === 'signup') {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name }
            }
          })

          if (error) {
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 400, headers: corsHeaders }
            )
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              user: data.user, 
              session: data.session 
            }),
            { headers: corsHeaders }
          )
        } else if (action === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            return new Response(
              JSON.stringify({ success: false, error: error.message }),
              { status: 400, headers: corsHeaders }
            )
          }

          return new Response(
            JSON.stringify({ 
              success: true, 
              session: data.session 
            }),
            { headers: corsHeaders }
          )
        }
      } catch (e) {
        console.error('Auth parse error:', e)
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid request' }),
          { status: 400, headers: corsHeaders }
        )
      }
    }

    // ============================================
    // PROTECTED ROUTES (require auth)
    // ============================================
    
    const userId = await getAuthUser(req)
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // ============================================
    // TASK ROUTES
    // ============================================
    if (endpoint === '/tasks' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, tasks: data }),
        { headers: corsHeaders }
      )
    }

    if (endpoint === '/tasks' && req.method === 'POST') {
      const { title, description, priority, category, dueDate } = await req.json()

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          user_id: userId,
          title,
          description,
          priority,
          category,
          due_date: dueDate,
          completed: false,
        }])
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, id: data?.[0]?.id, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint.match(/^\/tasks\/[^\/]+$/) && req.method === 'PUT') {
      const taskId = endpoint.split('/')[2]
      const updates = await req.json()

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', userId)
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint.match(/^\/tasks\/[^\/]+$/) && req.method === 'DELETE') {
      const taskId = endpoint.split('/')[2]

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // SUBTASK ROUTES
    // ============================================
    if (endpoint.match(/^\/tasks\/[^\/]+\/subtasks$/) && req.method === 'POST') {
      const taskId = endpoint.split('/')[2]
      const { title } = await req.json()

      const { data, error } = await supabase
        .from('subtasks')
        .insert([{
          task_id: taskId,
          title,
          completed: false,
        }])
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint.match(/^\/subtasks\/[^\/]+$/) && req.method === 'PUT') {
      const subtaskId = endpoint.split('/')[2]
      const updates = await req.json()

      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', subtaskId)
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint.match(/^\/subtasks\/[^\/]+$/) && req.method === 'DELETE') {
      const subtaskId = endpoint.split('/')[2]

      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // PROFILE ROUTES
    // ============================================
    // PROFILE ROUTES
    // ============================================
    if (endpoint === '/profile' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data || {} }),
        { headers: corsHeaders }
      )
    }

    if (endpoint === '/profile' && req.method === 'PUT') {
      const updates = await req.json()

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, ...updates }, { onConflict: 'id' })
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // FRIENDS ROUTES
    // ============================================
    if (endpoint === '/friends' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('friendships')
        .select('friend:friend_id(*)')
        .eq('user_id', userId)
        .eq('status', 'accepted')

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.map((f: any) => f.friend) || [] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint === '/friends' && req.method === 'POST') {
      const { friend_username } = await req.json()

      const { data: friendData } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', friend_username)
        .single()

      if (!friendData) {
        return new Response(
          JSON.stringify({ success: false, error: 'User not found' }),
          { status: 404, headers: corsHeaders }
        )
      }

      const { data, error } = await supabase
        .from('friendships')
        .insert([{
          user_id: userId,
          friend_id: friendData.id,
          status: 'accepted',
        }])
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    if (endpoint.match(/^\/friends\/[^\/]+$/) && req.method === 'DELETE') {
      const friendId = endpoint.split('/')[2]

      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('user_id', userId)
        .eq('friend_id', friendId)

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // SETTINGS ROUTES
    // ============================================
    if (endpoint === '/settings' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: data || {
            notifications_enabled: true,
            dark_mode: false,
            private_profile: false,
            show_online_status: true,
          }
        }),
        { headers: corsHeaders }
      )
    }

    if (endpoint === '/settings' && req.method === 'PUT') {
      const updates = await req.json()

      const { data, error } = await supabase
        .from('user_settings')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    // ============================================
    // LOCATION ROUTES
    // ============================================
    if (endpoint === '/location' && req.method === 'POST') {
      const { latitude, longitude, address, accuracy } = await req.json()

      const { data, error } = await supabase
        .from('user_locations')
        .upsert({
          user_id: userId,
          latitude,
          longitude,
          address,
          accuracy,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: corsHeaders }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: data?.[0] }),
        { headers: corsHeaders }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: corsHeaders }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
