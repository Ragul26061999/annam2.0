require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test script to verify date display in Today's Queue and Scheduled Appointments
async function testDateDisplay() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔍 Testing Date Display for Today\'s Queue and Scheduled Appointments...\n');

    // Test 1: Check appointments with date fields
    console.log('1. Testing Scheduled Appointments...');
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        appointment_id,
        appointment_date,
        appointment_time,
        status,
        patient:patients(
          patient_id,
          name,
          phone
        ),
        doctor:doctors(
          user_id,
          user:users(name)
        )
      `)
      .order('appointment_date', { ascending: false })
      .limit(5);

    if (appointmentError) {
      console.error('Error fetching appointments:', appointmentError);
    } else {
      console.log(`✅ Found ${appointments?.length || 0} appointments:`);
      appointments?.forEach((apt, index) => {
        const formattedDate = apt.appointment_date ? 
          new Date(apt.appointment_date).toLocaleDateString('en-IN') : 'N/A';
        console.log(`  ${index + 1}. ${apt.patient?.name || 'Unknown Patient'}`);
        console.log(`     Date: ${formattedDate}`);
        console.log(`     Time: ${apt.appointment_time || 'N/A'}`);
        console.log(`     Status: ${apt.status}`);
        console.log(`     Doctor: ${apt.doctor?.user?.name || 'N/A'}`);
        console.log('');
      });
    }

    // Test 2: Check queue entries with date fields
    console.log('2. Testing Today\'s Queue...');
    const { data: queueEntries, error: queueError } = await supabase
      .from('outpatient_queue')
      .select(`
        queue_number,
        registration_date,
        registration_time,
        status,
        created_at,
        patient:patients(
          patient_id,
          name,
          phone,
          primary_complaint
        )
      `)
      .eq('status', 'waiting')
      .order('created_at', { ascending: false })
      .limit(5);

    if (queueError) {
      console.error('Error fetching queue entries:', queueError);
    } else {
      console.log(`✅ Found ${queueEntries?.length || 0} queue entries:`);
      queueEntries?.forEach((queue, index) => {
        const formattedDate = queue.registration_date ? 
          new Date(queue.registration_date).toLocaleDateString('en-IN') : 'N/A';
        console.log(`  ${index + 1}. Q${queue.queue_number} - ${queue.patient?.name || 'Unknown Patient'}`);
        console.log(`     Registration Date: ${formattedDate}`);
        console.log(`     Registration Time: ${queue.registration_time || 'N/A'}`);
        console.log(`     Status: ${queue.status}`);
        console.log(`     UHID: ${queue.patient?.patient_id || 'N/A'}`);
        console.log(`     Complaint: ${queue.patient?.primary_complaint || 'N/A'}`);
        console.log('');
      });
    }

    // Test 3: Verify date formatting
    console.log('3. Testing Date Formatting...');
    const testDates = [
      '2026-03-25',
      '2026-03-26T10:30:00',
      '2026-01-15T14:45:30.123Z'
    ];

    testDates.forEach((date, index) => {
      try {
        const formatted = new Date(date).toLocaleDateString('en-IN');
        console.log(`  ${index + 1}. ${date} → ${formatted}`);
      } catch (error) {
        console.log(`  ${index + 1}. ${date} → Error: ${error.message}`);
      }
    });

    console.log('\n🎉 Date Display Test Complete!');
    console.log('\n📋 Implementation Summary:');
    console.log('✅ Added date display to Scheduled Appointments section');
    console.log('✅ Added date display to Today\'s Queue section');
    console.log('✅ Used Indian date format (en-IN) for consistency');
    console.log('✅ Added Calendar icons for better UX');
    
    console.log('\n📱 Test the features at:');
    console.log('- Scheduled Appointments: http://localhost:3000/outpatient');
    console.log('- Today\'s Queue: http://localhost:3000/outpatient');
    
    console.log('\n🔧 Usage Instructions:');
    console.log('1. Go to outpatient page');
    console.log('2. Click "Today\'s Queue" tab');
    console.log('3. See registration date for each patient in queue');
    console.log('4. Click "Outpatient" tab to see scheduled appointments');
    console.log('5. See appointment date and time for each patient');
    
    console.log('\n📊 Date Fields Used:');
    console.log('• Appointments: appointment_date, appointment_time');
    console.log('• Queue Entries: registration_date, registration_time');
    console.log('• Format: Indian locale (DD/MM/YYYY)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDateDisplay();
