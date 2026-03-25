require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test the age field functionality
async function testAgeField() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('- SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('Testing age field functionality...');
    
    // Test patient ID
    const patientId = '52a554f6-5596-442b-9c8f-6686f4a8b8b6';
    
    // 1. Get current patient data
    console.log('\n1. Fetching current patient data...');
    const { data: patient, error: fetchError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching patient:', fetchError);
      return;
    }
    
    console.log('Current patient data:');
    console.log('- Name:', patient.name);
    console.log('- Current Age:', patient.age);
    console.log('- Date of Birth:', patient.date_of_birth);
    
    // 2. Test updating age field
    console.log('\n2. Testing age field update...');
    const testAge = 25;
    
    const { data: updatedPatient, error: updateError } = await supabase
      .from('patients')
      .update({ 
        age: testAge,
        updated_at: new Date().toISOString()
      })
      .eq('id', patientId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating age:', updateError);
      return;
    }
    
    console.log('Successfully updated age to:', testAge);
    console.log('Updated patient data:');
    console.log('- Name:', updatedPatient.name);
    console.log('- New Age:', updatedPatient.age);
    
    // 3. Verify the update
    console.log('\n3. Verifying the update...');
    const { data: verifiedPatient, error: verifyError } = await supabase
      .from('patients')
      .select('name, age, date_of_birth, updated_at')
      .eq('id', patientId)
      .single();
    
    if (verifyError) {
      console.error('Error verifying update:', verifyError);
      return;
    }
    
    console.log('Verification successful:');
    console.log('- Name:', verifiedPatient.name);
    console.log('- Age:', verifiedPatient.age);
    console.log('- Updated At:', verifiedPatient.updated_at);
    
    console.log('\n✅ Age field functionality test completed successfully!');
    console.log('You can now test the age field in the Edit Patient Information page at:');
    console.log(`http://localhost:3000/patients/${patientId}/edit`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAgeField();
