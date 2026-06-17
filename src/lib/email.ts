import { supabase } from "@/integrations/supabase/client";
import { buildEmailLogoHtml } from "@/lib/logo";
import { escapeHtml, escapeUrl } from "@/lib/sanitize";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  icsContent?: string;
  replyTo?: string;
}

const REPLY_TO = "campusbase@campusbase.be";

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: { ...params, replyTo: params.replyTo ?? REPLY_TO },
  });
  if (error) return { success: false, error: error.message };
  if (data?.error) return { success: false, error: data.error };
  return { success: true };
}

/**
 * Send emails to multiple recipients and return results.
 */
export async function sendBulkEmails(
  emails: SendEmailParams[]
): Promise<{ sent: number; failed: { to: string; error: string }[] }> {
  const results = await Promise.allSettled(emails.map((e) => sendEmail(e)));
  let sent = 0;
  const failed: { to: string; error: string }[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled" && r.value.success) {
      sent++;
    } else {
      const err =
        r.status === "rejected"
          ? String(r.reason)
          : r.value.error ?? "Onbekende fout";
      failed.push({ to: emails[i].to, error: err });
    }
  });
  return { sent, failed };
}

// ── HTML email templates ──
// IMPORTANT: all user-supplied content must be passed through escapeHtml()
// before interpolation into template strings. URLs use escapeUrl() which also
// restricts schemes to http/https.

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">`;
const WRAPPER_END = `<tr><td style="padding:24px 32px;background:#f4f4f5;text-align:center;font-size:12px;color:#71717a;line-height:1.6;">Dit is een automatisch bericht van Elia Campus Recruitment.<br/>Vragen? Antwoord op deze email of contacteer <a href="mailto:campusbase@campusbase.be" style="color:#0E6575;text-decoration:underline;">campusbase@campusbase.be</a>.<br/><br/>© ${new Date().getFullYear()} Elia Group — Campus Recruitment</td></tr></table></td></tr></table></body></html>`;
function getHeader() {
  const logoHtml = buildEmailLogoHtml();
  return `<tr><td style="background:#0E6575;padding:24px 32px;">${logoHtml}<br/><span style="color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Elia Campus Recruitment</span></td></tr>`;
}

function row(content: string) {
  return `<tr><td style="padding:0 32px;">${content}</td></tr>`;
}

function infoRow(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<tr><td style="padding:4px 0;font-size:14px;color:#71717a;width:140px;">${escapeHtml(label)}</td><td style="padding:4px 0;font-size:14px;color:#18181b;">${escapeHtml(value)}</td></tr>`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("nl-BE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export interface EventEmailData {
  eventName: string;
  date: string;
  location?: string | null;
  schoolName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  opbouwTijd?: string | null;
  afbraakTijd?: string | null;
  contactpersoon?: string | null;
  description?: string | null;
  contactTerPlaatseName?: string | null;
  contactTerPlaatsePhone?: string | null;
  boothNumber?: string | null;
  parkingInfo?: string | null;
  lockerCode?: string | null;
  otherAmbassadeurs?: string[];
}

export function buildConfirmationEmail(
  ambassadeurName: string,
  event: EventEmailData,
  portalUrl: string
): string {
  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(event.eventName);
  const safeUrl = escapeUrl(portalUrl);
  const contactValue = event.contactTerPlaatseName
    ? `${event.contactTerPlaatseName}${event.contactTerPlaatsePhone ? ` — ${event.contactTerPlaatsePhone}` : ""}`
    : null;
  const descriptionBlock = event.description && event.description.trim()
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#f4f4f5;border-radius:6px;"><p style="font-size:13px;color:#71717a;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 6px;">Over dit event</p><p style="font-size:14px;color:#18181b;line-height:1.6;margin:0;white-space:pre-wrap;">${escapeHtml(event.description)}</p></div>`)
    : "";
  const calendarCta = row(`<div style="margin:24px 0;padding:16px;border:1px dashed #0E6575;border-radius:6px;background:#f0f9fa;text-align:center;"><p style="font-size:15px;color:#0E6575;font-weight:600;margin:0 0 6px;">📅 Voeg toe aan je agenda</p><p style="font-size:13px;color:#3f3f46;line-height:1.5;margin:0;">Er is een agenda-uitnodiging (.ics) bijgevoegd bij deze mail. Open de bijlage om het event aan je agenda toe te voegen.</p></div>`);
  const others = (event.otherAmbassadeurs ?? []).filter(Boolean);
  const othersBlock = others.length > 0
    ? row(`<div style="margin:16px 0;padding:14px 16px;background:#f0f9fa;border-radius:6px;"><p style="font-size:13px;color:#0E6575;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;font-weight:600;">Wie gaat er nog?</p><p style="font-size:13px;color:#3f3f46;margin:0 0 8px;">De volgende collega's zijn ook bevestigd voor dit event:</p><ul style="margin:0;padding-left:20px;font-size:14px;color:#18181b;line-height:1.7;">${others.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul></div>`)
    : "";
  return `${WRAPPER_START}${getHeader()}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Bevestiging als ambassadeur</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Je bent bevestigd als ambassadeur voor <strong>${safeEventName}</strong>. Hieronder vind je de praktische details.</p>`)}${row(`<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">${infoRow("📅 Datum", formatDate(event.date))}${infoRow("📍 Locatie", event.location)}${infoRow("🏢 Organisator", event.schoolName)}${infoRow("🕐 Startuur", event.startTime)}${infoRow("🕐 Einduur", event.endTime)}${infoRow("📞 Contact ter plaatse", contactValue)}${infoRow("🏢 Standnummer", event.boothNumber)}${infoRow("🅿️ Parking", event.parkingInfo)}${infoRow("🔐 Locker & iPad", event.lockerCode)}</table>`)}${descriptionBlock}${othersBlock}${calendarCta}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk je portaal</a></div>`)}${WRAPPER_END}`;
}

export function buildFeedbackEmail(
  ambassadeurName: string,
  eventName: string,
  feedbackUrl: string,
  ambassadeurEmail?: string
): string {
  // Append prefill params to feedback URL
  let finalUrl = feedbackUrl;
  try {
    const url = new URL(feedbackUrl);
    if (ambassadeurName && ambassadeurName !== "Ambassadeur") {
      url.searchParams.set("name", ambassadeurName);
    }
    if (ambassadeurEmail) {
      url.searchParams.set("email", ambassadeurEmail);
    }
    finalUrl = url.toString();
  } catch {
    // If URL parsing fails, fall back to original
  }

  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(eventName);
  const safeUrl = escapeUrl(finalUrl);

  return `${WRAPPER_START}${getHeader()}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Feedback gevraagd</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Bedankt voor je deelname aan <strong>${safeEventName}</strong>. We horen graag je feedback over het event.</p>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Geef je feedback</a></div>`)}${WRAPPER_END}`;
}

export function buildPortalLinkEmail(
  ambassadeurName: string,
  portalUrl: string
): string {
  const safeName = escapeHtml(ambassadeurName);
  const safeUrl = escapeUrl(portalUrl);
  return `${WRAPPER_START}${getHeader()}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Jouw Elia Campus Portaal</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Via onderstaande link kan je je inschrijven voor aankomende Elia campus events en je beschikbaarheid beheren.</p>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Open mijn portaal</a></div><p style="font-size:12px;color:#71717a;text-align:center;">Bewaar deze link — het is je persoonlijke toegang.</p>`)}${WRAPPER_END}`;
}

export function buildCustomAmbassadorEmail(
  fullName: string,
  bodyText: string,
  portalUrl?: string
): string {
  const safeName = escapeHtml(fullName);
  const safeBody = escapeHtml(bodyText).replace(/\r?\n/g, "<br/>");
  const button = portalUrl
    ? row(`<div style="text-align:center;margin:24px 0;"><a href="${escapeUrl(portalUrl)}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk je portaal</a></div>`)
    : "";
  return `${WRAPPER_START}${getHeader()}${row(`<p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:24px 0 8px;">Dag ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">${safeBody}</p>`)}${button}${WRAPPER_END}`;
}

export function buildSimpleEmail(bodyText: string): string {
  const safeBody = escapeHtml(bodyText).replace(/\r?\n/g, "<br/>");
  return `${WRAPPER_START}${getHeader()}${row(`<div style="font-size:14px;color:#3f3f46;line-height:1.6;margin:24px 0;">${safeBody}</div>`)}${WRAPPER_END}`;
}

export function buildInvitationEmail(
  ambassadeurName: string,
  event: EventEmailData,
  portalUrl: string
): string {
  const safeName = escapeHtml(ambassadeurName);
  const safeEventName = escapeHtml(event.eventName);
  const safeUrl = escapeUrl(portalUrl);
  return `${WRAPPER_START}${getHeader()}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Uitnodiging als ambassadeur</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${safeName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Je bent uitgenodigd als ambassadeur voor <strong>${safeEventName}</strong>. Bekijk de details en schrijf je in via je persoonlijk portaal.</p>`)}${row(`<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">${infoRow("📅 Datum", formatDate(event.date))}${infoRow("📍 Locatie", event.location)}${infoRow("🏫 School", event.schoolName)}</table>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${safeUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk en schrijf je in</a></div>`)}${WRAPPER_END}`;
}
