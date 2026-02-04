require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeDemo() {
    // Get all patients
    const { data: patients, error: fetchError } = await supabase
        .from('patients')
        .select('id, first_name, last_name');

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    console.log('Current patients:');
    patients.forEach(p => console.log(`  - ${p.first_name} ${p.last_name} (${p.id})`));
    console.log(`\nTotal: ${patients.length} patients`);

    if (patients.length === 0) {
        console.log('No patients to delete.');
        return;
    }

    // Delete all notes first (foreign key constraint)
    console.log('\nDeleting all clinical notes...');
    const { error: notesError, data: deletedNotes } = await supabase
        .from('clinical_notes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        .select();

    if (notesError) {
        console.error('Notes delete error:', notesError);
    } else {
        console.log(`Deleted ${deletedNotes?.length || 0} notes.`);
    }

    // Delete all patients
    console.log('\nDeleting all patients...');
    const { error: patientsError, data: deletedPatients } = await supabase
        .from('patients')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all
        .select();

    if (patientsError) {
        console.error('Patients delete error:', patientsError);
    } else {
        console.log(`Deleted ${deletedPatients?.length || 0} patients.`);
    }

    console.log('\n✅ Done! All demo data removed.');
}

removeDemo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
