// DB-integration tests for public.write_audit_log.
//
// Run with: `npm run test:db`
// Requires a running local Supabase stack: `supabase start`.
// Connects to the default local URL (127.0.0.1:54322, postgres/postgres)
// unless SUPABASE_DB_URL is set to override.
//
// This suite is intentionally excluded from the default `npm test` run
// (see vitest.config.ts) because it requires a live database.

import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const DB_URL = process.env.SUPABASE_DB_URL ?? DEFAULT_LOCAL_DB_URL;

// Suffix every test role with a unique run id so parallel runs and prior
// failed runs do not collide on role names.
const RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const ROLE_WITH_GRANT = `tst_wal_grant_${RUN_ID}`;
const ROLE_NO_GRANT = `tst_wal_nogrant_${RUN_ID}`;
const ROLE_PASSWORD = 'testRolePw_2026';

const FUNCTION_SIG =
    'public.write_audit_log(text, text, uuid, uuid, uuid, text, jsonb, text)';

let admin: Client;
let withGrantClient: Client;
let noGrantClient: Client;
const insertedIds: string[] = [];

function parseConn(url: string) {
    const u = new URL(url);
    return {
        host: u.hostname,
        port: u.port ? Number(u.port) : 5432,
        database: u.pathname.replace(/^\//, '') || 'postgres',
    };
}

beforeAll(async () => {
    admin = new Client({ connectionString: DB_URL });
    await admin.connect();

    // Fail fast if the migration has not been applied to the test DB.
    const { rows: fnRows } = await admin.query<{ exists: number }>(
        `SELECT 1 AS exists
         FROM pg_catalog.pg_proc p
         JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'write_audit_log'`
    );
    if (fnRows.length === 0) {
        throw new Error(
            'public.write_audit_log not found. Apply migration ' +
                '20260526120000_create_write_audit_log_helper.sql before running test:db.'
        );
    }

    // Create two throwaway login roles for the GRANT/NO-GRANT tests.
    await admin.query(`CREATE ROLE "${ROLE_WITH_GRANT}" LOGIN PASSWORD '${ROLE_PASSWORD}'`);
    await admin.query(`CREATE ROLE "${ROLE_NO_GRANT}"  LOGIN PASSWORD '${ROLE_PASSWORD}'`);

    const { database } = parseConn(DB_URL);
    await admin.query(
        `GRANT CONNECT ON DATABASE "${database}" TO "${ROLE_WITH_GRANT}", "${ROLE_NO_GRANT}"`
    );
    // USAGE on schema so both roles can resolve the function name. EXECUTE
    // is granted only to the WITH_GRANT role; the NO_GRANT role inherits
    // only from PUBLIC, which the migration has REVOKEd.
    await admin.query(
        `GRANT USAGE ON SCHEMA public TO "${ROLE_WITH_GRANT}", "${ROLE_NO_GRANT}"`
    );
    await admin.query(`GRANT EXECUTE ON FUNCTION ${FUNCTION_SIG} TO "${ROLE_WITH_GRANT}"`);

    const conn = parseConn(DB_URL);
    withGrantClient = new Client({
        host: conn.host,
        port: conn.port,
        database: conn.database,
        user: ROLE_WITH_GRANT,
        password: ROLE_PASSWORD,
    });
    noGrantClient = new Client({
        host: conn.host,
        port: conn.port,
        database: conn.database,
        user: ROLE_NO_GRANT,
        password: ROLE_PASSWORD,
    });
    await withGrantClient.connect();
    await noGrantClient.connect();
});

afterAll(async () => {
    // Best-effort cleanup. Each step is guarded so a partial failure does
    // not leave the connection dangling.
    try {
        if (insertedIds.length > 0) {
            await admin.query(
                `DELETE FROM public.audit_logs WHERE id = ANY($1::uuid[])`,
                [insertedIds]
            );
        }
    } catch {
        // Ignore — test row cleanup is best-effort.
    }

    try {
        await withGrantClient?.end();
    } catch {
        // Ignore.
    }
    try {
        await noGrantClient?.end();
    } catch {
        // Ignore.
    }

    const { database } = parseConn(DB_URL);
    try {
        await admin.query(`REVOKE EXECUTE ON FUNCTION ${FUNCTION_SIG} FROM "${ROLE_WITH_GRANT}"`);
    } catch {
        // Ignore.
    }
    try {
        await admin.query(
            `REVOKE USAGE ON SCHEMA public FROM "${ROLE_WITH_GRANT}", "${ROLE_NO_GRANT}"`
        );
    } catch {
        // Ignore.
    }
    try {
        await admin.query(
            `REVOKE CONNECT ON DATABASE "${database}" FROM "${ROLE_WITH_GRANT}", "${ROLE_NO_GRANT}"`
        );
    } catch {
        // Ignore.
    }
    try {
        await admin.query(`DROP ROLE IF EXISTS "${ROLE_WITH_GRANT}"`);
    } catch {
        // Ignore.
    }
    try {
        await admin.query(`DROP ROLE IF EXISTS "${ROLE_NO_GRANT}"`);
    } catch {
        // Ignore.
    }

    await admin.end();
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('public.write_audit_log', () => {
    test('(1) inserts a row into audit_logs with the supplied fields', async () => {
        const userId = '11111111-1111-1111-1111-111111111111';
        const orgId = '22222222-2222-2222-2222-222222222222';
        const entityId = '33333333-3333-3333-3333-333333333333';
        const ip = '127.0.0.1';
        const details = { foo: 'bar' };

        const { rows } = await admin.query<{ id: string }>(
            `SELECT public.write_audit_log(
                $1::text, $2::text, $3::uuid, $4::uuid, $5::uuid, $6::text, $7::jsonb, $8::text
             ) AS id`,
            [
                'ASSESSMENT_SUBMITTED',
                'assessment',
                userId,
                orgId,
                entityId,
                ip,
                JSON.stringify(details),
                'LOW',
            ]
        );
        const id = rows[0]!.id;
        insertedIds.push(id);

        const { rows: written } = await admin.query<{
            action: string;
            user_id: string;
            organization_id: string;
            entity_type: string;
            entity_id: string;
            ip_address: string;
            details: Record<string, unknown>;
        }>(
            `SELECT action, user_id, organization_id, entity_type, entity_id, ip_address, details
             FROM public.audit_logs WHERE id = $1`,
            [id]
        );
        expect(written).toHaveLength(1);
        const row = written[0]!;
        expect(row.action).toBe('ASSESSMENT_SUBMITTED');
        expect(row.user_id).toBe(userId);
        expect(row.organization_id).toBe(orgId);
        expect(row.entity_type).toBe('assessment');
        expect(row.entity_id).toBe(entityId);
        expect(row.ip_address).toBe(ip);
        expect(row.details).toEqual({ foo: 'bar', risk_level: 'LOW' });
    });

    test('(2) raises when p_action is NULL', async () => {
        await expect(
            admin.query(`SELECT public.write_audit_log(NULL::text, 'assessment'::text)`)
        ).rejects.toThrow(/p_action is required/);
    });

    test('(3) raises when p_action is empty string', async () => {
        await expect(
            admin.query(`SELECT public.write_audit_log(''::text, 'assessment'::text)`)
        ).rejects.toThrow(/p_action is required/);
    });

    test('(4) raises when p_entity_type is NULL', async () => {
        await expect(
            admin.query(`SELECT public.write_audit_log('FOO'::text, NULL::text)`)
        ).rejects.toThrow(/p_entity_type is required/);
    });

    test('(5) raises when p_entity_type is empty string', async () => {
        await expect(
            admin.query(`SELECT public.write_audit_log('FOO'::text, ''::text)`)
        ).rejects.toThrow(/p_entity_type is required/);
    });

    test('(6) merges risk_level into details; existing keys preserved', async () => {
        const details = { foo: 'bar', nested: { a: 1 } };
        const { rows } = await admin.query<{ id: string }>(
            `SELECT public.write_audit_log(
                'TEST_MERGE'::text, 'test'::text,
                NULL::uuid, NULL::uuid, NULL::uuid, NULL::text,
                $1::jsonb, 'MEDIUM'::text
             ) AS id`,
            [JSON.stringify(details)]
        );
        const id = rows[0]!.id;
        insertedIds.push(id);

        const { rows: written } = await admin.query<{ details: Record<string, unknown> }>(
            `SELECT details FROM public.audit_logs WHERE id = $1`,
            [id]
        );
        expect(written[0]!.details).toEqual({
            foo: 'bar',
            nested: { a: 1 },
            risk_level: 'MEDIUM',
        });
    });

    test('(7) risk_level defaults to INFO when not supplied', async () => {
        const { rows } = await admin.query<{ id: string }>(
            `SELECT public.write_audit_log('TEST_DEFAULT'::text, 'test'::text) AS id`
        );
        const id = rows[0]!.id;
        insertedIds.push(id);

        const { rows: written } = await admin.query<{ details: Record<string, unknown> }>(
            `SELECT details FROM public.audit_logs WHERE id = $1`,
            [id]
        );
        expect(written[0]!.details).toEqual({ risk_level: 'INFO' });
    });

    test("(8) risk_level is uppercased ('low' -> 'LOW')", async () => {
        const { rows } = await admin.query<{ id: string }>(
            `SELECT public.write_audit_log(
                'TEST_UPPER'::text, 'test'::text,
                NULL::uuid, NULL::uuid, NULL::uuid, NULL::text,
                NULL::jsonb, 'low'::text
             ) AS id`
        );
        const id = rows[0]!.id;
        insertedIds.push(id);

        const { rows: written } = await admin.query<{ details: { risk_level: string } }>(
            `SELECT details FROM public.audit_logs WHERE id = $1`,
            [id]
        );
        expect(written[0]!.details.risk_level).toBe('LOW');
    });

    test('(9) returns the inserted row id as a uuid', async () => {
        const { rows } = await admin.query<{ id: string }>(
            `SELECT public.write_audit_log('TEST_RETURN'::text, 'test'::text) AS id`
        );
        const id = rows[0]!.id;
        insertedIds.push(id);
        expect(id).toMatch(UUID_RE);
    });

    test('(10) role WITH GRANT EXECUTE succeeds; same role cannot INSERT directly (RLS bypass via SECURITY DEFINER verified)', async () => {
        const { rows } = await withGrantClient.query<{ id: string }>(
            `SELECT public.write_audit_log(
                'GRANT_ROLE_TEST'::text, 'test'::text,
                NULL::uuid, NULL::uuid, NULL::uuid, NULL::text,
                NULL::jsonb, 'INFO'::text
             ) AS id`
        );
        const id = rows[0]!.id;
        insertedIds.push(id);
        expect(id).toMatch(UUID_RE);

        // Sanity: prove the same role CANNOT directly INSERT into audit_logs.
        // The "TO service_role" RLS policy and lack of table-level INSERT
        // grant both block this. We don't care which one bites first — the
        // point is that this role only gets audit_logs writes through the
        // SECURITY DEFINER helper.
        await expect(
            withGrantClient.query(
                `INSERT INTO public.audit_logs (action, entity_type, details)
                 VALUES ('DIRECT_INSERT_FORBIDDEN', 'test', '{}'::jsonb)`
            )
        ).rejects.toThrow(/row-level security|permission denied|policy/i);
    });

    test('(11) role WITHOUT GRANT EXECUTE cannot call the function (PUBLIC has no execute)', async () => {
        await expect(
            noGrantClient.query(
                `SELECT public.write_audit_log('NO_GRANT_TEST'::text, 'test'::text)`
            )
        ).rejects.toThrow(/permission denied/i);
    });

    test('(12) function body has no SELECT capability against audit_logs (write-only contract)', async () => {
        const { rows } = await admin.query<{ def: string }>(
            `SELECT pg_catalog.pg_get_functiondef(p.oid) AS def
             FROM pg_catalog.pg_proc p
             JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'write_audit_log'`
        );
        expect(rows).toHaveLength(1);
        const def = rows[0]!.def;

        expect(def).toMatch(/INSERT\s+INTO\s+public\.audit_logs/i);
        expect(def).not.toMatch(/SELECT[\s\S]+?FROM\s+public\.audit_logs/i);
        expect(def).not.toMatch(/SELECT[\s\S]+?FROM\s+audit_logs/i);
        expect(def).toMatch(/RETURNS\s+uuid/i);
    });
});
