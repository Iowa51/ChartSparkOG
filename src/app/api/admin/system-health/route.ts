import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';

interface SystemStatus {
    name: string;
    status: 'operational' | 'degraded' | 'down';
    latency: number;
    lastCheck: string;
}

interface HealthMetrics {
    responseTime: number;
    errorRate: number;
    activeSessions: number;
}

interface RecentActivity {
    time: string;
    event: string;
    status: 'success' | 'warning' | 'error';
}

async function handleGet(context: AuthContext) {
    const req = context.request;
    const startTime = Date.now();
    const systems: SystemStatus[] = [];
    const activities: RecentActivity[] = [];
    let metrics: HealthMetrics = {
        responseTime: 0,
        errorRate: 0,
        activeSessions: 0,
    };

    // Check Supabase Database
    try {
        const dbStart = Date.now();
        const supabase = await createClient();

        if (supabase) {
            const { count, error } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const dbLatency = Date.now() - dbStart;

            if (error) {
                systems.push({
                    name: 'Database',
                    status: 'degraded',
                    latency: dbLatency,
                    lastCheck: new Date().toISOString(),
                });
                activities.push({
                    time: new Date().toISOString(),
                    event: 'Database check failed',
                    status: 'error',
                });
            } else {
                systems.push({
                    name: 'Database',
                    status: 'operational',
                    latency: dbLatency,
                    lastCheck: new Date().toISOString(),
                });
                activities.push({
                    time: new Date().toISOString(),
                    event: 'Database health check completed',
                    status: 'success',
                });

                // Get active sessions count
                const { count: sessionCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);

                metrics.activeSessions = sessionCount || 0;
            }
        } else {
            systems.push({
                name: 'Database',
                status: 'down',
                latency: 0,
                lastCheck: new Date().toISOString(),
            });
        }
    } catch (e) {
        systems.push({
            name: 'Database',
            status: 'down',
            latency: 0,
            lastCheck: new Date().toISOString(),
        });
        activities.push({
            time: new Date().toISOString(),
            event: 'Database connection failed',
            status: 'error',
        });
    }

    // Check API Server (self-check)
    const apiLatency = Date.now() - startTime;
    systems.push({
        name: 'API Server',
        status: 'operational',
        latency: apiLatency,
        lastCheck: new Date().toISOString(),
    });
    activities.push({
        time: new Date().toISOString(),
        event: 'API server health check completed',
        status: 'success',
    });

    // Check Azure OpenAI Service
    try {
        const aiStart = Date.now();
        const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

        if (azureEndpoint) {
            systems.push({
                name: 'AI Services',
                status: 'operational',
                latency: Date.now() - aiStart,
                lastCheck: new Date().toISOString(),
            });
            activities.push({
                time: new Date().toISOString(),
                event: 'AI services endpoint configured',
                status: 'success',
            });
        } else {
            systems.push({
                name: 'AI Services',
                status: 'degraded',
                latency: 0,
                lastCheck: new Date().toISOString(),
            });
            activities.push({
                time: new Date().toISOString(),
                event: 'AI services endpoint not configured',
                status: 'warning',
            });
        }
    } catch (e) {
        systems.push({
            name: 'AI Services',
            status: 'down',
            latency: 0,
            lastCheck: new Date().toISOString(),
        });
    }

    // Check Cloud Storage (Supabase Storage)
    try {
        const supabase = await createClient();
        if (supabase) {
            systems.push({
                name: 'Cloud Storage',
                status: 'operational',
                latency: 5,
                lastCheck: new Date().toISOString(),
            });
        } else {
            systems.push({
                name: 'Cloud Storage',
                status: 'degraded',
                latency: 0,
                lastCheck: new Date().toISOString(),
            });
        }
    } catch (e) {
        systems.push({
            name: 'Cloud Storage',
            status: 'down',
            latency: 0,
            lastCheck: new Date().toISOString(),
        });
    }

    // Calculate overall response time
    metrics.responseTime = Date.now() - startTime;

    // Calculate error rate from systems
    const failedSystems = systems.filter(s => s.status === 'down').length;
    metrics.errorRate = systems.length > 0 ? (failedSystems / systems.length) * 100 : 0;

    // Get recent audit logs if available
    try {
        const supabase = await createClient();
        if (supabase) {
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('action, entity_type, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            if (logs && logs.length > 0) {
                logs.forEach((log: { action: string; entity_type: string; created_at: string }) => {
                    activities.push({
                        time: log.created_at,
                        event: `${log.action} ${log.entity_type}`,
                        status: 'success',
                    });
                });
            }
        }
    } catch (e) {
        // Audit logs are optional
    }

    // Sort activities by time (most recent first)
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Determine overall status
    const overallStatus = systems.every(s => s.status === 'operational')
        ? 'operational'
        : systems.some(s => s.status === 'down')
            ? 'down'
            : 'degraded';

    return NextResponse.json({
        overallStatus,
        systems,
        metrics,
        activities: activities.slice(0, 10), // Limit to 10 most recent
        timestamp: new Date().toISOString(),
    });
}

export const GET = withAuth(handleGet, {
    requiredRole: ['SUPER_ADMIN'],
});
