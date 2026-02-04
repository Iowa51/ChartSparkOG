const { createClient } = require('@supabase/supabase-js');

// Test with ANON key (what the app uses)
const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjIxMDIsImV4cCI6MjA4MzIzODEwMn0.097itcPk0rX4drbzKSqkTL0mT1qeIxsDVdtJO6kWekQ'
);

async function testAsUser() {
    // Sign in as clinician
    const { data: auth, error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'clinician@chartspark.com',
        password: 'Demo123!!'
    });

    if (loginErr) {
        console.error('Login failed:', loginErr.message);
        return;
    }

    console.log('Logged in as:', auth.user.email);

    // Now try to fetch patients
    const { data: patients, error, count } = await supabase
        .from('patients')
        .select('*', { count: 'exact' })
        .eq('organization_id', '550e8400-e29b-41d4-a716-446655440000');

    console.log('\n=== PATIENTS QUERY ===');
    if (error) {
        console.error('Error:', error.message);
        console.error('Code:', error.code);
        console.error('Details:', error.details);
    } else {
        console.log('Count:', count);
        console.log('Patients:', patients?.length || 0);
        if (patients) {
            patients.forEach(p => console.log(`- ${p.first_name} ${p.last_name}`));
        }
    }
}

testAsUser().then(() => process.exit(0));
