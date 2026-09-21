import { useCallback, useState } from "react";

const read = (key: string, fallback: boolean) => {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
};

/**
 * A boolean that survives a reload. Used for layout preferences — which panes
 * the user has collapsed — where losing the value is a cosmetic annoyance, not
 * data loss. Private browsing and blocked storage fall back to in-memory
 * state rather than throwing.
 */
export function usePersistedFlag(key: string, fallback = false): [boolean, () => void] {
  const [value, setValue] = useState(() => read(key, fallback));

  const toggle = useCallback(() => {
    setValue((current) => {
      const next = !current;
      try {
        localStorage.setItem(key, String(next));
      } catch {
        // ponytail: a lost layout preference is not worth surfacing to the user.
      }
      return next;
    });
  }, [key]);

  return [value, toggle];
}
