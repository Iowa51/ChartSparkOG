require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNotes() {
    console.log('Checking clinical_notes table...\n');

    const { data, error } = await supabase
        .from('clinical_notes')
        .select('id, patient_id, content, status, organization_id, created_at')
        .limit(5);

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log(`Found ${data?.length || 0} notes:\n`);

    if (data && data.length > 0) {
        data.forEach((note, i) => {
            console.log(`Note ${i + 1}:`);
            console.log(`  ID: ${note.id}`);
            console.log(`  Patient ID: ${note.patient_id}`);
            console.log(`  Status: ${note.status}`);
            console.log(`  Org ID: ${note.organization_id}`);
            console.log(`  Content: ${note.content?.substring(0, 100)}...`);
            console.log(`  Created: ${note.created_at}`);
            console.log('');
        });
    } else {
        console.log('No notes found in the database.');
    }
}

checkNotes().then(() => process.exit(0));
