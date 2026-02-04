const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function checkUsers() {
    console.log('Checking users table...');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, email, role, first_name, last_name, is_active');

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('\n=== EXISTING USERS ===');
    if (users && users.length > 0) {
        users.forEach(u => {
            console.log(`- ${u.email} | Role: ${u.role} | Active: ${u.is_active}`);
        });
    } else {
        console.log('No users found in the users table.');
    }

    // Check organizations
    console.log('\n=== ORGANIZATIONS ===');
    const { data: orgs, error: orgErr } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(5);

    if (orgs && orgs.length > 0) {
        orgs.forEach(o => console.log(`- ${o.name} (${o.id})`));
    } else {
        console.log('No organizations found.');
    }
}

checkUsers().then(() => process.exit(0));
