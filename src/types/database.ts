// Database types for ChartSpark

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export type SubscriptionTier = 'starter' | 'pro' | 'complete';

export type FeeCollectionMethod = 'deduct_from_billing' | 'charge_separately';

export type NoteStatus = 'draft' | 'pending_review' | 'signed' | 'amended';

export type EncounterStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export type FeeStatus = 'pending' | 'collected' | 'waived';

export interface Organization {
    id: string;
    name: string;
    slug: string;
    subscription_tier: SubscriptionTier;
    subscription_status: 'active' | 'inactive' | 'trial';
    platform_fee_percentage: number; // Default 1.0
    fee_collection_method: FeeCollectionMethod;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: Role;
    organization_id: string;
    specialty?: string;
    custom_fee_percentage?: number; // Overrides org default if set
    created_at: string;
    updated_at: string;
}

export interface Patient {
    id: string;
    organization_id: string;
    first_name: string;
    last_name: string;
    dob: string;
    gender?: string;
    mrn?: string;
    allergies?: string[];
    status: 'active' | 'inactive' | 'pending';
    created_at: string;
    updated_at: string;
}

export interface Encounter {
    id: string;
    patient_id: string;
    provider_id: string;
    status: EncounterStatus;
    encounter_type: string;
    chief_complaint?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    actual_start?: string;
    actual_end?: string;
    created_at: string;
    updated_at: string;
}

export interface NoteTemplateStructure {
    subjective: { label: string; required: boolean; placeholder?: string };
    objective: { label: string; required: boolean; placeholder?: string };
    assessment: { label: string; required: boolean; placeholder?: string };
    plan: { label: string; required: boolean; placeholder?: string };
}

export interface NoteTemplate {
    id: string;
    organization_id?: string; // null for system templates
    name: string;
    description?: string;
    structure: NoteTemplateStructure;
    cpt_suggestions: string[];
    is_default: boolean;
    is_system: boolean; // Progress Note = system template
    created_by?: string;
    created_at: string;
    updated_at: string;
}

export interface Note {
    id: string;
    encounter_id: string;
    template_id?: string;
    template_type?: string;
    transcript?: string;
    soap_note: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
    billing_codes: string[];
    billing_amount?: number;
    platform_fee?: number;
    fee_percentage?: number;
    status: NoteStatus;
    created_at: string;
    updated_at: string;
}

export interface PlatformFee {
    id: string;
    note_id: string;
    organization_id: string;
    user_id: string;
    billing_amount: number;
    fee_percentage: number;
    fee_amount: number;
    collected_at?: string;
    status: FeeStatus;
    created_at: string;
}

// Billing Dashboard Types
export interface UserBillingStats {
    notes_generated: number;
    total_billing: number;
    codes_used: Record<string, number>;
}

export interface OrgBillingStats {
    organization_id: string;
    organization_name: string;
    total_users: number;
    total_notes: number;
    total_billing: number;
    total_fees: number;
    users: {
        user_id: string;
        user_name: string;
        notes_generated: number;
        billing_amount: number;
        fee_amount: number;
    }[];
}

export interface PlatformBillingStats {
    total_organizations: number;
    total_users: number;
    total_notes: number;
    total_billing: number;
    total_fees_collected: number;
    organizations: OrgBillingStats[];
}
