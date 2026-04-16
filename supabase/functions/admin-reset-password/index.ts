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

    // Use anon key client with the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }

    // Admin client for privileged operations
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check caller has admin role
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Alleen admins kunnen wachtwoorden resetten." }, 403);
    }

    // 2. Parse and validate input
    const body = await req.json();
    const targetEmail = String(body.targetEmail ?? "").trim().toLowerCase();
    const newPassword = String(body.newPassword ?? "");

    if (!targetEmail || !newPassword) {
      return jsonResponse({ error: "Email en wachtwoord zijn verplicht." }, 400);
    }
    if (newPassword.length < 8) {
      return jsonResponse({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, 400);
    }

    // 3. Find target user by email
    const { data: targetProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", targetEmail)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!targetProfile) {
      return jsonResponse({ error: "Gebruiker niet gevonden." }, 404);
    }

    // 4. Update password via Auth Admin API (correct bcrypt hashing)
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      targetProfile.id,
      { password: newPassword }
    );

    if (updateErr) {
      console.error("updateUserById failed", updateErr);
      return jsonResponse({ error: updateErr.message }, 400);
    }

    return jsonResponse({
      success: true,
      email: targetEmail,
    });
  } catch (error) {
    console.error("admin-reset-password failed", error);
    return jsonResponse({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
  }
});