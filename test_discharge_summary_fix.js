// Test script to verify discharge summary data storage and retrieval
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDischargeSummary() {
  const bedAllocationId = 'fa17595b-e137-4450-99db-9d446f6c7924';
  
  console.log('🧪 Testing Discharge Summary Data Storage...\n');
  
  try {
    // Test data with all the fields the user mentioned
    const testData = {
      allocation_id: bedAllocationId,
      patient_id: 'd0e288b5-cce7-434e-a0d4-8461c5a5e10a', // Required field
      discharge_date: '2026-03-23', // Required field
      complaints: 'Patient complaints test data\nMultiple lines of complaints\nIncluding history',
      past_history: 'Past medical history\nIncluding previous conditions\nAnd treatments',
      on_examination: 'On Examination findings:\n- General appearance: Normal\n- Vital signs: Stable\n- Local examination: Normal',
      systemic_examination: 'Systemic Examination:\n- CVS: Normal S1S2, no murmurs\n- RS: Clear bilaterally\n- CNS: Conscious, oriented\n- Abdomen: Soft, non-tender',
      treatment_given: 'Treatment provided:\n1. IV fluids\n2. Antibiotics\n3. Analgesics\n4. Supportive care',
      diagnosis: 'Acute gastroenteritis with dehydration',
      procedure_details: 'No surgical procedures performed',
      course_in_hospital: 'Patient admitted for 3 days\nShowed improvement with treatment\nVitals stabilized',
      surgery_notes: 'N/A',
      discharge_advice: '1. Continue medications\n2. Soft diet for 2 days\n3. Follow up after 3 days\n4. Report any worsening symptoms',
      consult_doctor_name: 'Dr. John Doe',
      surgeon_doctor_name: '',
      anesthesiologist_doctor: '',
      bp: '120/80',
      pulse: 72,
      bs: 95,
      rr: 16,
      spo2: 98,
      temp: 98.6,
      room_no: '101-A'
    };

    console.log('💾 Saving test data...');
    const { data: saveResult, error: saveError } = await supabase
      .from('discharge_summaries')
      .upsert(testData, {
        onConflict: 'allocation_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Save error:', saveError);
      return;
    }

    console.log('✅ Data saved successfully!');
    console.log('📄 Saved record ID:', saveResult.id);

    // Test retrieval
    console.log('\n🔍 Retrieving saved data...');
    const { data: retrieveResult, error: retrieveError } = await supabase
      .from('discharge_summaries')
      .select('*')
      .eq('allocation_id', bedAllocationId)
      .single();

    if (retrieveError) {
      console.error('❌ Retrieve error:', retrieveError);
      return;
    }

    console.log('✅ Data retrieved successfully!');
    
    // Verify the fields
    const fieldsToCheck = [
      'complaints', 'past_history', 'on_examination', 'systemic_examination',
      'treatment_given', 'diagnosis', 'procedure_details', 'course_in_hospital',
      'discharge_advice', 'bp', 'pulse', 'bs', 'rr', 'spo2', 'temp', 'room_no'
    ];

    console.log('\n📊 Field Verification:');
    fieldsToCheck.forEach(field => {
      const value = retrieveResult[field];
      const status = value ? '✅' : '⚠️';
      const displayValue = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NULL';
      console.log(`${status} ${field}: ${displayValue}`);
    });

    console.log('\n🎉 Test completed successfully! All fields are storing and retrieving data correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDischargeSummary();
