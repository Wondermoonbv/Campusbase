import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIP } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ip = getClientIP(req);
  const rl = checkRateLimit(ip, { maxRequests: 30, windowSeconds: 60 });
  if (!rl.allowed) {
    return jsonResponse({ error: "Te veel verzoeken. Probeer het over " + rl.retryAfterSeconds + " seconden opnieuw." }, 429);
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

    const body = await req.json();
    const accessToken = String(body.accessToken ?? "").trim();

    if (!accessToken) {
      return jsonResponse({ error: "Token is verplicht." }, 400);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(accessToken)) {
      return jsonResponse({ error: "Ongeldig token formaat." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: ambassador, error: ambErr } = await admin
      .from("ambassadeurs")
      .select("id, full_name, email, department, is_active, token_expires_at")
      .eq("access_token", accessToken)
      .eq("is_active", true)
      .maybeSingle();

    if (ambErr) {
      console.error("Ambassador lookup failed:", ambErr);
      return jsonResponse({ error: "Lookup mislukt." }, 500);
    }

    if (!ambassador) {
      return jsonResponse({ error: "Ongeldige of verlopen toegang." }, 401);
    }

    if (ambassador.token_expires_at && new Date(ambassador.token_expires_at) < new Date()) {
      return jsonResponse({ error: "Je toegangslink is verlopen. Vraag een nieuwe link aan bij het recruitment team.", expired: true }, 401);
    }

    const { data: enrollments } = await admin
      .from("event_inschrijvingen")
      .select("id, evenement_id, status")
      .eq("ambassadeur_id", ambassador.id);

    const { data: events } = await admin
      .from("evenementen")
      .select("id, name, date, location, start_time, end_time, status, max_ambassadeurs, setup_time, teardown_time, short_code")
      .neq("status", "geannuleerd")
      .order("date", { ascending: true });

    const { data: feedbackForms } = await admin
      .from("feedback_forms")
      .select("id, evenement_id")
      .not("evenement_id", "is", null);

    const { data: feedbackResponses } = await admin
      .from("feedback_responses")
      .select("id, form_id")
      .eq("respondent_email", ambassador.email);

    return jsonResponse({
      ambassador: {
        id: ambassador.id,
        full_name: ambassador.full_name,
        email: ambassador.email,
        department: ambassador.department,
      },
      enrollments: enrollments ?? [],
      events: events ?? [],
      feedbackForms: feedbackForms ?? [],
      feedbackResponses: feedbackResponses ?? [],
    });
  } catch (error) {
    console.error("public-ambassador-lookup failed", error);
    return jsonResponse({ error: "Er ging iets mis." }, 500);
  }
});
