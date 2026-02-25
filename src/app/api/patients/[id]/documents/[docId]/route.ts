// src/app/api/patients/[id]/documents/[docId]/route.ts
// Individual document operations: signed URL for viewing and delete
// HIPAA-compliant with audit logging

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth/api-auth';
import { createClient } from '@/lib/supabase/server';
import { logPHIAccess } from '@/lib/security/audit-log';
import { getRequestMetadata } from '@/lib/utils/get-client-ip';
import { logError, sanitizeError } from '@/lib/logging/safe-logger';

/**
 * GET /api/patients/[id]/documents/[docId]
 * Returns a temporary signed URL for viewing/downloading the document
 */
async function handleGet(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const patientId = context.params?.id;
        const docId = context.params?.docId;

        if (!patientId || !docId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        // Fetch the document record (RLS enforces org scope)
        const { data: doc, error } = await supabase
            .from('patient_documents')
            .select('*')
            .eq('id', docId)
            .eq('patient_id', patientId)
            .single();

        if (error || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Generate a signed URL valid for 1 hour
        const { data: signedUrl, error: urlError } = await supabase.storage
            .from('patient-documents')
            .createSignedUrl(doc.file_path, 3600); // 1 hour

        if (urlError || !signedUrl) {
            logError({ action: 'DOCUMENT_SIGNED_URL_ERROR', error: sanitizeError(urlError) });
            return NextResponse.json({ error: 'Failed to generate view URL' }, { status: 500 });
        }

        // HIPAA audit — viewing PHI document
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
            'PATIENT',
            patientId,
            'VIEW',
            ipAddress,
            userAgent
        );

        return NextResponse.json({
            url: signedUrl.signedUrl,
            fileName: doc.file_name,
            mimeType: doc.mime_type,
            expiresIn: 3600,
        });
    } catch (error) {
        logError({ action: 'DOCUMENT_VIEW_EXCEPTION', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to retrieve document' }, { status: 500 });
    }
}

/**
 * DELETE /api/patients/[id]/documents/[docId]
 * Remove a document (storage file + database record)
 */
async function handleDelete(context: AuthContext) {
    const { ipAddress, userAgent } = getRequestMetadata(context.request);

    try {
        const patientId = context.params?.id;
        const docId = context.params?.docId;

        if (!patientId || !docId) {
            return NextResponse.json({ error: 'Missing IDs' }, { status: 400 });
        }

        const supabase = await createClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
        }

        // Fetch the document to get file_path before deleting
        const { data: doc, error: fetchError } = await supabase
            .from('patient_documents')
            .select('id, file_path, uploaded_by')
            .eq('id', docId)
            .eq('patient_id', patientId)
            .single();

        if (fetchError || !doc) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        // Only the uploader or an admin can delete
        if (doc.uploaded_by !== context.user.id && !['ADMIN', 'SUPER_ADMIN'].includes(context.user.role)) {
            return NextResponse.json({ error: 'Not authorized to delete this document' }, { status: 403 });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from('patient-documents')
            .remove([doc.file_path]);

        if (storageError) {
            logError({ action: 'DOCUMENT_STORAGE_DELETE_ERROR', error: sanitizeError(storageError) });
            // Continue to delete DB record even if storage fails
        }

        // Delete database record
        const { error: deleteError } = await supabase
            .from('patient_documents')
            .delete()
            .eq('id', docId);

        if (deleteError) {
            logError({ action: 'DOCUMENT_DB_DELETE_ERROR', error: sanitizeError(deleteError) });
            return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
        }

        // HIPAA audit — deleting PHI document
        await logPHIAccess(
            context.user.id,
            context.user.email,
            context.user.role,
            context.user.organizationId || '',
            'PATIENT',
            patientId,
            'DELETE',
            ipAddress,
            userAgent
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({ action: 'DOCUMENT_DELETE_EXCEPTION', error: sanitizeError(error) });
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}

export const GET = withAuth(handleGet, { requireOrganization: true });
export const DELETE = withAuth(handleDelete, { requireOrganization: true });
