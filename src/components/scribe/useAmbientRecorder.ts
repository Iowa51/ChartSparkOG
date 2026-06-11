"use client";

// State machine for the ambient scribe recorder (presentation lives in
// AmbientRecorder.tsx): MediaRecorder lifecycle, the size guard against the
// 25MB server limit, and the retry-without-losing-audio upload flow.

import { useCallback, useEffect, useRef, useState } from "react";

// prettier-ignore
export type RecorderPhase =
    "idle" | "requesting-mic" | "recording" | "paused" | "processing" | "done" | "error";

// prettier-ignore
export type RecorderErrorKind =
    "mic-denied" | "no-device" | "mic-in-use" | "not-supported" | "upload-failed" | "unknown";

export interface RecorderError {
  kind: RecorderErrorKind;
  message: string;
  // Upload failures keep the recorded audio so the upload can be retried.
  canRetryUpload: boolean;
}

// Response shape of POST /api/ai/transcribe-and-generate.
export interface ScribeResult {
  transcript: string;
  sections: Record<string, string>;
  suggestedCodes?: { cpt?: unknown[]; icd10?: unknown[] };
  // True only when the server injected patient chart context into the
  // generation prompt. Absent or false = treat the draft as ungrounded.
  grounded?: boolean;
  isDemo?: boolean;
}

export interface UseAmbientRecorderOptions {
  patientId?: string | null;
  templateFormat?: string;
  selectedPhrases?: Record<string, string[]>;
  onComplete: (result: ScribeResult) => void;
}

// Server rejects audio over 25MB (Azure Whisper limit). Warn at 20MB and
// hard-stop at 24MB so the upload never trips the server-side rejection.
export const SIZE_WARN_BYTES = 20 * 1024 * 1024;
export const SIZE_HARD_STOP_BYTES = 24 * 1024 * 1024;

const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMimeType(): string {
  if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported) {
    for (const mime of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
  }
  return "audio/webm";
}

function fileExtension(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  return "webm";
}

// getUserMedia DOMException names → clinician-facing guidance
// (same classification the telehealth setup page uses).
const MIC_ERRORS: Array<{ names: string[]; kind: RecorderErrorKind; message: string }> = [
  {
    names: ["NotAllowedError", "PermissionDeniedError"],
    kind: "mic-denied",
    message:
      "Microphone access was denied. Allow microphone access for this site in your browser settings, then try again.",
  },
  {
    names: ["NotFoundError", "DevicesNotFoundError"],
    kind: "no-device",
    message: "No microphone was found on this device. Connect a microphone and try again.",
  },
  {
    names: ["NotReadableError", "TrackStartError"],
    kind: "mic-in-use",
    message:
      "Your microphone is in use by another application. Close the other application and try again.",
  },
];

function classifyMicError(err: unknown): RecorderError {
  const name = err instanceof DOMException ? err.name : "";
  const match = MIC_ERRORS.find((e) => e.names.includes(name));
  return {
    kind: match?.kind ?? "unknown",
    message:
      match?.message ??
      "Could not access the microphone. Check your device settings and try again.",
    canRetryUpload: false,
  };
}

export function useAmbientRecorder(options: UseAmbientRecorderOptions) {
  const { patientId, templateFormat = "soap", selectedPhrases, onComplete } = options;

  const [phase, setPhase] = useState<RecorderPhase>("idle");
  const [error, setError] = useState<RecorderError | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordedBytes, setRecordedBytes] = useState(0);
  const [autoStopped, setAutoStopped] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const bytesRef = useRef(0);
  const mimeTypeRef = useRef("audio/webm");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const stoppingRef = useRef(false);
  const discardedRef = useRef(false);
  // Mirrors of the latest upload options so retryUpload sends current values.
  const optionsRef = useRef({ patientId, templateFormat, selectedPhrases, onComplete });
  optionsRef.current = { patientId, templateFormat, selectedPhrases, onComplete };

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const upload = useCallback(async (blob: Blob) => {
    const {
      patientId: pid,
      templateFormat: fmt,
      selectedPhrases: phrases,
      onComplete: done,
    } = optionsRef.current;
    setPhase("processing");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("audio", blob, `recording.${fileExtension(mimeTypeRef.current)}`);
      formData.append("templateFormat", fmt);
      if (phrases && Object.values(phrases).some((p) => p.length > 0)) {
        formData.append("selectedPhrases", JSON.stringify(phrases));
      }
      if (pid) {
        formData.append("patientId", pid);
      }

      const response = await fetch("/api/ai/transcribe-and-generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let serverMessage = "";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") serverMessage = data.error;
        } catch {
          // Non-JSON error body — fall through to the generic message.
        }
        throw new Error(serverMessage || `Upload failed (${response.status})`);
      }

      const data = (await response.json()) as ScribeResult & { success?: boolean };
      if (!data.sections) {
        throw new Error("The AI returned no note content.");
      }

      // Success: the audio has served its purpose; free it.
      blobRef.current = null;
      chunksRef.current = [];
      setPhase("done");
      done(data);
    } catch (err) {
      // Keep blobRef so the clinician can retry without re-recording.
      setError({
        kind: "upload-failed",
        message:
          err instanceof Error && err.message
            ? `${err.message} Your recording was kept — you can retry without re-recording.`
            : "Processing failed. Your recording was kept — you can retry without re-recording.",
        canRetryUpload: true,
      });
      setPhase("error");
    }
  }, []);

  const finalizeStop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // onstop assembles the blob and uploads
    }
    releaseStream();
    setPhase("processing");
  }, [clearTimer, releaseStream]);

  const start = useCallback(async () => {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError({
        kind: "not-supported",
        message:
          "Audio recording is not supported in this browser. Use a current version of Chrome, Edge, Firefox, or Safari.",
        canRetryUpload: false,
      });
      setPhase("error");
      return;
    }

    setPhase("requesting-mic");
    setError(null);
    setAutoStopped(false);
    setElapsedSeconds(0);
    setRecordedBytes(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(classifyMicError(err));
      setPhase("error");
      return;
    }

    streamRef.current = stream;
    mimeTypeRef.current = pickMimeType();
    chunksRef.current = [];
    blobRef.current = null;
    bytesRef.current = 0;
    pausedRef.current = false;
    stoppingRef.current = false;
    discardedRef.current = false;

    const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
    recorderRef.current = recorder;

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size === 0) return;
      chunksRef.current.push(event.data);
      bytesRef.current += event.data.size;
      setRecordedBytes(bytesRef.current);
      if (bytesRef.current >= SIZE_HARD_STOP_BYTES && !stoppingRef.current) {
        setAutoStopped(true);
        finalizeStop();
      }
    };

    recorder.onstop = () => {
      if (discardedRef.current) return;
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      blobRef.current = blob;
      void upload(blob);
    };

    recorder.start(1000); // 1-second chunks keep the size guard responsive

    timerRef.current = setInterval(() => {
      if (!pausedRef.current) setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    setPhase("recording");
  }, [finalizeStop, upload]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.pause();
      pausedRef.current = true;
      setPhase("paused");
    }
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "paused") {
      recorder.resume();
      pausedRef.current = false;
      setPhase("recording");
    }
  }, []);

  const stop = useCallback(() => {
    finalizeStop();
  }, [finalizeStop]);

  const retryUpload = useCallback(() => {
    if (blobRef.current) {
      void upload(blobRef.current);
    }
  }, [upload]);

  const discard = useCallback(() => {
    discardedRef.current = true;
    clearTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    releaseStream();
    recorderRef.current = null;
    chunksRef.current = [];
    blobRef.current = null;
    bytesRef.current = 0;
    pausedRef.current = false;
    stoppingRef.current = false;
    setError(null);
    setAutoStopped(false);
    setElapsedSeconds(0);
    setRecordedBytes(0);
    setPhase("idle");
  }, [clearTimer, releaseStream]);

  // Release the microphone and timer if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      discardedRef.current = true;
      clearTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      releaseStream();
    };
  }, [clearTimer, releaseStream]);

  return {
    phase,
    error,
    elapsedSeconds,
    recordedBytes,
    sizeWarning: recordedBytes >= SIZE_WARN_BYTES,
    autoStopped,
    start,
    pause,
    resume,
    stop,
    retryUpload,
    discard,
  };
}
