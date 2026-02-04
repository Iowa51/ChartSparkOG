const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function testLogin() {
    const email = 'clinician@chartspark.com';
    const password = 'Demo123!!';

    console.log(`Testing login for ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.log('❌ Login FAILED:', error.message);
    } else {
        console.log('✅ Login SUCCESS!');
        console.log('User ID:', data.user?.id);
        console.log('Email:', data.user?.email);
    }
}

testLogin().then(() => process.exit(0));
