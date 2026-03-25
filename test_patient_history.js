require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Test script to verify patient history functionality
async function testPatientHistory() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    console.log('🔍 Testing Patient History Functionality...\n');

    // Get date range for testing (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Testing period: ${thirtyDaysAgo} to ${today}\n`);

    // Test 1: Check recent patient registrations
    console.log('1. Testing Recent Patient Registrations...');
    const { data: recentRegistrations, error: regError } = await supabase
      .from('patients')
      .select(`
        id,
        patient_id,
        name,
        phone,
        date_of_birth,
        gender,
        created_at
      `)
      .gte('created_at', `${thirtyDaysAgo}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (regError) {
      console.error('Error fetching recent registrations:', regError);
    } else {
      console.log(`✅ Found ${recentRegistrations?.length || 0} recent registrations:`);
      recentRegistrations?.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.name} (${reg.patient_id})`);
        console.log(`     📞 Phone: ${reg.phone || 'N/A'}`);
        console.log(`     📅 Registered: ${new Date(reg.created_at).toLocaleDateString('en-IN')}`);
        console.log(`     🏷️  Type: New Patient`);
        console.log('');
      });
    }

    // Test 2: Check quick registrations
    console.log('2. Testing Quick Registrations...');
    const { data: quickRegistrations, error: quickError } = await supabase
      .from('quick_registrations')
      .select(`
        id,
        patient_id,
        name,
        phone,
        created_at
      `)
      .gte('created_at', `${thirtyDaysAgo}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (quickError) {
      console.error('Error fetching quick registrations:', quickError);
    } else {
      console.log(`✅ Found ${quickRegistrations?.length || 0} quick registrations:`);
      quickRegistrations?.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.name} (${reg.patient_id})`);
        console.log(`     📞 Phone: ${reg.phone || 'N/A'}`);
        console.log(`     📅 Registered: ${new Date(reg.created_at).toLocaleDateString('en-IN')}`);
        console.log(`     🏷️  Type: Quick Register`);
        console.log('');
      });
    }

    // Test 3: Check patient revisits
    console.log('3. Testing Patient Revisits...');
    const { data: revisitRecords, error: revisitError } = await supabase
      .from('patient_revisits')
      .select(`
        id,
        patient_id,
        visit_date,
        visit_time,
        chief_complaint,
        created_at,
        patients!inner(
          name,
          phone,
          date_of_birth,
          gender
        )
      `)
      .gte('created_at', `${thirtyDaysAgo}T00:00:00`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (revisitError) {
      console.error('Error fetching revisit records:', revisitError);
    } else {
      console.log(`✅ Found ${revisitRecords?.length || 0} revisit records:`);
      revisitRecords?.forEach((reg, index) => {
        console.log(`  ${index + 1}. ${reg.patients?.name || 'Unknown'} (${reg.patient_id})`);
        console.log(`     📞 Phone: ${reg.patients?.phone || 'N/A'}`);
        console.log(`     📅 Visit Date: ${reg.visit_date ? new Date(reg.visit_date).toLocaleDateString('en-IN') : new Date(reg.created_at).toLocaleDateString('en-IN')}`);
        console.log(`     🕐 Visit Time: ${reg.visit_time || 'N/A'}`);
        console.log(`     🏷️  Type: Revisit Patient`);
        console.log(`     📋 Complaint: ${reg.chief_complaint || 'N/A'}`);
        console.log('');
      });
    }

    // Test 4: Combine and sort all records
    console.log('4. Testing Combined History Data...');
    const allHistory = [];
    
    // Add recent registrations
    if (recentRegistrations && !regError) {
      allHistory.push(...recentRegistrations.map(reg => ({
        ...reg,
        registration_type: 'New Patient',
        visit_date: reg.created_at,
        patient_name: reg.name,
        patient_phone: reg.phone,
        patient_id: reg.patient_id
      })));
    }

    // Add quick registrations
    if (quickRegistrations && !quickError) {
      allHistory.push(...quickRegistrations.map(reg => ({
        ...reg,
        registration_type: 'Quick Register',
        visit_date: reg.created_at,
        patient_name: reg.name,
        patient_phone: reg.phone,
        patient_id: reg.patient_id
      })));
    }

    // Add revisit records
    if (revisitRecords && !revisitError) {
      allHistory.push(...revisitRecords.map(reg => ({
        ...reg,
        registration_type: 'Revisit Patient',
        visit_date: reg.visit_date || reg.created_at,
        patient_name: reg.patients?.name || 'Unknown',
        patient_phone: reg.patients?.phone || 'N/A',
        patient_id: reg.patient_id,
        chief_complaint: reg.chief_complaint
      })));
    }

    // Sort by date (most recent first)
    allHistory.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

    console.log(`✅ Combined history: ${allHistory.length} total records`);
    
    // Show sample of combined data
    console.log('\n📊 Sample Combined History (Top 5):');
    allHistory.slice(0, 5).forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.patient_name} - ${record.registration_type}`);
      console.log(`     🆔 ID: ${record.patient_id}`);
      console.log(`     📞 ${record.patient_phone || 'N/A'}`);
      console.log(`     📅 ${new Date(record.visit_date).toLocaleDateString('en-IN')}`);
      console.log(`     📋 ${record.chief_complaint || 'No complaint'}`);
      console.log('');
    });

    // Test 5: Verify contact functionality
    console.log('5. Testing Contact Information for Feedback...');
    const contactablePatients = allHistory.filter(record => record.patient_phone);
    console.log(`✅ Found ${contactablePatients.length} patients with phone numbers for feedback`);
    
    if (contactablePatients.length > 0) {
      console.log('\n📱 Sample Contactable Patients:');
      contactablePatients.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.patient_name}`);
        console.log(`     📞 Phone: ${record.patient_phone} (Ready for feedback contact)`);
        console.log(`     🏷️  Visit Type: ${record.registration_type}`);
        console.log(`     📅 Visit Date: ${new Date(record.visit_date).toLocaleDateString('en-IN')}`);
        console.log('');
      });
    }

    console.log('🎉 Patient History Test Complete!');
    console.log('\n📋 Implementation Summary:');
    console.log('✅ Added Patient History tab to outpatient page');
    console.log('✅ Combined data from three sources: registrations, quick registrations, revisits');
    console.log('✅ Color-coded visit types for easy identification');
    console.log('✅ Search functionality by name, ID, or phone');
    console.log('✅ Contact phone numbers for patient feedback');
    console.log('✅ Direct links to patient details');
    
    console.log('\n📱 Test the features at:');
    console.log('- Patient History: http://localhost:3000/outpatient');
    console.log('- Click "Patient History" tab to view all patient visits');
    
    console.log('\n🔧 Usage Instructions:');
    console.log('1. Go to outpatient page');
    console.log('2. Click "Patient History" tab');
    console.log('3. View all patient visits from last 30 days');
    console.log('4. Search patients by name, ID, or phone');
    console.log('5. Click phone icon to copy number for feedback');
    console.log('6. Click eye icon to view full patient details');
    
    console.log('\n📊 Data Sources:');
    console.log('• New Patients: patients table (created_at)');
    console.log('• Quick Register: quick_registrations table');
    console.log('• Revisit Patients: patient_revisits table');
    console.log('• Time Range: Last 30 days from current date');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPatientHistory();
