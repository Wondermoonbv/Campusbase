import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const LOGO_STORAGE_KEY = "campusbase_logo_url";

/**
 * Generate an inline SVG data URI for the "CB" fallback logo (petrol square).
 */
export const CB_FALLBACK_LOGO = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='40' viewBox='0 0 200 40'%3E%3Ctext x='0' y='27' font-family='Arial,sans-serif' font-size='16' font-weight='700' fill='%230E6575'%3EElia Campus Recruitment%3C/text%3E%3C/svg%3E`;

/**
 * Upload a logo file to Supabase Storage and return the public URL.
 */
export async function uploadLogo(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "png";
  const path = `company-logo.${ext}`;

  // Remove old logo if exists (ignore errors)
  await supabase.storage.from("logos").remove([path]);

  const { error } = await supabase.storage.from("logos").upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  // Add cache-buster
  const url = `${data.publicUrl}?t=${Date.now()}`;
  localStorage.setItem(LOGO_STORAGE_KEY, url);
  return url;
}

/**
 * Get the current logo URL for emails. Checks platformSettings first, then storage.
 * Returns fallback CB logo if nothing is set.
 */
export function getEmailLogoUrl(): string {
  // Check localStorage platform settings
  try {
    const stored = localStorage.getItem("campusbase_platform_settings");
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.companyLogoUrl && !settings.companyLogoUrl.startsWith("data:")) {
        return settings.companyLogoUrl;
      }
    }
  } catch { /* ignore */ }

  // Check cached storage URL
  const cached = localStorage.getItem(LOGO_STORAGE_KEY);
  if (cached) return cached;

  // Return a hosted fallback - inline SVG won't work in most email clients
  // so we return a placeholder URL that the HEADER template will handle
  return "";
}

/**
 * Build the logo HTML for email headers.
 * If a public URL is available, use <img>. Otherwise use inline HTML "CB" box.
 */
export function buildEmailLogoHtml(): string {
  const url = getEmailLogoUrl();
  if (url) {
    return `<img src="${url}" alt="Elia Campus Recruitment" height="32" style="height:32px;max-width:200px;" />`;
  }
  // Inline HTML fallback - "Elia" text logo
  return `<table cellpadding="0" cellspacing="0" style="display:inline-block;"><tr><td><span style="color:#ffffff;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Elia</span></td></tr></table>`;
}
