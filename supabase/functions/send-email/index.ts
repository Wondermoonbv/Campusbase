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

    const body = await req.json();

    // Public template path (no admin/editor auth required) — used by the
    // marketing site contact form. Still rate-limited via the IP check above.
    if (body?.template === "marketing-lead") {
      const d = body.data ?? {};
      const naam = typeof d.naam === "string" ? d.naam.trim() : "";
      const organisatie = typeof d.organisatie === "string" ? d.organisatie.trim() : "";
      const email = typeof d.email === "string" ? d.email.trim() : "";
      const functie = typeof d.functie === "string" ? d.functie.trim() : "";
      const boodschap = typeof d.boodschap === "string" ? d.boodschap.trim() : "";
      const hoeGehoord = typeof d.hoeGehoord === "string" ? d.hoeGehoord.trim() : "";

      if (!naam || !organisatie || !email) {
        return jsonResponse({ error: "Naam, organisatie en e-mail zijn verplicht" }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: "Ongeldig e-mailadres" }, 400);
      }

      const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const subject = `Nieuwe demo-aanvraag van ${naam} (${organisatie})`;
      const rows = [
        `<tr><td style="padding:6px 12px;font-weight:600;">Naam:</td><td style="padding:6px 12px;">${esc(naam)}</td></tr>`,
        `<tr><td style="padding:6px 12px;font-weight:600;">Organisatie:</td><td style="padding:6px 12px;">${esc(organisatie)}</td></tr>`,
        `<tr><td style="padding:6px 12px;font-weight:600;">E-mail:</td><td style="padding:6px 12px;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>`,
        functie ? `<tr><td style="padding:6px 12px;font-weight:600;">Functie:</td><td style="padding:6px 12px;">${esc(functie)}</td></tr>` : "",
        hoeGehoord ? `<tr><td style="padding:6px 12px;font-weight:600;">Hoe gehoord:</td><td style="padding:6px 12px;">${esc(hoeGehoord)}</td></tr>` : "",
      ].join("");

      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;color:#111;max-width:600px;">
          <h2 style="margin:0 0 16px;">Nieuwe demo-aanvraag via campusbase.be</h2>
          <table style="border-collapse:collapse;width:100%;background:#f8f9fa;border-radius:8px;overflow:hidden;">
            ${rows}
          </table>
          ${boodschap ? `
            <div style="margin-top:20px;padding:16px;background:#fff;border-left:4px solid #2563eb;border-radius:4px;">
              <p style="margin:0 0 8px;font-weight:600;">Boodschap:</p>
              <p style="margin:0;white-space:pre-wrap;">${esc(boodschap)}</p>
            </div>
          ` : ""}
        </div>
      `;

      const payload = {
        from: "CampusBase <noreply@campusbase.be>",
        to: ["hello@campusbase.be"],
        reply_to: email,
        subject,
        html,
      };

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Resend response (marketing-lead):", res.status, JSON.stringify(data));
      if (!res.ok) return jsonResponse({ error: data }, 400);
      return jsonResponse({ success: true, messageId: data.id });
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
