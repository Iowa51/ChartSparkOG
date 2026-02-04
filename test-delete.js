require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Use SERVICE ROLE to bypass RLS
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDelete() {
    // First get notes
    const { data: notes, error: fetchError } = await supabase
        .from('clinical_notes')
        .select('id, status, organization_id, patient_id')
        .limit(5);

    console.log('Current notes in database:');
    console.log(JSON.stringify(notes, null, 2));
    console.log('Fetch error:', fetchError);
    console.log('Total notes found:', notes?.length || 0);

    if (!notes || notes.length === 0) {
        console.log('\nNo notes to delete!');
        return;
    }

    // Try deleting the first note
    const noteToDelete = notes[0];
    console.log('\nAttempting to delete note:', noteToDelete.id);

    const { data: deleteResult, error: deleteError } = await supabase
        .from('clinical_notes')
        .delete()
        .eq('id', noteToDelete.id)
        .select();

    console.log('Delete result:', deleteResult);
    console.log('Delete error:', deleteError);

    // Check if it was deleted
    const { data: checkNotes } = await supabase
        .from('clinical_notes')
        .select('id')
        .eq('id', noteToDelete.id);

    if (checkNotes && checkNotes.length === 0) {
        console.log('✅ Note was successfully deleted!');
    } else {
        console.log('❌ Note still exists after delete attempt');
    }
}

testDelete().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
