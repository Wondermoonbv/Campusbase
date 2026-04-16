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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }
    const token = authHeader.slice("Bearer ".length);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("Token verification failed:", userErr);
      return jsonResponse({ error: "Ongeldige token." }, 401);
    }
    const callerId = userData.user.id;
    const callerEmail = userData.user.email ?? null;

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
      .select("id, email, first_name, last_name")
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

    // Audit log entry (never log the password itself)
    const targetName = [targetProfile.first_name, targetProfile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || targetEmail;

    await admin.from("audit_log").insert({
      user_id: callerId,
      user_email: callerEmail,
      action: "update",
      entity_type: "user_password",
      entity_id: targetProfile.id,
      entity_name: targetName,
      changes: { target_email: targetEmail },
    });

    return jsonResponse({
      success: true,
      email: targetEmail,
    });
  } catch (error) {
    console.error("admin-reset-password failed", error);
    return jsonResponse({ error: "Er ging iets mis. Probeer het opnieuw." }, 500);
  }
});
