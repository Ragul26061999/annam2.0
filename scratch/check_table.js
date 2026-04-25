
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
  console.log('Checking for table uploaded_bills...');
  try {
    const { data, error } = await supabase
      .from('uploaded_bills')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
      if (error.code === '42P01') {
        console.error('Table "uploaded_bills" does not exist!');
      }
    } else {
      console.log('Table exists. Data:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTable();
