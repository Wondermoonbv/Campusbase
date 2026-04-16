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

// Decode JWT payload without verification.
// Safe here because verify_jwt=true in config.toml means Supabase
// has already cryptographically verified the token before this function runs.
function decodeJwtPayload(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const padded = payload + "=".repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }
    const token = authHeader.slice("Bearer ".length);
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) {
      return jsonResponse({ error: "Ongeldige token." }, 401);
    }
    const callerId = payload.sub;

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Alleen admins kunnen wachtwoorden resetten." }, 403);
    }

    const body = await req.json();
    const targetEmail = String(body.targetEmail ?? "").trim().toLowerCase();
    const newPassword = String(body.newPassword ?? "");

    if (!targetEmail || !newPassword) {
      return jsonResponse({ error: "Email en wachtwoord zijn verplicht." }, 400);
    }
    if (newPassword.length < 8) {
      return jsonResponse({ error: "Wachtwoord moet minimaal 8 tekens zijn." }, 400);
    }

    const { data: targetProfile, error: profileErr } = await admin
      .from("profiles")
      .select("id, email")
      .eq("email", targetEmail)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!targetProfile) {
      return jsonResponse({ error: "Gebruiker niet gevonden." }, 404);
    }

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