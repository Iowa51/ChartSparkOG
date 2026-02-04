const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function compareIds() {
    // Get Auth users
    const { data: authData } = await supabase.auth.admin.listUsers();

    // Get users table
    const { data: tableUsers } = await supabase.from('users').select('id, email');

    console.log('=== ID COMPARISON ===\n');

    const emails = ['super@chartspark.com', 'admin@chartspark.com', 'auditor@chartspark.com', 'clinician@chartspark.com'];

    emails.forEach(email => {
        const authUser = authData.users.find(u => u.email === email);
        const tableUser = tableUsers.find(u => u.email === email);

        const authId = authUser?.id || 'NOT FOUND';
        const tableId = tableUser?.id || 'NOT FOUND';
        const match = authId === tableId ? '✅' : '❌ MISMATCH';

        console.log(`${email}:`);
        console.log(`  Auth ID:  ${authId}`);
        console.log(`  Table ID: ${tableId}`);
        console.log(`  Status:   ${match}\n`);
    });
}

compareIds().then(() => process.exit(0));
