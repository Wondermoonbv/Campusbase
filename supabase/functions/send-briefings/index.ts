import { createClient } from "npm:@supabase/supabase-js@2";

const BRIEFING_DAYS_BEFORE = 5;
const SIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">`;
const WRAPPER_END = `<tr><td style="padding:24px 32px;background:#f4f4f5;text-align:center;font-size:12px;color:#71717a;line-height:1.6;">Dit is een automatisch bericht van Elia Campus Recruitment.<br/>Vragen? Antwoord op deze email of contacteer <a href="mailto:campusbase@campusbase.be" style="color:#0E6575;text-decoration:underline;">campusbase@campusbase.be</a>.<br/><br/>© ${new Date().getFullYear()} Elia Group — Campus Recruitment</td></tr></table></td></tr></table></body></html>`;
const HEADER = `<tr><td style="background:#0E6575;padding:24px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">Elia Campus</span><br/><span style="color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Elia Campus Recruitment</span></td></tr>`;

function row(content: string) {
  return `<tr><td style="padding:0 32px;">${content}</td></tr>`;
}

interface BriefingEvent {
  name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
}

interface AttachmentForEmail {
  file_name: string;
  signed_url: string;
}

function buildBriefingEmail(
  ambassadeurName: string,
  event: BriefingEvent,
  attachments: AttachmentForEmail[],
  portalUrl: string,
  daysUntil: number,
): string {
  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(event.name);
  const safeUrl = escapeUrl(portalUrl);

  const detailsTable = `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">
    <tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:140px;">📅 Datum</td><td style="padding:6px 0;font-size:14px;color:#18181b;">${escapeHtml(formatDate(event.date))}</td></tr>
    ${event.start_time ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:140px;">🕐 Tijd</td><td style="padding:6px 0;font-size:14px;color:#18181b;">${escapeHtml(event.start_time)}${event.end_time ? ` — ${escapeHtml(event.end_time)}` : ""}</td></tr>` : ""}
    ${event.location ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:140px;">📍 Locatie</td><td style="padding:6px 0;font-size:14px;color:#18181b;">${escapeHtml(event.location)}</td></tr>` : ""}
  </table>`;

  const attachmentsBlock = attachments.length > 0
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#f0f9fa;border-radius:6px;"><p style="font-size:13px;color:#0E6575;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;font-weight:600;">📎 Voorbereiding</p><p style="font-size:13px;color:#3f3f46;margin:0 0 10px;">Bekijk deze documenten ter voorbereiding (links zijn 7 dagen geldig):</p><ul style="margin:0;padding-left:20px;font-size:14px;color:#18181b;line-height:1.8;">${attachments.map(a => `<li><a href="${escapeUrl(a.signed_url)}" style="color:#0E6575;text-decoration:underline;">${escapeHtml(a.file_name)}</a></li>`).join("")}</ul></div>`)
    : row(`<div style="margin:16px 0;padding:14px 16px;background:#f4f4f5;border-radius:6px;"><p style="font-size:13px;color:#71717a;margin:0;">ℹ️ Er zijn nog geen voorbereidingsdocumenten toegevoegd voor dit event.</p></div>`);

  const descriptionBlock = event.description && event.description.trim()
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#f4f4f5;border-radius:6px;"><p style="font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Over dit event</p><p style="font-size:14px;color:#18181b;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(event.description)}</p></div>`)
    : "";

  return `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Briefing: ${safeEventName}</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Over <strong>${daysUntil} dagen</strong> sta je op <strong>${safeEventName}</strong>. Hieronder de info en de voorbereidingsdocumenten.</p>`)}${row(detailsTable)}${attachmentsBlock}${descriptionBlock}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk je portaal</a></div>`)}${WRAPPER_END}`;
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
    target.setUTCDate(target.getUTCDate() + BRIEFING_DAYS_BEFORE);
    const targetDateStr = target.toISOString().slice(0, 10);

    const { data: events, error: evErr } = await admin
      .from("evenementen")
      .select("id, name, date, start_time, end_time, location, description, status")
      .eq("date", targetDateStr)
      .neq("status", "geannuleerd");

    if (evErr) throw evErr;

    const errors: { context: string; error: string }[] = [];
    let briefingsSent = 0;

    for (const event of events ?? []) {
      const { data: attRows } = await admin
        .from("attachments")
        .select("id, file_name, file_path")
        .eq("entity_type", "event")
        .eq("entity_id", event.id);

      let signedAttachments: AttachmentForEmail[] = [];
      if (attRows && attRows.length > 0) {
        const paths = attRows.map(a => a.file_path);
        const { data: signed } = await admin.storage
          .from("attachments")
          .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS);
        const urlByPath = new Map<string, string>();
        (signed ?? []).forEach((s: any) => {
          if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
        });
        signedAttachments = attRows
          .map(a => ({
            file_name: a.file_name,
            signed_url: urlByPath.get(a.file_path) ?? "",
          }))
          .filter(a => a.signed_url);
      }

      const { data: inschrijvingen, error: insErr } = await admin
        .from("event_inschrijvingen")
        .select("id, ambassadeur_id, ambassadeur:ambassadeurs(full_name, email, access_token)")
        .eq("evenement_id", event.id)
        .in("status", ["ingeschreven", "bevestigd"])
        .is("briefing_sent_at", null);

      if (insErr) {
        errors.push({ context: `event ${event.id} inschrijvingen`, error: insErr.message });
        continue;
      }

      const eventData: BriefingEvent = {
        name: event.name,
        date: event.date,
        start_time: event.start_time ?? null,
        end_time: event.end_time ?? null,
        location: event.location ?? null,
        description: event.description ?? null,
      };

      for (const ins of inschrijvingen ?? []) {
        const amb: any = ins.ambassadeur;
        if (!amb?.email || !amb?.access_token) continue;

        try {
          const portalUrl = `https://elia-recruit-flow.lovable.app/ambassadeur-portaal?token=${amb.access_token}`;
          const html = buildBriefingEmail(
            amb.full_name,
            eventData,
            signedAttachments,
            portalUrl,
            BRIEFING_DAYS_BEFORE,
          );
          const subject = `Briefing: ${event.name} — ${new Date(event.date).toLocaleDateString("nl-BE")}`;

          await sendResendEmail(amb.email, subject, html);

          await admin
            .from("event_inschrijvingen")
            .update({ briefing_sent_at: new Date().toISOString() })
            .eq("id", ins.id);

          console.log(`Briefing verstuurd naar ${amb.email} voor event ${event.name}`);
          briefingsSent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Briefing mail mislukt voor ${amb.email}:`, msg);
          errors.push({ context: `${amb.email} / ${event.name}`, error: msg });
        }
      }
    }

    return jsonResponse({
      events_processed: events?.length ?? 0,
      briefings_sent: briefingsSent,
      errors,
    });
  } catch (error) {
    console.error("send-briefings error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});