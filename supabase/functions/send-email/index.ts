import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, getClientIP } from "../_shared/rate-limit.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
  const rl = checkRateLimit(ip, { maxRequests: 10, windowSeconds: 60 });
  if (!rl.allowed) {
    return jsonResponse({ error: "Te veel verzoeken. Probeer het over " + rl.retryAfterSeconds + " seconden opnieuw." }, 429);
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

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
      return jsonResponse({ error: "Ongeldige token." }, 401);
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

    const allowed = (roles ?? []).some(
      (r: { role: string }) => r.role === "admin" || r.role === "editor"
    );
    if (!allowed) {
      return jsonResponse({ error: "Geen toestemming om emails te versturen." }, 403);
    }

    const body = await req.json();
    const { to, subject, html, replyTo, icsContent } = body;

    if (!to || !subject || !html) {
      return jsonResponse({ error: "Missing required fields: to, subject, html" }, 400);
    }

    const attachments = icsContent
      ? [{ filename: "event.ics", content: btoa(icsContent), type: "text/calendar" }]
      : undefined;

    const emailPayload = {
      from: "Elia Campus Recruitment <noreply@campusbase.be>",
      reply_to: replyTo ?? "campusbase@campusbase.be",
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      attachments,
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();
    console.log("Resend response:", res.status, JSON.stringify(data));

    if (!res.ok) {
      return jsonResponse({ error: data }, 400);
    }

    return jsonResponse({ success: true, messageId: data.id });
  } catch (error) {
    console.error("Edge Function error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500
    );
  }
});
