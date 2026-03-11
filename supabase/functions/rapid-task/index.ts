import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders })

async function getAuthUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization")

  if (!authHeader) return null

  const token = authHeader.replace("Bearer ", "")

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) return null

    return data.user.id
  } catch {
    return null
  }
}

async function parseBody(req: Request) {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)

    let endpoint = url.pathname.replace(/^\/functions\/v1\/rapid-task/, "")
    if (!endpoint.startsWith("/")) endpoint = "/" + endpoint
    // Remove trailing slash if exists, but not for the root "/"
    if (endpoint.length > 1 && endpoint.endsWith('/')) {
      endpoint = endpoint.slice(0, -1)
    }

    console.log("Endpoint:", endpoint)
    console.log("Method:", req.method)

    /* =========================
       AUTH ROUTES (PUBLIC)
    ========================= */

    if (endpoint === "/auth") {
      const action = url.searchParams.get("action")
      const body = await parseBody(req)

      const email = body.email
      const password = body.password
      const name = body.name

      if (!email || !password) {
        return json({ success: false, error: "Missing email or password" }, 400)
      }

      if (action === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })

        if (error) return json({ success: false, error: error.message }, 400)

        return json({
          success: true,
          user: data.user,
          session: data.session,
          access_token: data.session?.access_token,
        })
      }

      if (action === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) return json({ success: false, error: error.message }, 400)

        return json({
          success: true,
          user: data.user,
          session: data.session,
          access_token: data.session?.access_token,
        })
      }

      return json({ success: false, error: "Invalid auth action" }, 400)
    }

    /* =========================
       AUTH REQUIRED BELOW
    ========================= */

    const userId = await getAuthUser(req)

    if (!userId) {
      return json({ error: "Unauthorized" }, 401)
    }

    /* =========================
       TASK ROUTES
    ========================= */

    if (endpoint === "/tasks" && req.method === "GET") {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, tasks: data })
    }

    if (endpoint === "/tasks" && req.method === "POST") {
      const body = await parseBody(req)

      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            user_id: userId,
            title: body.title,
            description: body.description,
            priority: body.priority,
            category: body.category,
            due_date: body.dueDate,
            completed: false,
          },
        ])
        .select()

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    const taskMatch = endpoint.match(/^\/tasks\/([^/]+)$/)

    if (taskMatch && req.method === "PUT") {
      const taskId = taskMatch[1]
      const updates = await parseBody(req)

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .eq("user_id", userId)
        .select()

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    if (taskMatch && req.method === "DELETE") {
      const taskId = taskMatch[1]

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", userId)

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true })
    }

    /* =========================
       PROFILE ROUTES
    ========================= */

    if (endpoint === "/profile" && req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()

      if (error && error.code !== "PGRST116")
        return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data || {} })
    }

    if (endpoint === "/profile" && req.method === "PUT") {
      const updates = await parseBody(req)

      const { data, error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...updates }, { onConflict: "id" })
        .select()

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    /* =========================
       FRIENDS ROUTES
    ========================= */

    if (endpoint === "/friends" && req.method === "GET") {
      const { data, error } = await supabase
        .from("friendships")
        .select("friend:friend_id(*)")
        .eq("user_id", userId)
        .eq("status", "accepted")

      if (error) return json({ success: false, error: error.message }, 400)

      return json({
        success: true,
        data: data?.map((f: any) => f.friend) || [],
      })
    }

    if (endpoint === "/friends" && req.method === "POST") {
      const body = await parseBody(req)

      const { data: friend } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", body.friend_username)
        .single()

      if (!friend) return json({ success: false, error: "User not found" }, 404)

      const { data, error } = await supabase
        .from("friendships")
        .insert([
          {
            user_id: userId,
            friend_id: friend.id,
            status: "accepted",
          },
        ])
        .select()

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    if (endpoint.match(/^\/friends\/([^/]+)$/) && req.method === "DELETE") {
      const friendId = endpoint.split("/")[2]

      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("user_id", userId)
        .eq("friend_id", friendId)

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true })
    }

    /* =========================
       SETTINGS ROUTES
    ========================= */

    if (endpoint === "/settings" && req.method === "GET") {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error && error.code !== "PGRST116")
        return json({ success: false, error: error.message }, 400)

      return json({
        success: true,
        data:
          data || {
            notifications_enabled: true,
            dark_mode: false,
            private_profile: false,
            show_online_status: true,
          },
      })
    }

    if (endpoint === "/settings" && req.method === "PUT") {
      const updates = await parseBody(req)

      const { data, error } = await supabase
        .from("user_settings")
        .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
        .select()

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    /* =========================
       LOCATION ROUTES
    ========================= */

    if (endpoint === '/location' && req.method === 'POST') {
      const { latitude, longitude, address, accuracy } = await parseBody(req)

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

      if (error) return json({ success: false, error: error.message }, 400)

      return json({ success: true, data: data?.[0] })
    }

    return json({ error: "Not found" }, 404)
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      500
    )
  }
})
