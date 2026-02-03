// src/app/api/health/route.ts
// Health check endpoint for load balancer integration

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    checks: {
        database: { status: 'up' | 'down'; latencyMs?: number };
        environment: { status: 'ok' | 'missing_vars' };
    };
}

export async function GET() {
    const startTime = Date.now();
    const health: HealthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        checks: {
            database: { status: 'down' },
            environment: { status: 'ok' },
        },
    };

    // Check required environment variables
    const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];
    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        health.checks.environment = { status: 'missing_vars' };
        health.status = 'degraded';
    }

    // Check database connectivity
    try {
        const supabase = await createClient();
        if (supabase) {
            const dbStart = Date.now();
            // Simple query to check database connectivity
            const { error } = await supabase
                .from('profiles')
                .select('id')
                .limit(1);

            if (!error) {
                health.checks.database = {
                    status: 'up',
                    latencyMs: Date.now() - dbStart,
                };
            } else {
                health.checks.database = { status: 'down' };
                health.status = 'unhealthy';
            }
        } else {
            // Demo mode - database not configured
            health.checks.database = { status: 'up', latencyMs: 0 };
        }
    } catch {
        health.checks.database = { status: 'down' };
        health.status = 'unhealthy';
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, {
        status: statusCode,
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
    });
}
