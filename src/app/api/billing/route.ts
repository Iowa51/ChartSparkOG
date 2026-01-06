import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const { data: billing, error } = await supabase.from('billing').select(`
      *,
      patient:patients(id, first_name, last_name),
      provider:profiles(id, first_name, last_name)
    `).eq('organization_id', profile.organization_id).order('service_date', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ billing });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch billing' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        const billingData = await request.json();
        const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const { data: billing, error } = await supabase.from('billing').insert([{
            ...billingData,
            organization_id: profile.organization_id,
            provider_id: user.id,
            invoice_number: invoiceNumber,
            outstanding_balance: billingData.amount
        }]).select().single();

        if (error) throw error;
        return NextResponse.json({ billing }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 });
    }
}
