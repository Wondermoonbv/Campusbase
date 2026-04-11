/**
 * Generate a valid iCalendar (.ics) string for an event.
 */
export function generateICS(event: {
  name: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  description?: string | null;
}): string {
  const formatDate = (dateStr: string, timeStr?: string | null): string => {
    const d = dateStr.replace(/-/g, "");
    if (timeStr) {
      const t = timeStr.replace(/:/g, "").slice(0, 4) + "00";
      return `${d}T${t}`;
    }
    return d;
  };

  const dtStart = formatDate(event.date, event.start_time);
  const dtEnd = event.end_time
    ? formatDate(event.date, event.end_time)
    : event.start_time
      ? formatDate(event.date, event.start_time)
      : formatDate(event.date);

  const isAllDay = !event.start_time;

  const escapeText = (t: string) =>
    t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusBase//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    isAllDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
    isAllDay ? `DTEND;VALUE=DATE:${dtEnd}` : `DTEND:${dtEnd}`,
    `SUMMARY:${escapeText(event.name)}`,
  ];

  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.join("\r\n");
}
