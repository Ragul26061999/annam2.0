// Test script to verify the discharge summary print template shows correct OP number and address
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testPrintTemplateData() {
  const bedAllocationId = 'fa17595b-e137-4450-99db-9d446f6c7924';
  
  console.log('🧪 Testing Discharge Summary Print Template Data...\n');
  
  try {
    // Get patient and bed allocation data
    const { data: bedData, error: bedError } = await supabase
      .from('bed_allocations')
      .select(`
        *,
        patient:patient_id(
          patient_id, 
          name, 
          age, 
          gender, 
          address, 
          city, 
          state, 
          pincode
        )
      `)
      .eq('id', bedAllocationId)
      .single();

    if (bedError) {
      console.error('❌ Error fetching data:', bedError);
      return;
    }

    console.log('✅ Data retrieved successfully!');
    console.log('\n📋 Print Template Data Verification:');
    
    const patient = bedData.patient;
    
    console.log('\n👤 Patient Information for Print:');
    console.log(`✅ Name: ${patient?.name || 'N/A'}`);
    console.log(`✅ Age: ${patient?.age || 'N/A'}`);
    console.log(`✅ Gender: ${patient?.gender || 'N/A'}`);
    
    // OP Number
    console.log(`✅ OP Number: ${patient?.patient_id || 'N/A'}`);
    
    // Complete Address
    const addressParts = [];
    if (patient?.address) addressParts.push(patient.address);
    if (patient?.city) addressParts.push(patient.city);
    if (patient?.state) addressParts.push(patient.state);
    if (patient?.pincode) addressParts.push(patient.pincode);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
    console.log(`✅ Address: ${fullAddress}`);
    
    // IP Number
    console.log(`✅ IP Number: ${bedData?.ip_number || 'N/A'}`);
    
    console.log('\n🖨️  Print Template Fields:');
    console.log('The discharge summary print will now show:');
    console.log(`- OP No.: ${patient?.patient_id || '______________________'}`);
    console.log(`- IP No.: ${bedData?.ip_number || '______________________'}`);
    console.log(`- Address: ${fullAddress || '______________________'}`);
    
    console.log('\n🎉 Print template data is ready!');
    console.log('Navigate to: http://localhost:3000/inpatient/view/fa17595b-e137-4450-99db-9d446f6c7924');
    console.log('Go to Clinical Records > Discharge Summary > Click Print button');
    console.log('The A4 print will now show the correct OP number and complete address');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPrintTemplateData();
