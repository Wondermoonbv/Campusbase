/**
 * Strip HTML tags from a string to prevent XSS.
 * Preserves plain text content.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
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
  email: 255,
  phone: 50,
  url: 500,
  shortText: 200,
} as const;
