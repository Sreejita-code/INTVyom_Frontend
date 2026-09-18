export interface ValidationResult {
  ok: boolean;
  message?: string;
}

/** A Google Meet code is three groups of letters: `abc-defg-hij`. */
export const GOOGLE_MEET_URL = /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

/**
 * Cheap pre-flight for the meeting URL. The API applies the authoritative check; this only
 * catches the obviously doomed cases before a request leaves the browser.
 */
export const validateMeetingUrl = (raw: string): ValidationResult => {
  const value = raw.trim();
  if (!value) return { ok: false, message: "Meeting URL is required" };
  if (!GOOGLE_MEET_URL.test(value)) {
    return { ok: false, message: "Enter a Google Meet link shaped like https://meet.google.com/abc-defg-hij" };
  }
  return { ok: true };
};
