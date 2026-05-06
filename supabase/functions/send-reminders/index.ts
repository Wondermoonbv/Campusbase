import { createClient } from "npm:@supabase/supabase-js@2";

const REMINDER_DAYS_BEFORE = 7;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const REMINDER_SECRET = Deno.env.get("REMINDER_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-reminder-secret",
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

function generateICS(event: {
  name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
}): string {
  const fmt = (dateStr: string, timeStr?: string | null) => {
    const d = dateStr.replace(/-/g, "");
    if (timeStr) {
      const t = timeStr.replace(/:/g, "").slice(0, 4) + "00";
      return `${d}T${t}`;
    }
    return d;
  };
  const dtStart = fmt(event.date, event.start_time);
  const dtEnd = event.end_time ? fmt(event.date, event.end_time) : event.start_time ? fmt(event.date, event.start_time) : fmt(event.date);
  const isAllDay = !event.start_time;
  const esc = (t: string) =>
    t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n/g, "\\n").replace(/\r/g, "\\n").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusBase//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${esc(event.name)}`,
  ];
  if (event.location) lines.push(`LOCATION:${esc(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${esc(event.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">`;
const WRAPPER_END = `<tr><td style="padding:24px 32px;background:#f4f4f5;text-align:center;font-size:12px;color:#71717a;line-height:1.6;">Dit is een automatisch bericht van Elia Campus Recruitment.<br/>Vragen? Antwoord op deze email of contacteer <a href="mailto:campusbase@campusbase.be" style="color:#0E6575;text-decoration:underline;">campusbase@campusbase.be</a>.<br/><br/>© ${new Date().getFullYear()} Elia Group — Campus Recruitment</td></tr></table></td></tr></table></body></html>`;
const HEADER = `<tr><td style="background:#0E6575;padding:24px 32px;"><span style="color:#ffffff;font-size:18px;font-weight:700;">Elia Campus</span><br/><span style="color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Elia Campus Recruitment</span></td></tr>`;

function row(content: string) {
  return `<tr><td style="padding:0 32px;">${content}</td></tr>`;
}

type ChangedField = "date" | "start_time" | "end_time" | "location";

const normTime = (t: string | null | undefined): string | null =>
  t ? String(t).substring(0, 5) : null;
const normDate = (d: string | null | undefined): string | null =>
  d ? String(d).substring(0, 10) : null;
const normLocation = (l: string | null | undefined): string | null =>
  l ? String(l).trim().toLowerCase() : null;

interface ReminderEvent {
  name: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  organisator_name: string | null;
}

interface Snapshot {
  date?: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
}

function reminderRow(label: string, current: string | null, oldValue: string | null, changed: boolean, isDate = false) {
  if (!current && !changed) return "";
  const display = current ? (isDate ? formatDate(current) : current) : "—";
  const oldDisplay = oldValue ? (isDate ? formatDate(oldValue) : oldValue) : "—";
  const warning = changed
    ? ` <span style="color:#b45309;font-weight:600;">⚠️ Gewijzigd (was ${escapeHtml(oldDisplay)})</span>`
    : "";
  return `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:140px;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#18181b;">${escapeHtml(display)}${warning}</td></tr>`;
}

function buildReminderEmail(
  ambassadeurName: string,
  event: ReminderEvent,
  snapshot: Snapshot | null,
  contactName: string | null,
  contactPhone: string | null,
  portalUrl: string,
  daysUntil: number,
): { html: string; hasChanges: boolean } {
  const changes: Record<ChangedField, boolean> = {
    date: !!(snapshot && snapshot.date && normDate(snapshot.date) !== normDate(event.date)),
    start_time: !!(snapshot && normTime(snapshot.start_time) !== normTime(event.start_time)),
    end_time: !!(snapshot && normTime(snapshot.end_time) !== normTime(event.end_time)),
    location: !!(snapshot && normLocation(snapshot.location) !== normLocation(event.location)),
  };
  const hasChanges = snapshot ? Object.values(changes).some(Boolean) : false;

  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(event.name);
  const safeUrl = escapeUrl(portalUrl);

  const warningBanner = hasChanges
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#fef3c7;border-left:4px solid #b45309;border-radius:4px;"><p style="font-size:14px;color:#7c2d12;margin:0;font-weight:600;">⚠️ Let op: sommige details zijn gewijzigd sinds je bevestiging.</p></div>`)
    : "";

  const detailsTable = `<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">
    ${reminderRow("📅 Datum", event.date, snapshot?.date ?? null, changes.date, true)}
    ${reminderRow("📍 Locatie", event.location, snapshot?.location ?? null, changes.location)}
    ${reminderRow("🕐 Startuur", event.start_time, snapshot?.start_time ?? null, changes.start_time)}
    ${reminderRow("🕐 Einduur", event.end_time, snapshot?.end_time ?? null, changes.end_time)}
    ${contactName ? `<tr><td style="padding:6px 0;font-size:14px;color:#71717a;width:140px;">📞 Contact ter plaatse</td><td style="padding:6px 0;font-size:14px;color:#18181b;">${escapeHtml(contactName)}${contactPhone ? ` — ${escapeHtml(contactPhone)}` : ""}</td></tr>` : ""}
  </table>`;

  const descriptionBlock = event.description && event.description.trim()
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#f4f4f5;border-radius:6px;"><p style="font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Over dit event</p><p style="font-size:14px;color:#18181b;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(event.description)}</p></div>`)
    : "";

  const calendarCta = row(`<div style="margin:24px 0;padding:16px;border:1px dashed #0E6575;border-radius:6px;background:#f0f9fa;text-align:center;"><p style="font-size:15px;color:#0E6575;font-weight:600;margin:0 0 6px;">📅 Voeg toe aan je agenda</p><p style="font-size:13px;color:#3f3f46;line-height:1.5;margin:0;">Er is een agenda-uitnodiging (.ics) bijgevoegd bij deze mail. Open de bijlage om het event aan je agenda toe te voegen.</p></div>`);

  const html = `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Herinnering: ${safeEventName}</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Over <strong>${daysUntil} dag${daysUntil === 1 ? "" : "en"}</strong> vindt <strong>${safeEventName}</strong> plaats. Hieronder vind je de praktische details.</p>`)}${warningBanner}${row(detailsTable)}${descriptionBlock}${calendarCta}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk je portaal</a></div>`)}${WRAPPER_END}`;

  return { html, hasChanges };
}

async function sendResendEmail(to: string, subject: string, html: string, icsContent: string) {
  const payload = {
    from: "Elia Campus Recruitment <noreply@campusbase.be>",
    reply_to: "campusbase@campusbase.be",
    to: [to],
    subject,
    html,
    attachments: [
      { filename: "event.ics", content: btoa(icsContent), type: "text/calendar" },
    ],
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
    if (!REMINDER_SECRET) {
      return jsonResponse({ error: "REMINDER_SECRET niet geconfigureerd op de server." }, 500);
    }
    const provided = req.headers.get("x-reminder-secret");
    if (provided !== REMINDER_SECRET) {
      return jsonResponse({ error: "Niet geautoriseerd." }, 401);
    }
    if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Serverconfiguratie ontbreekt." }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Compute target date (N days from today, in UTC date format yyyy-mm-dd)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + REMINDER_DAYS_BEFORE);
    const targetDateStr = target.toISOString().slice(0, 10);

    // 1. Find events on target date, not cancelled
    const { data: events, error: evErr } = await admin
      .from("evenementen")
      .select("id, name, date, start_time, end_time, location, description, status, organisator_id")
      .eq("date", targetDateStr)
      .neq("status", "geannuleerd");

    if (evErr) throw evErr;

    const errors: { context: string; error: string }[] = [];
    let remindersSent = 0;

    for (const event of events ?? []) {
      // organisator name (not used in mail body but logged)
      let organisatorName: string | null = null;
      if (event.organisator_id) {
        const { data: org } = await admin
          .from("organisaties")
          .select("name")
          .eq("id", event.organisator_id)
          .maybeSingle();
        organisatorName = org?.name ?? null;
      }

      // contact ter plaatse
      let contactName: string | null = null;
      let contactPhone: string | null = null;
      const { data: cps } = await admin
        .from("event_contactpersonen")
        .select("rol, contact:contacten(name, phone)")
        .eq("event_id", event.id)
        .eq("rol", "event_ter_plaatse")
        .limit(1);
      const cp = cps?.[0] as any;
      if (cp?.contact) {
        contactName = cp.contact.name ?? null;
        contactPhone = cp.contact.phone ?? null;
      }

      // ambassadeurs needing reminder
      const { data: inschrijvingen, error: insErr } = await admin
        .from("event_inschrijvingen")
        .select("id, ambassadeur_id, status, reminder_sent_at, confirmation_snapshot, ambassadeur:ambassadeurs(full_name, email, access_token)")
        .eq("evenement_id", event.id)
        .in("status", ["ingeschreven", "bevestigd"])
        .is("reminder_sent_at", null);

      if (insErr) {
        errors.push({ context: `event ${event.id} inschrijvingen`, error: insErr.message });
        continue;
      }

      const eventData: ReminderEvent = {
        name: event.name,
        date: event.date,
        start_time: event.start_time ?? null,
        end_time: event.end_time ?? null,
        location: event.location ?? null,
        description: (event as any).description ?? null,
        organisator_name: organisatorName,
      };

      const icsContent = generateICS({
        name: event.name,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        description: (event as any).description ?? null,
      });

      for (const ins of inschrijvingen ?? []) {
        const amb: any = ins.ambassadeur;
        if (!amb?.email) continue;

        try {
          const portalUrl = `https://elia-recruit-flow.lovable.app/ambassadeur-portaal?token=${amb.access_token}`;
          const snapshot = (ins as any).confirmation_snapshot as Snapshot | null;
          const { html } = buildReminderEmail(
            amb.full_name,
            eventData,
            snapshot,
            contactName,
            contactPhone,
            portalUrl,
            REMINDER_DAYS_BEFORE,
          );
          const subject = `Herinnering: ${event.name} — ${new Date(event.date).toLocaleDateString("nl-BE")}`;

          await sendResendEmail(amb.email, subject, html, icsContent);

          await admin
            .from("event_inschrijvingen")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", ins.id);

          console.log(`Reminder verstuurd naar ${amb.email} voor event ${event.name}`);
          remindersSent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Mail mislukt voor ${amb.email}:`, msg);
          errors.push({ context: `${amb.email} / ${event.name}`, error: msg });
        }
      }
    }

    return jsonResponse({
      events_processed: events?.length ?? 0,
      reminders_sent: remindersSent,
      errors,
    });
  } catch (error) {
    console.error("send-reminders error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
});