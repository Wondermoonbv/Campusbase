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

    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const isAdmin = (callerRoles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) {
      return jsonResponse({ error: "Alleen admins kunnen gebruikers aanmaken." }, 403);
    }

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

    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const { data: createData, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createErr) {
      console.error("createUser failed", createErr);
      if (createErr.message?.toLowerCase().includes("already")) {
        return jsonResponse({ error: "Gebruiker met dit e-mailadres bestaat al." }, 409);
      }
      return jsonResponse({ error: createErr.message }, 400);
    }

    const newUserId = createData.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: "Gebruiker kon niet worden aangemaakt." }, 500);
    }

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
    }

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