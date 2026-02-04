const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://eepwbtdqtdnqxeznykbh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlcHdidGRxdGRucXhlem55a2JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzY2MjEwMiwiZXhwIjoyMDgzMjM4MTAyfQ.BE6V6hjTCguYwFGpUw51qQf9XidydA4B__fN9BeKfr0'
);

async function addColumn() {
    console.log('Adding avatar_color column to patients table...');

    // Use raw SQL via rpc or run directly in Supabase dashboard
    const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_color TEXT;`
    });

    if (error) {
        console.log('RPC not available. Please run this SQL in Supabase Dashboard:');
        console.log('');
        console.log('ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_color TEXT;');
        console.log('');
        console.log('Go to: https://supabase.com/dashboard/project/eepwbtdqtdnqxeznykbh/sql/new');
    } else {
        console.log('✅ Column added successfully!');
    }
}

addColumn().then(() => process.exit(0));
