import { createClient } from "npm:@supabase/supabase-js@2";

const FEEDBACK_DAYS_AFTER = 1;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "#";
    return escapeHtml(url.toString());
  } catch {
    return "#";
  }
}

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">`;
const WRAPPER_END = `<tr><td style="padding:24px 32px;background:#f4f4f5;text-align:center;font-size:12px;color:#71717a;line-height:1.6;">Dit is een automatisch bericht van Elia Campus Recruitment.<br/>Vragen? Antwoord op deze email of contacteer <a href="mailto:campusbase@campusbase.be" style="color:#0E6575;text-decoration:underline;">campusbase@campusbase.be</a>.<br/><br/>© ${new Date().getFullYear()} Elia Group — Campus Recruitment</td></tr></table></td></tr></table></body></html>`;
const HEADER = `<tr><td style="background:#0E6575;padding:24px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">Elia Campus</span><br/><span style="color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Elia Campus Recruitment</span></td></tr>`;

function row(content: string) {
  return `<tr><td style="padding:0 32px;">${content}</td></tr>`;
}

interface EventInfo {
  name: string;
  date: string;
  location: string | null;
}

function buildFeedbackRequestEmail(
  ambassadeurName: string,
  event: EventInfo,
  feedbackUrl: string,
): string {
  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(event.name);
  const safeUrl = escapeUrl(feedbackUrl);
  const safeLocation = event.location ? escapeHtml(event.location) : "";

  return `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Bedankt voor je inzet op ${safeEventName}</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Gisteren stond je op <strong>${safeEventName}</strong>${safeLocation ? ` in ${safeLocation}` : ""}. We zouden graag horen hoe het verlopen is.</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Het invullen duurt 2-3 minuten en helpt ons om volgende events beter te organiseren.</p>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Geef je feedback</a></div>`)}${row(`<p style="font-size:12px;color:#71717a;line-height:1.6;margin:16px 0;">Werkt de knop niet? Kopieer deze link:<br/><span style="word-break:break-all;color:#0E6575;">${safeUrl}</span></p>`)}${WRAPPER_END}`;
}

async function sendResendEmail(to: string, subject: string, html: string) {
  const payload = {
    from: "Elia Campus Recruitment <noreply@campusbase.be>",
    reply_to: "campusbase@campusbase.be",
    to: [to],
    subject,
    html,
  };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!CRON_SECRET) {
      return jsonResponse({ error: "CRON_SECRET niet geconfigureerd op de server." }, 500);
    }
    const provided = req.headers.get("x-cron-secret");
    if (provided !== CRON_SECRET) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Serverconfiguratie ontbreekt." }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() - FEEDBACK_DAYS_AFTER);
    const targetDateStr = target.toISOString().slice(0, 10);

    const { data: events, error: evErr } = await admin
      .from("evenementen")
      .select("id, name, date, location, status")
      .eq("date", targetDateStr)
      .neq("status", "geannuleerd");

    if (evErr) throw evErr;

    const errors: { context: string; error: string }[] = [];
    let requestsSent = 0;
    let eventsSkipped = 0;

    for (const event of events ?? []) {
      const { data: forms } = await admin
        .from("feedback_forms")
        .select("id, short_code, is_active")
        .eq("evenement_id", event.id)
        .eq("is_active", true)
        .limit(1);

      const form = forms?.[0];
      if (!form) {
        console.log(`Geen actief feedback form voor event ${event.name} — overgeslagen`);
        eventsSkipped++;
        continue;
      }

      const { data: inschrijvingen, error: insErr } = await admin
        .from("event_inschrijvingen")
        .select("id, ambassadeur_id, ambassadeur:ambassadeurs(full_name, email, access_token)")
        .eq("evenement_id", event.id)
        .in("status", ["ingeschreven", "bevestigd"])
        .is("feedback_request_sent_at", null);

      if (insErr) {
        errors.push({ context: `event ${event.id} inschrijvingen`, error: insErr.message });
        continue;
      }

      const eventInfo: EventInfo = {
        name: event.name,
        date: event.date,
        location: event.location ?? null,
      };

      for (const ins of inschrijvingen ?? []) {
        const amb: any = ins.ambassadeur;
        if (!amb?.email || !amb?.access_token) continue;

        try {
          const feedbackUrl = `https://app.campusbase.be/f/${form.short_code}?token=${amb.access_token}`;
          const html = buildFeedbackRequestEmail(amb.full_name, eventInfo, feedbackUrl);
          const subject = `Feedback gevraagd: ${event.name}`;

          await sendResendEmail(amb.email, subject, html);

          await admin
            .from("event_inschrijvingen")
            .update({ feedback_request_sent_at: new Date().toISOString() })
            .eq("id", ins.id);

          console.log(`Feedback request verstuurd naar ${amb.email} voor event ${event.name}`);
          requestsSent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Feedback request mail mislukt voor ${amb.email}:`, msg);
          errors.push({ context: `${amb.email} / ${event.name}`, error: msg });
        }
      }
    }

    return jsonResponse({
      events_processed: events?.length ?? 0,
      events_skipped_no_form: eventsSkipped,
      feedback_requests_sent: requestsSent,
      errors,
    });
  } catch (error) {
    console.error("send-feedback-requests error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});