// P0-B: Verify safeAzureOpenAI fails closed on AI provider outage in
// production. The malpractice failure mode is silent fallback to a hard-coded
// demo SOAP note / demo transcript when Azure or Whisper throws — these tests
// guarantee that path is impossible in production regardless of the demo
// env flag.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────
// Mock the AzureOpenAI SDK with a controllable client. Each test mutates
// these handles to simulate Azure / Whisper success or failure.
const mockChatCreate = vi.fn();
const mockTranscribeCreate = vi.fn();

vi.mock('openai', () => {
    class MockAzureOpenAI {
        chat = {
            completions: {
                create: (...args: unknown[]) => mockChatCreate(...args),
            },
        };
        audio = {
            transcriptions: {
                create: (...args: unknown[]) => mockTranscribeCreate(...args),
            },
        };
    }
    return { AzureOpenAI: MockAzureOpenAI };
});

// Bypass the resilience stack so each test runs synchronously without
// retry backoff or breaker state leaking between tests.
vi.mock('@/lib/resilience/circuit-breaker', () => ({
    CircuitBreaker: class {
        constructor(_opts: unknown) {}
        async execute<T>(fn: () => Promise<T>): Promise<T> {
            return fn();
        }
    },
    withRetry: <T>(fn: () => Promise<T>): Promise<T> => fn(),
    withTimeout: <T>(p: Promise<T>): Promise<T> => p,
}));

// Silence dev-mode logging.
vi.mock('@/lib/logging/safe-logger', () => ({
    devLog: vi.fn(),
    devWarn: vi.fn(),
    devError: vi.fn(),
    logError: vi.fn(),
    sanitizeError: (e: unknown) => ({ message: (e as Error)?.message ?? 'err' }),
}));

import safeAzureOpenAI, { AIProviderUnavailableError } from './safeAzureOpenAI';

const sessionData = {
    subjective: 'Patient reports improved mood',
    objective: '',
    symptoms: ['anxiety'],
    assessment: '',
};

/**
 * Reset the lazy-init state on the singleton so each test re-reads env vars.
 * The class doesn't expose a public reset, but the test boundary is a fair
 * place to reach in via cast.
 */
function resetSingleton() {
    const s = safeAzureOpenAI as unknown as Record<string, unknown>;
    s.isInitialized = false;
    s.isConfigured = false;
    s.client = null;
    s.whisperClient = null;
    s.deploymentName = '';
}

beforeEach(() => {
    resetSingleton();
    mockChatCreate.mockReset();
    mockTranscribeCreate.mockReset();
    vi.stubEnv('AZURE_OPENAI_ENDPOINT', 'https://test.openai.azure.com');
    vi.stubEnv('AZURE_OPENAI_API_KEY', 'test-key');
    vi.stubEnv('AZURE_OPENAI_DEPLOYMENT_NAME', 'gpt-4');
    vi.stubEnv('AZURE_WHISPER_ENDPOINT', 'https://test.whisper.azure.com');
    vi.stubEnv('AZURE_WHISPER_API_KEY', 'test-whisper-key');
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('safeAzureOpenAI — production fail-closed behavior', () => {
    it('throws AIProviderUnavailableError when Azure throws in production (no demo fallback)', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
        mockChatCreate.mockRejectedValue(new Error('Azure 503'));

        let captured: unknown;
        try {
            await safeAzureOpenAI.generateSOAPNote(sessionData);
        } catch (e) {
            captured = e;
        }
        expect(captured).toBeInstanceOf(AIProviderUnavailableError);
        expect((captured as AIProviderUnavailableError).upstream).toBe('azure_openai');
        expect((captured as AIProviderUnavailableError).code).toBe('AI_PROVIDER_UNAVAILABLE');
    });

    it('STILL throws in production even when NEXT_PUBLIC_DEMO_MODE=true (gate is non-bypassable)', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
        mockChatCreate.mockRejectedValue(new Error('Azure 503'));

        await expect(safeAzureOpenAI.generateSOAPNote(sessionData)).rejects.toBeInstanceOf(
            AIProviderUnavailableError,
        );
    });

    it('throws in development when DEMO_MODE is not opted in (default fail-closed)', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
        mockChatCreate.mockRejectedValue(new Error('Azure 503'));

        await expect(safeAzureOpenAI.generateSOAPNote(sessionData)).rejects.toBeInstanceOf(
            AIProviderUnavailableError,
        );
    });

    it('returns demo SOAP note in development when DEMO_MODE=true (only allowed path)', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'true');
        mockChatCreate.mockRejectedValue(new Error('Azure 503'));

        const note = await safeAzureOpenAI.generateSOAPNote(sessionData);

        expect(typeof note).toBe('string');
        expect(note.length).toBeGreaterThan(0);
        expect(note).toMatch(/SUBJECTIVE/);
        expect(note).toMatch(/OBJECTIVE/);
    });

    it('throws AIProviderUnavailableError(upstream="whisper") when Whisper throws in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
        mockTranscribeCreate.mockRejectedValue(new Error('Whisper 503'));

        let captured: unknown;
        try {
            await safeAzureOpenAI.transcribeAudio(Buffer.from('audio'), 'recording.webm');
        } catch (e) {
            captured = e;
        }
        expect(captured).toBeInstanceOf(AIProviderUnavailableError);
        expect((captured as AIProviderUnavailableError).upstream).toBe('whisper');
    });

    it('happy path unchanged: Azure returns valid SOAP → real content returned', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('NEXT_PUBLIC_DEMO_MODE', 'false');
        mockChatCreate.mockResolvedValue({
            choices: [
                {
                    message: {
                        content:
                            'SUBJECTIVE\nReal content from clinician.\nOBJECTIVE\nReal vitals.\nASSESSMENT\nReal.\nPLAN\nReal.',
                    },
                },
            ],
        });

        const note = await safeAzureOpenAI.generateSOAPNote(sessionData);

        expect(note).toContain('Real content from clinician');
        // Demo note's signature fabricated diagnosis must not appear in real output.
        expect(note).not.toContain('Major Depressive Disorder, moderate episode (F32.1)');
    });
});
