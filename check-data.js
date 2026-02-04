const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function checkData() {
    // Check patients
    console.log('=== ALL PATIENTS ===');
    const { data: patients, error: pError } = await supabase
        .from('patients')
        .select('id, first_name, last_name, organization_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (pError) console.error('Patients error:', pError.message);
    else if (patients && patients.length > 0) {
        patients.forEach(p => console.log(`- ${p.first_name} ${p.last_name} | Org: ${p.organization_id} | Status: ${p.status}`));
    } else {
        console.log('No patients found');
    }

    // Check users and their organizations
    console.log('\n=== USERS & ORGS ===');
    const { data: users } = await supabase
        .from('users')
        .select('email, organization_id, role');

    if (users) {
        users.forEach(u => console.log(`- ${u.email} | Org: ${u.organization_id} | Role: ${u.role}`));
    }
}

checkData().then(() => process.exit(0));
