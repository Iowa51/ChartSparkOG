const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function checkAuthUsers() {
    console.log('Checking Supabase Auth users...');
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error.message);
        return;
    }

    console.log('\n=== AUTH USERS ===');
    if (data.users && data.users.length > 0) {
        data.users.forEach(u => {
            console.log(`- ${u.email} | ID: ${u.id} | Created: ${u.created_at}`);
        });
    } else {
        console.log('No users found in Supabase Auth.');
    }
}

checkAuthUsers().then(() => process.exit(0));
