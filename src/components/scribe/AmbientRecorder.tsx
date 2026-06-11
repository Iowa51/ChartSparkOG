"use client";

// Ambient scribe recorder UI. Captures session audio with MediaRecorder and
// sends it to /api/ai/transcribe-and-generate; the parent receives the
// grounded result (transcript + SOAP sections + suggested codes) via
// onComplete and owns what happens to it. Drafts only — signing stays in the
// existing manual workflow.

import React from "react";
import {
  AlertCircle,
  CheckCircle,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Square,
  Trash2,
} from "lucide-react";
import {
  useAmbientRecorder,
  type ScribeResult,
  SIZE_HARD_STOP_BYTES,
} from "@/components/scribe/useAmbientRecorder";

export type { ScribeResult };

interface AmbientRecorderProps {
  patientId?: string | null;
  templateFormat?: string;
  selectedPhrases?: Record<string, string[]>;
  onComplete: (result: ScribeResult) => void;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AmbientRecorder({
  patientId,
  templateFormat,
  selectedPhrases,
  onComplete,
}: AmbientRecorderProps) {
  const recorder = useAmbientRecorder({ patientId, templateFormat, selectedPhrases, onComplete });
  const { phase, error, elapsedSeconds, recordedBytes, sizeWarning, autoStopped } = recorder;

  const isCapturing = phase === "recording" || phase === "paused";

  return (
    <div className="space-y-3" data-testid="ambient-recorder">
      {/* Status row — clinicians must always know when audio is captured */}
      <div className="flex items-center justify-between" aria-live="polite">
        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
          Ambient Recording
        </span>
        {isCapturing && (
          <span
            className={`text-xs font-mono flex items-center gap-1.5 ${
              phase === "recording" ? "text-red-500" : "text-amber-500"
            }`}
            data-testid="recorder-status"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                phase === "recording" ? "bg-red-500 animate-pulse" : "bg-amber-500"
              }`}
              aria-hidden="true"
            />
            {phase === "recording" ? "REC" : "PAUSED"} {formatElapsed(elapsedSeconds)}
          </span>
        )}
      </div>

      {/* Idle / requesting-mic */}
      {(phase === "idle" || phase === "requesting-mic") && (
        <button
          type="button"
          onClick={() => void recorder.start()}
          disabled={phase === "requesting-mic"}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Mic className="h-4 w-4" />
          {phase === "requesting-mic" ? "Requesting microphone…" : "Start Recording"}
        </button>
      )}

      {/* Recording / paused controls */}
      {isCapturing && (
        <div className="flex gap-2">
          {phase === "recording" ? (
            <button
              type="button"
              onClick={recorder.pause}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800 transition-all"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={recorder.resume}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 transition-all"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={recorder.stop}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
          >
            <Square className="h-4 w-4" />
            Stop &amp; Generate
          </button>
        </div>
      )}

      {/* Size guard warning */}
      {isCapturing && sizeWarning && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl"
        >
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Recording size is {formatMegabytes(recordedBytes)} — approaching the upload limit. It
            will stop automatically at {formatMegabytes(SIZE_HARD_STOP_BYTES)} and generate the note
            from the audio captured so far.
          </p>
        </div>
      )}

      {/* Processing */}
      {phase === "processing" && (
        <div className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
          <RefreshCw className="h-5 w-5 text-primary animate-spin shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">
              Transcribing and generating draft note…
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Longer recordings can take a minute. Keep this page open.
            </p>
          </div>
        </div>
      )}

      {/* Auto-stop notice */}
      {autoStopped && (phase === "processing" || phase === "done") && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Recording stopped automatically at the upload size limit. Audio captured up to that
            point is being used for the note.
          </p>
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              Draft generated — review and edit every section before saving.
            </span>
          </div>
          <button
            type="button"
            onClick={recorder.discard}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-border text-muted-foreground hover:bg-muted transition-all"
          >
            <Mic className="h-3.5 w-3.5" />
            Record Again
          </button>
        </div>
      )}

      {/* Error */}
      {phase === "error" && error && (
        <div
          role="alert"
          className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-red-800 dark:text-red-300">{error.message}</p>
          </div>
          <div className="flex gap-2">
            {error.canRetryUpload ? (
              <>
                <button
                  type="button"
                  onClick={recorder.retryUpload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry Upload
                </button>
                <button
                  type="button"
                  onClick={recorder.discard}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Discard
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={recorder.discard}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
