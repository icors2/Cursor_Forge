/**
 * Local datetime-local helpers. API values stay UTC ISO-8601.
 */

/** Converts a UTC ISO instant to a value for `<input type="datetime-local">`. */
export function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts a datetime-local value to a UTC ISO-8601 instant. */
export function fromDatetimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Kickoff must be a valid date and time");
  }
  return date.toISOString();
}

/** Formats a UTC instant for display without pretending it is a local zone. */
export function utcLabel(iso: string): string {
  return iso.replace("T", " ").replace(".000Z", "Z");
}
