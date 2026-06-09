import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2"

type Json = Record<string, unknown>

interface TaskInsert {
  user_id: string
  title: string
  description?: string
  priority?: string
  category_id?: string
  due_date?: string
  completed?: boolean
}

interface SubtaskInsert {
  task_id: string
  title: string
  completed?: boolean
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SERVICE_ROLE_KEY
)

/* ---------------- Helpers ---------------- */

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders })

const parseBody = async (req: Request): Promise<Json> => {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

const extractEndpoint = (pathname: string) => {
  const match = pathname.match(/\/rapid-task(.*)/)
  return match ? match[1] || "/" : pathname
}

const getAuthUser = async (req: Request): Promise<string | null> => {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    console.log("[Auth] No authorization header found")
    return null
  }

  const token = authHeader.replace("Bearer ", "")

  if (!token) {
    console.log("[Auth] Token is empty after removing Bearer prefix")
    return null
  }

  try {
    console.log("[Auth] Verifying token...")
    const { data, error } = await supabase.auth.getUser(token)

    if (error) {
      console.error("[Auth] Token verification error:", error.message)
      return null
    }

    if (!data || !data.user) {
      console.log("[Auth] No user found in token")
      return null
    }

    console.log("[Auth] User verified:", data.user.id)
    return data.user.id
  } catch (err) {
    console.error("[Auth] Exception during token verification:", err instanceof Error ? err.message : String(err))
    return null
  }
}

/* ---------------- Server ---------------- */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = extractEndpoint(url.pathname)
    const action = url.searchParams.get("action")

    console.log(`[Server] ${req.method} ${endpoint} action=${action}`)

    /* ---------------- AUTH ROUTES (PUBLIC) ---------------- */

    if (endpoint === "/auth") {
      const body = await parseBody(req)

      const email = body.email as string
      const password = body.password as string
      const name = body.name as string

      if (!email || !password) {
        return jsonResponse({ success: false, error: "Missing credentials" }, 400)
      }

      if (action === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })

        if (error) {
          return jsonResponse({ success: false, error: error.message }, 400)
        }

        return jsonResponse({
          success: true,
          user: data.user,
          session: data.session,
        })
      }

      if (action === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          return jsonResponse({ success: false, error: error.message }, 400)
        }

        return jsonResponse({
          success: true,
          session: data.session,
        })
      }

      return jsonResponse({ success: false, error: "Unknown auth action" }, 400)
    }

    /* ---------------- PROTECTED ROUTES ---------------- */

    const userId = await getAuthUser(req)

    if (!userId) {
      console.log("[Server] Request unauthorized - no valid user ID")
      return jsonResponse({ success: false, error: "Unauthorized" }, 401)
    }

    console.log(`[Server] Authenticated user: ${userId}`)

    /* ---------------- TASK ROUTES ---------------- */

    if (endpoint === "/tasks" && req.method === "GET") {
      console.log("[Tasks] GET /tasks")
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, tasks: data })
    }

    if (endpoint === "/tasks" && req.method === "POST") {
      console.log("[Tasks] POST /tasks")
      const body = await parseBody(req)

      const insert: TaskInsert = {
        user_id: userId,
        title: body.title as string,
        description: body.description as string,
        priority: body.priority as string,
        category_id: body.category_id as string | undefined,
        due_date: body.dueDate as string,
        completed: false,
      }

      console.log("[Tasks] Inserting task:", insert)
      const { data, error } = await supabase
        .from("tasks")
        .insert(insert)
        .select()
        .single()

      if (error) {
        console.error("[Tasks] Insert error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      console.log("[Tasks] Task created:", data)
      return jsonResponse({ success: true, data })
    }

    const taskMatch = endpoint.match(/^\/tasks\/([^/]+)$/)

    if (taskMatch && req.method === "PUT") {
      const taskId = taskMatch[1]
      console.log("[Tasks] PUT /tasks/" + taskId)
      const updates = await parseBody(req)

      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .eq("user_id", userId)
        .select()
        .single()

      if (error) {
        console.error("[Tasks] Update error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      console.log("[Tasks] Task updated:", data)
      return jsonResponse({ success: true, data })
    }

    if (taskMatch && req.method === "DELETE") {
      const taskId = taskMatch[1]
      console.log("[Tasks] DELETE /tasks/" + taskId)

      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("user_id", userId)

      if (error) {
        console.error("[Tasks] Delete error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      console.log("[Tasks] Task deleted")
      return jsonResponse({ success: true })
    }

    /* ---------------- SUBTASK ROUTES ---------------- */

    const subtaskTaskMatch = endpoint.match(/^\/tasks\/([^/]+)\/subtasks$/)

    if (subtaskTaskMatch && req.method === "GET") {
      const taskId = subtaskTaskMatch[1]
      console.log("[Subtasks] GET /tasks/" + taskId + "/subtasks")

      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true })

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, subtasks: data })
    }

    if (subtaskTaskMatch && req.method === "POST") {
      const taskId = subtaskTaskMatch[1]
      console.log("[Subtasks] POST /tasks/" + taskId + "/subtasks")
      const body = await parseBody(req)

      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, title: body.title as string, completed: false })
        .select()
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, data })
    }

    const subtaskMatch = endpoint.match(/^\/subtasks\/([^/]+)$/)

    if (subtaskMatch && req.method === "PUT") {
      const subtaskId = subtaskMatch[1]
      console.log("[Subtasks] PUT /subtasks/" + subtaskId)
      const updates = await parseBody(req)

      const { data, error } = await supabase
        .from("subtasks")
        .update(updates)
        .eq("id", subtaskId)
        .select()
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, data })
    }

    if (subtaskMatch && req.method === "DELETE") {
      const subtaskId = subtaskMatch[1]
      console.log("[Subtasks] DELETE /subtasks/" + subtaskId)

      const { error } = await supabase
        .from("subtasks")
        .delete()
        .eq("id", subtaskId)

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true })
    }

    /* ---------------- CATEGORY ROUTES ---------------- */

    if (endpoint === "/categories" && req.method === "GET") {
      console.log("[Categories] GET /categories")

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true })

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, categories: data })
    }

    if (endpoint === "/categories" && req.method === "POST") {
      console.log("[Categories] POST /categories")
      const body = await parseBody(req)

      const { data, error } = await supabase
        .from("categories")
        .insert({ user_id: userId, name: body.name as string, color: body.color ?? null })
        .select()
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, data })
    }

    const categoryMatch = endpoint.match(/^\/categories\/([^/]+)$/)

    if (categoryMatch && req.method === "DELETE") {
      const categoryId = categoryMatch[1]
      console.log("[Categories] DELETE /categories/" + categoryId)

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId)
        .eq("user_id", userId)

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true })
    }

    /* ---------------- FRIEND ROUTES ---------------- */

    // GET /friends — list accepted friends with their profile info
    if (endpoint === "/friends" && req.method === "GET") {
      console.log("[Friends] GET /friends")

      const { data: friendships, error } = await supabase
        .from("friends")
        .select("id, requester_id, addressee_id, status, created_at")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      if (error) {
        console.error("[Friends] Fetch error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      // Get the friend's user_id (the side that isn't the current user)
      const friendUserIds = (friendships ?? []).map((f: Json) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      ) as string[]

      // Fetch profiles for all friends
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, name, avatar_url")
        .in("user_id", friendUserIds.length > 0 ? friendUserIds : ["none"])

      const profileMap = new Map((profiles ?? []).map((p: Json) => [p.user_id, p]))

      const friends = (friendships ?? []).map((f: Json) => {
        const friendUserId = f.requester_id === userId ? f.addressee_id : f.requester_id
        const profile = profileMap.get(friendUserId) ?? {}
        return { friendship_id: f.id, ...profile }
      })

      return jsonResponse({ success: true, friends })
    }

    // GET /friends/requests — pending incoming requests
    if (endpoint === "/friends/requests" && req.method === "GET") {
      console.log("[Friends] GET /friends/requests")

      const { data: requests, error } = await supabase
        .from("friends")
        .select("id, requester_id, created_at")
        .eq("addressee_id", userId)
        .eq("status", "pending")

      if (error) {
        console.error("[Friends] Requests fetch error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      const requesterIds = (requests ?? []).map((r: Json) => r.requester_id) as string[]

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, name, avatar_url")
        .in("user_id", requesterIds.length > 0 ? requesterIds : ["none"])

      const profileMap = new Map((profiles ?? []).map((p: Json) => [p.user_id, p]))

      const enriched = (requests ?? []).map((r: Json) => ({
        id: r.id,
        created_at: r.created_at,
        requester: profileMap.get(r.requester_id as string) ?? {},
      }))

      return jsonResponse({ success: true, requests: enriched })
    }

    // POST /friends — send a friend request by username
    if (endpoint === "/friends" && req.method === "POST") {
      console.log("[Friends] POST /friends")
      const body = await parseBody(req)
      const username = body.username as string

      if (!username) {
        return jsonResponse({ success: false, error: "username is required" }, 400)
      }

      // Look up the target user by username
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .single()

      if (profileError || !profile) {
        return jsonResponse({ success: false, error: "User not found" }, 404)
      }

      const addresseeId = profile.user_id

      if (addresseeId === userId) {
        return jsonResponse({ success: false, error: "You cannot add yourself" }, 400)
      }

      // Check if a request already exists in either direction
      const { data: existing } = await supabase
        .from("friends")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${addresseeId}),and(requester_id.eq.${addresseeId},addressee_id.eq.${userId})`
        )
        .maybeSingle()

      if (existing) {
        return jsonResponse({ success: false, error: "Friend request already exists" }, 409)
      }

      const { data, error } = await supabase
        .from("friends")
        .insert({ requester_id: userId, addressee_id: addresseeId })
        .select()
        .single()

      if (error) {
        console.error("[Friends] Insert error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      return jsonResponse({ success: true, data })
    }

    const friendMatch = endpoint.match(/^\/friends\/([^/]+)$/)

    // PUT /friends/:id — accept or reject a request (addressee only)
    if (friendMatch && req.method === "PUT") {
      const friendshipId = friendMatch[1]
      console.log("[Friends] PUT /friends/" + friendshipId)
      const body = await parseBody(req)
      const status = body.status as string

      if (!["accepted", "rejected"].includes(status)) {
        return jsonResponse({ success: false, error: "status must be accepted or rejected" }, 400)
      }

      const { data, error } = await supabase
        .from("friends")
        .update({ status })
        .eq("id", friendshipId)
        .eq("addressee_id", userId)
        .select()
        .single()

      if (error) {
        console.error("[Friends] Update error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      return jsonResponse({ success: true, data })
    }

    // DELETE /friends/:id — unfriend or cancel request
    if (friendMatch && req.method === "DELETE") {
      const friendshipId = friendMatch[1]
      console.log("[Friends] DELETE /friends/" + friendshipId)

      const { error } = await supabase
        .from("friends")
        .delete()
        .eq("id", friendshipId)
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      if (error) {
        console.error("[Friends] Delete error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      return jsonResponse({ success: true })
    }

    /* ---------------- LOCATION ROUTES ---------------- */

    // POST /location — upsert current user's location
    // Only writes if user has share_location = true in their settings
    if (endpoint === "/location" && req.method === "POST") {
      console.log("[Location] POST /location")
      const body = await parseBody(req)

      // Check user has opted in to location sharing
      const { data: settings } = await supabase
        .from("user_settings")
        .select("share_location")
        .eq("user_id", userId)
        .single()

      if (!settings?.share_location) {
        return jsonResponse({ success: false, error: "Location sharing is disabled. Enable it in settings." }, 403)
      }

      const { data, error } = await supabase
        .from("user_locations")
        .upsert({
          user_id: userId,
          latitude: body.latitude,
          longitude: body.longitude,
          address: body.address ?? null,
          accuracy: body.accuracy ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select()
        .single()

      if (error) {
        console.error("[Location] Upsert error:", error.message)
        return jsonResponse({ success: false, error: error.message }, 400)
      }

      return jsonResponse({ success: true, data })
    }

    // GET /location/friends — get accepted friends' locations (share_location = true only)
    if (endpoint === "/location/friends" && req.method === "GET") {
      console.log("[Location] GET /location/friends")

      // Get all accepted friend user IDs
      const { data: friendships, error: friendshipError } = await supabase
        .from("friends")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      if (friendshipError) {
        return jsonResponse({ success: false, error: friendshipError.message }, 400)
      }

      const friendIds = (friendships ?? []).map((f: Json) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      ) as string[]

      if (friendIds.length === 0) {
        return jsonResponse({ success: true, locations: [] })
      }

      // Get locations for friends
      const { data: locations, error: locationError } = await supabase
        .from("user_locations")
        .select("user_id, latitude, longitude, address, accuracy, updated_at")
        .in("user_id", friendIds)

      if (locationError) {
        console.error("[Location] Fetch error:", locationError.message)
        return jsonResponse({ success: false, error: locationError.message }, 400)
      }

      const locationUserIds = (locations ?? []).map((l: Json) => l.user_id) as string[]

      // Get profiles and settings separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, name, avatar_url")
        .in("user_id", locationUserIds.length > 0 ? locationUserIds : ["none"])

      const { data: settings } = await supabase
        .from("user_settings")
        .select("user_id, share_location")
        .in("user_id", locationUserIds.length > 0 ? locationUserIds : ["none"])

      const profileMap = new Map((profiles ?? []).map((p: Json) => [p.user_id, p]))
      const settingsMap = new Map((settings ?? []).map((s: Json) => [s.user_id, s]))

      // Only include friends who have share_location = true
      const filtered = (locations ?? [])
        .filter((l: Json) => (settingsMap.get(l.user_id as string) as Json)?.share_location === true)
        .map((l: Json) => ({
          ...l,
          profile: profileMap.get(l.user_id as string) ?? {},
        }))

      return jsonResponse({ success: true, locations: filtered })
    }

    /* ---------------- PROFILE ROUTES ---------------- */

    // GET /profile — get own profile
    if (endpoint === "/profile" && req.method === "GET") {
      console.log("[Profile] GET /profile")

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, profile: data })
    }

    // PUT /profile — update own profile
    if (endpoint === "/profile" && req.method === "PUT") {
      console.log("[Profile] PUT /profile")
      const body = await parseBody(req)

      const { data, error } = await supabase
        .from("profiles")
        .update({
          username: body.username,
          name: body.name,
          bio: body.bio,
          avatar_url: body.avatar_url,
        })
        .eq("user_id", userId)
        .select()
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, profile: data })
    }

    /* ---------------- SETTINGS ROUTES ---------------- */

    // GET /settings — get own settings
    if (endpoint === "/settings" && req.method === "GET") {
      console.log("[Settings] GET /settings")

      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, settings: data })
    }

    // PUT /settings — update own settings
    if (endpoint === "/settings" && req.method === "PUT") {
      console.log("[Settings] PUT /settings")
      const body = await parseBody(req)

      const { data, error } = await supabase
        .from("user_settings")
        .update({
          notifications_enabled: body.notifications_enabled,
          dark_mode: body.dark_mode,
          private_profile: body.private_profile,
          show_online_status: body.show_online_status,
          share_location: body.share_location,
        })
        .eq("user_id", userId)
        .select()
        .single()

      if (error) return jsonResponse({ success: false, error: error.message }, 400)

      return jsonResponse({ success: true, settings: data })
    }

    console.log("[Server] Route not found:", endpoint)
    return jsonResponse({ success: false, error: "Not found" }, 404)

  } catch (err) {
    console.error("[Server] Unhandled error:", err instanceof Error ? err.message : String(err))

    return jsonResponse(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      500
    )
  }
})
