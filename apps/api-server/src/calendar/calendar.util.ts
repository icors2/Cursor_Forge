/**
 * iCal UTC helpers. scheduledAt is stored in Postgres as UTC; feeds emit YYYYMMDDThhmmssZ.
 */

/** Formats an instant as a UTC iCal DATE-TIME (`YYYYMMDDThhmmssZ`). */
export function toIcalUtc(date: Date): string {
  const iso = date.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes TEXT values in an iCal line (commas, semicolons, backslashes, newlines). */
export function escapeIcalText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Folds a content line at 75 octets as required by RFC 5545.
 * Continuation lines start with a single space.
 */
export function foldIcalLine(line: string): string {
  if (line.length <= 75) {
    return line;
  }
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join("\r\n");
}
