require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDelete() {
    // First get a note
    const { data: notes, error: fetchError } = await supabase
        .from('clinical_notes')
        .select('id, status, organization_id')
        .limit(1);

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log('Found note:', notes[0]);

    if (!notes || notes.length === 0) {
        console.log('No notes to test with');
        return;
    }

    const noteId = notes[0].id;
    const orgId = notes[0].organization_id;

    // Try to update status
    const { error: updateError } = await supabase
        .from('clinical_notes')
        .update({ status: 'deleted' })
        .eq('id', noteId)
        .eq('organization_id', orgId);

    if (updateError) {
        console.error('Update error:', updateError);
    } else {
        console.log('Update successful!');

        // Restore it
        await supabase
            .from('clinical_notes')
            .update({ status: 'draft' })
            .eq('id', noteId);
        console.log('Restored note to draft status');
    }
}

testDelete().then(() => process.exit(0));
