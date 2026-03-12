import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/home/ragul/Documents/annam2.0/annam5/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        patient:patients(id, patient_id, name, phone, email),
        doctor:doctors(
          id,
          license_number,
          specialization,
          user:users(name, phone, email)
        ),
        prescription_items(
          *,
          medication:medications(id, name, generic_name, strength, selling_price)
        )
      `)
      .limit(1);
  console.log('Error:', JSON.stringify(error, null, 2));
  if (data) console.log('Data OK');
}
run();
