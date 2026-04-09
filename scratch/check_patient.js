
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPatient() {
  console.log('Searching for patient with name ilike MRS. SHANMUGA SUNDARI G...');
  const { data, error } = await supabase
    .from('patients')
    .select('id, patient_id, name, phone')
    .ilike('name', '%SHANMUGA SUNDARI G%')
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Results:', JSON.stringify(data, null, 2));

  console.log('\nSearching for patient with patient_id ilike %0022%...');
  const { data: data2, error: error2 } = await supabase
    .from('patients')
    .select('id, patient_id, name, phone')
    .ilike('patient_id', '%0022%')
    .limit(5);

  if (error2) {
    console.error('Error2:', error2);
    return;
  }

  console.log('Results2:', JSON.stringify(data2, null, 2));
}

checkPatient();
