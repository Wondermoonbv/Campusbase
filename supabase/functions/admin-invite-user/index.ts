import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

type AppRole = "admin" | "editor" | "viewer" | "standenbouwer";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: "Serverconfiguratie ontbreekt." }, 500);
    }

    // 1. Verify the calling user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Alleen admins kunnen gebruikers aanmaken." }, 403);
    }

    // 2. Parse and validate input
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const role = body.role as AppRole;

    if (!email || !password || !fullName || !role) {
      return jsonResponse({ error: "Alle velden zijn verplicht." }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, 400);
    }
    if (!["admin", "editor", "viewer", "standenbouwer"].includes(role)) {
      return jsonResponse({ error: "Ongeldige rol." }, 400);
    }

    // 3. Split full name
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // 4. Create user via Auth Admin API (handles bcrypt + identities correctly)
    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for admin-created users
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createErr) {
      console.error("createUser failed", createErr);
      // Common case: user already exists
      if (createErr.message?.toLowerCase().includes("already")) {
        return jsonResponse({ error: "Gebruiker met dit e-mailadres bestaat al." }, 409);
      }
      return jsonResponse({ error: createErr.message }, 400);
    }

    const newUserId = createData.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: "Gebruiker kon niet worden aangemaakt." }, 500);
    }

    // 5. Ensure profile row (handle_new_user trigger should do this, but be safe)
    const { error: profileErr } = await admin
      .from("profiles")
      .upsert({
        id: newUserId,
        first_name: firstName,
        last_name: lastName,
        email,
      }, { onConflict: "id" });

    if (profileErr) {
      console.error("profile upsert failed", profileErr);
      // Don't fail the whole operation — user is created, profile can be fixed later
    }

    // 6. Assign role
    const { error: roleErr } = await admin
      .from("user_roles")
      .upsert({
        user_id: newUserId,
        role,
      }, { onConflict: "user_id,role" });

    if (roleErr) {
      console.error("role assignment failed", roleErr);
      return jsonResponse({ error: "Gebruiker aangemaakt maar rol niet toegewezen." }, 500);
    }

    return jsonResponse({
      success: true,
      user_id: newUserId,
      email,
      role,
    });
  } catch (error) {
    console.error("admin-invite-user failed", error);
    return jsonResponse({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
  }
});