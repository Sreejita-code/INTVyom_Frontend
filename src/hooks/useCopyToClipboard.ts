import { useCallback, useEffect, useRef, useState } from "react";

interface CopyResult {
  copied: boolean;
  /** Writes to the clipboard; resolves true on success, false on failure. */
  copy: (value: string) => Promise<boolean>;
}

/**
 * Shared copy-to-clipboard state. Awaits the write, flips `copied` for
 * `resetAfterMs`, and cleans up the timer on unmount. Used by CopyIdButton,
 * ApiSnippet and WebCallClientGuide instead of three pasted copies.
 */
export function useCopyToClipboard(resetAfterMs = 2000): CopyResult {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (value: string) => {
      if (!value) return false;
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetAfterMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
