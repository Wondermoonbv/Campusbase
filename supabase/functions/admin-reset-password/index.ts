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

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Serverconfiguratie ontbreekt." }, 500);
    }

    // 1. Extract and verify JWT via Supabase Auth Admin API
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }
    const token = authHeader.slice("Bearer ".length);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // admin.auth.getUser(token) verifies the token server-side via Supabase Auth
    // and works with ES256 tokens (unlike local JWT verification)
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("Token verification failed:", userErr);
      return jsonResponse({ error: "Ongeldige token." }, 401);
    }
    const callerId = userData.user.id;

    // 2. Check caller has admin role
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Alleen admins kunnen wachtwoorden resetten." }, 403);
    }

    // 3. Parse and validate input
    const body = await req.json();
    const targetEmail = String(body.targetEmail ?? "").trim().toLowerCase();
    const newPassword = String(body.newPassword ?? "");

    if (!targetEmail || !newPassword) {
      return jsonResponse({ error: "Email en wachtwoord zijn verplicht." }, 400);
    }
    if (newPassword.length < 8) {
      return jsonResponse({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, 400);
    }

    // 4. Find target user by email
    const { data: targetProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", targetEmail)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!targetProfile) {
      return jsonResponse({ error: "Gebruiker niet gevonden." }, 404);
    }

    // 5. Update password via Auth Admin API
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