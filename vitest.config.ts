import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
        // DB-integration suite requires a running local Supabase stack and is
        // run via `npm run test:db` only. Excluded from the default unit suite
        // so `npm test` does not require a live database.
        exclude: ['node_modules/**', 'src/__tests__/db/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/__tests__/**',
                '**/*.d.ts',
                'node_modules/**',
                '.next/**',
                'dist/**',
            ],
            thresholds: {
                lines: 80,
                branches: 75,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
