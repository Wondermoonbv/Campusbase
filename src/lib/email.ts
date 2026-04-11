import { supabase } from "@/integrations/supabase/client";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  icsContent?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: params,
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

const WRAPPER_START = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">`;
const WRAPPER_END = `<tr><td style="padding:24px 32px;background:#f4f4f5;text-align:center;font-size:12px;color:#71717a;">© ${new Date().getFullYear()} Elia Group — Campus Recruitment<br/>Dit is een automatisch bericht.</td></tr></table></td></tr></table></body></html>`;
const HEADER = `<tr><td style="background:#0E6575;padding:24px 32px;"><img src="https://www.elia.be/-/media/project/elia/shared/images/elia-group-logo.png" alt="Elia" height="32" style="height:32px;" /><br/><span style="color:#ffffff;font-size:11px;letter-spacing:1px;text-transform:uppercase;">Campus Recruitment</span></td></tr>`;

function row(content: string) {
  return `<tr><td style="padding:0 32px;">${content}</td></tr>`;
}

function infoRow(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<tr><td style="padding:4px 0;font-size:14px;color:#71717a;width:140px;">${label}</td><td style="padding:4px 0;font-size:14px;color:#18181b;">${value}</td></tr>`;
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
}

export function buildConfirmationEmail(
  ambassadeurName: string,
  event: EventEmailData,
  portalUrl: string
): string {
  return `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Bevestiging als ambassadeur</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${ambassadeurName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Je bent bevestigd als ambassadeur voor <strong>${event.eventName}</strong>. Hieronder vind je de praktische details.</p>`)}${row(`<table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;">${infoRow("📅 Datum", formatDate(event.date))}${infoRow("📍 Locatie", event.location)}${infoRow("🏫 School", event.schoolName)}${infoRow("🕐 Startuur", event.startTime)}${infoRow("🕐 Einduur", event.endTime)}${infoRow("🔧 Opbouw", event.opbouwTijd)}${infoRow("🔧 Afbraak", event.afbraakTijd)}${infoRow("👤 Contact", event.contactpersoon)}</table>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${portalUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Bekijk je portaal</a></div>`)}${WRAPPER_END}`;
}

export function buildFeedbackEmail(
  ambassadeurName: string,
  eventName: string,
  feedbackUrl: string
): string {
  return `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Feedback gevraagd</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${ambassadeurName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Bedankt voor je deelname aan <strong>${eventName}</strong>. We horen graag je feedback over het event.</p>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${feedbackUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Geef je feedback</a></div>`)}${WRAPPER_END}`;
}

export function buildPortalLinkEmail(
  ambassadeurName: string,
  portalUrl: string
): string {
  return `${WRAPPER_START}${HEADER}${row(`<h1 style="font-size:20px;color:#18181b;margin:24px 0 8px;">Jouw CampusBase Portaal</h1><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Hallo ${ambassadeurName},</p><p style="font-size:14px;color:#3f3f46;line-height:1.6;">Via onderstaande link kan je je inschrijven voor aankomende campus events en je beschikbaarheid beheren.</p>`)}${row(`<div style="text-align:center;margin:24px 0;"><a href="${portalUrl}" style="display:inline-block;background:#0E6575;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">Open mijn portaal</a></div><p style="font-size:12px;color:#71717a;text-align:center;">Bewaar deze link — het is je persoonlijke toegang.</p>`)}${WRAPPER_END}`;
}
