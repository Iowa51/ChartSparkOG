// src/lib/audit/audit-service.ts
// F-028: Consolidated - re-exports from the primary audit logging service
// All audit logging now goes through src/lib/security/audit-log.ts

export {
    logAuditEvent as createAuditLog,
    logAuditEventAsync,
    logPHIAccess,
    logLoginAttempt as logAuthEvent,
    logSecurityEvent,
    type AuditEventType as AuditAction,
    type RiskLevel,
    type AuditLogEntry,
} from '@/lib/security/audit-log';
