
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPatientDetailed() {
  const term = '0022';
  console.log(`Searching for term: ${term} with .or clause...`);
  const { data, error } = await supabase
    .from('patients')
    .select('id, patient_id, name, phone')
    .or(`patient_id.ilike.%${term}%,phone.ilike.%${term}%,name.ilike.%${term}%`)
    .limit(10); // Check more than 5

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Total matches found (up to 10):', data.length);
  data.forEach((p, idx) => {
    console.log(`${idx + 1}: [${p.patient_id}] ${p.name} (${p.phone})`);
  });
}

checkPatientDetailed();
