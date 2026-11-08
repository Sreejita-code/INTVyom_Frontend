import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "denied" | "unavailable";

export const RECORDER_MESSAGES: Record<"denied" | "unavailable", string> = {
  denied: "Microphone access is blocked. Allow it in your browser settings, or upload a file instead.",
  unavailable: "This browser cannot record audio here. Upload a file instead.",
};

/** The extension the API reads for a recorded MIME type, so the file name tells the truth. */
export const extensionFor = (mimeType: string): string => {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
};

/**
 * Records from the microphone with the browser's MediaRecorder. Hands the finished recording to
 * `onRecorded` as a File. Holds the elapsed time for the timer, and releases the mic on stop.
 */
export function useAudioRecorder(onRecorded: (file: File) => void) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setState((err as Error).name === "NotAllowedError" ? "denied" : "unavailable");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      release();
      setState("unavailable");
      return;
    }
    const chunks: Blob[] = [];
    const mic = new MediaRecorder(stream.current);
    recorder.current = mic;
    mic.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    mic.onstop = () => {
      const type = mic.mimeType || chunks[0]?.type || "audio/webm";
      const blob = new Blob(chunks, { type });
      onRecorded(new File([blob], `recording.${extensionFor(type)}`, { type }));
      release();
      setState("idle");
    };
    mic.start();
    setElapsed(0);
    setState("recording");
    timer.current = setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
  }, [onRecorded, release]);

  const stop = useCallback(() => {
    recorder.current?.stop();
  }, []);

  return { state, elapsed, start, stop };
}
