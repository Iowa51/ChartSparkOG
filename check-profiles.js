const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function checkProfiles() {
    console.log('=== PROFILES TABLE ===');
    const { data, error } = await supabase.from('profiles').select('*').limit(10);

    if (error) {
        console.error('Error:', error.message);
        console.log('\nProfiles table may not exist or has no data.');
    } else if (data && data.length > 0) {
        data.forEach(p => console.log(`- ${p.email || p.id} | Org: ${p.organization_id}`));
    } else {
        console.log('No profiles found. The profiles table is empty.');
    }
}

checkProfiles().then(() => process.exit(0));
