// State-machine tests for the ambient scribe recorder. MediaRecorder and
// getUserMedia are mocked; the suite drives the recorder through
// idle → requesting-mic → recording ⇄ paused → processing → done/error and
// verifies the size guard and the retry-without-losing-audio upload flow.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import AmbientRecorder from "./AmbientRecorder";

// ── MediaRecorder mock ───────────────────────────────────────────────────

class MockMediaRecorder {
  static instances: MockMediaRecorder[] = [];
  static isTypeSupported = vi.fn(() => true);

  state: "inactive" | "recording" | "paused" = "inactive";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options?: MediaRecorderOptions,
  ) {
    MockMediaRecorder.instances.push(this);
  }

  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.onstop?.();
  });
  pause = vi.fn(() => {
    this.state = "paused";
  });
  resume = vi.fn(() => {
    this.state = "recording";
  });
}

const mockTrackStop = vi.fn();
const mockStream = {
  getTracks: () => [{ stop: mockTrackStop }],
} as unknown as MediaStream;

const getUserMedia = vi.fn();

const SUCCESS_PAYLOAD = {
  success: true,
  transcript: "Clinician and patient session audio.",
  sections: { subjective: "S", objective: "O", assessment: "A", plan: "P" },
  suggestedCodes: { cpt: [], icd10: [] },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Fake audio chunk: only `.size` matters for the guard; Blob assembly in the
// hook tolerates arbitrary BlobPart values.
function chunk(size: number): BlobEvent {
  return { data: { size } as unknown as Blob } as BlobEvent;
}

const originalMediaRecorder = globalThis.MediaRecorder;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  MockMediaRecorder.instances = [];
  mockTrackStop.mockReset();
  getUserMedia.mockReset();
  getUserMedia.mockResolvedValue(mockStream);
  globalThis.MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;
  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  globalThis.fetch = vi.fn(async () => jsonResponse(SUCCESS_PAYLOAD)) as typeof fetch;
});

afterEach(() => {
  globalThis.MediaRecorder = originalMediaRecorder;
  globalThis.fetch = originalFetch;
});

async function startRecording() {
  fireEvent.click(screen.getByRole("button", { name: /start recording/i }));
  await screen.findByText(/REC/);
  return MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1];
}

describe("AmbientRecorder state machine", () => {
  it("renders the idle start button", () => {
    render(<AmbientRecorder onComplete={vi.fn()} />);
    expect(screen.getByRole("button", { name: /start recording/i })).toBeTruthy();
    expect(screen.queryByText(/REC/)).toBeNull();
  });

  it("start → recording: requests the mic and shows the pulsing indicator + controls", async () => {
    render(<AmbientRecorder onComplete={vi.fn()} />);
    const recorder = await startRecording();

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(recorder.start).toHaveBeenCalledWith(1000);
    expect(screen.getByTestId("recorder-status").textContent).toMatch(/REC/);
    expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /stop & generate/i })).toBeTruthy();
  });

  it("mic permission denied → error state with settings guidance", async () => {
    getUserMedia.mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    render(<AmbientRecorder onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/microphone access was denied/i);
    expect(alert.textContent).toMatch(/browser settings/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("no microphone hardware → error state with device guidance", async () => {
    getUserMedia.mockRejectedValue(new DOMException("missing", "NotFoundError"));
    render(<AmbientRecorder onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/no microphone was found/i);
  });

  it("pause and resume drive the recorder and the indicator", async () => {
    render(<AmbientRecorder onComplete={vi.fn()} />);
    const recorder = await startRecording();

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    expect(recorder.pause).toHaveBeenCalled();
    expect(screen.getByTestId("recorder-status").textContent).toMatch(/PAUSED/);

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    expect(recorder.resume).toHaveBeenCalled();
    expect(screen.getByTestId("recorder-status").textContent).toMatch(/REC/);
  });

  it("stop → processing → done: uploads and hands the result to onComplete", async () => {
    const onComplete = vi.fn();
    render(<AmbientRecorder patientId="patient-1" onComplete={onComplete} />);
    const recorder = await startRecording();

    act(() => {
      recorder.ondataavailable?.(chunk(1024));
    });
    fireEvent.click(screen.getByRole("button", { name: /stop & generate/i }));

    expect(recorder.stop).toHaveBeenCalled();
    expect(mockTrackStop).toHaveBeenCalled();
    await screen.findByText(/draft generated/i);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ transcript: SUCCESS_PAYLOAD.transcript }),
    );

    // patientId travels with the upload
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ai/transcribe-and-generate");
    expect((init.body as FormData).get("patientId")).toBe("patient-1");
  });

  it("upload failure keeps the audio and retry succeeds without re-recording", async () => {
    const onComplete = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "AI provider temporarily unavailable" }, 503))
      .mockResolvedValueOnce(jsonResponse(SUCCESS_PAYLOAD));
    globalThis.fetch = fetchMock as typeof fetch;

    render(<AmbientRecorder onComplete={onComplete} />);
    const recorder = await startRecording();
    act(() => {
      recorder.ondataavailable?.(chunk(1024));
    });
    fireEvent.click(screen.getByRole("button", { name: /stop & generate/i }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/recording was kept/i);
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /retry upload/i }));
    await screen.findByText(/draft generated/i);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // getUserMedia ran once — the retry reused the retained blob.
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("discard from an upload error returns to idle without calling onComplete", async () => {
    const onComplete = vi.fn();
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "boom" }, 500)) as typeof fetch;

    render(<AmbientRecorder onComplete={onComplete} />);
    const recorder = await startRecording();
    act(() => {
      recorder.ondataavailable?.(chunk(1024));
    });
    fireEvent.click(screen.getByRole("button", { name: /stop & generate/i }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(screen.getByRole("button", { name: /start recording/i })).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("warns when the recording approaches the size limit but keeps recording", async () => {
    render(<AmbientRecorder onComplete={vi.fn()} />);
    const recorder = await startRecording();

    act(() => {
      recorder.ondataavailable?.(chunk(21 * 1024 * 1024)); // ≥ 20MB warn, < 24MB stop
    });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/approaching the upload limit/i);
    expect(recorder.stop).not.toHaveBeenCalled();
    expect(screen.getByTestId("recorder-status").textContent).toMatch(/REC/);
  });

  it("hard-stops automatically before the 25MB server limit and explains why", async () => {
    // Pending fetch keeps the recorder in `processing` so the auto-stop
    // notice can be asserted deterministically.
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as typeof fetch;

    render(<AmbientRecorder onComplete={vi.fn()} />);
    const recorder = await startRecording();

    act(() => {
      recorder.ondataavailable?.(chunk(24 * 1024 * 1024)); // hits the hard stop
    });

    expect(recorder.stop).toHaveBeenCalledTimes(1);
    await screen.findByText(/stopped automatically/i);
    await screen.findByText(/transcribing and generating/i);
  });
});
