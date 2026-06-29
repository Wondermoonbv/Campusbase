/**
 * Strip HTML tags from a string.
 * NOTE: This is a simple denylist-based strip. Use escapeHtml() instead
 * when interpolating user input into HTML contexts like emails.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Escape HTML special characters so user input is safe to interpolate
 * into an HTML string (e.g. email templates).
 * This is the standard allowlist approach: only these specific characters
 * are transformed, so no HTML/JS can be injected regardless of input.
 */
export function escapeHtml(input: string): string {
  if (input == null) return "";
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape a URL for safe use in href attributes.
 * Only allows http:// and https:// schemes to prevent javascript: URIs.
 */
export function escapeUrl(url: string): string {
  if (!url) return "";
  const trimmed = String(url).trim();
  // Only allow http and https schemes
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return escapeHtml(trimmed);
}

/**
 * Sanitize all string values in an object (shallow, one level deep).
 * Non-string values are passed through unchanged.
 */
export function sanitizeFormData<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data };
  for (const key in result) {
    const val = result[key];
    if (typeof val === "string") {
      (result as any)[key] = stripHtml(val);
    }
  }
  return result;
}

/** Input length limits used across all forms */
export const MAX_LENGTHS = {
  title: 200,
  name: 200,
  description: 2000,
  notes: 2000,
  zoektermen: 500,
  email: 255,
  phone: 50,
  url: 500,
  shortText: 200,
} as const;
