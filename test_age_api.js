require('dotenv').config({ path: '.env.local' });

// Test the API endpoint for updating patient age
async function testPatientAgeAPI() {
  const baseUrl = 'http://localhost:3000';
  const patientId = '52a554f6-5596-442b-9c8f-6686f4a8b8b6';
  
  try {
    console.log('Testing Patient Age API Update...');
    
    // Test data with age field
    const updateData = {
      firstName: 'VISHAK',
      lastName: 'S',
      age: '26', // Test as string (how it comes from frontend)
      gender: 'male',
      phone: '9876543210'
    };
    
    console.log('\nSending update request with data:');
    console.log(JSON.stringify(updateData, null, 2));
    
    const response = await fetch(`${baseUrl}/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', response.status, errorData);
      return;
    }
    
    const result = await response.json();
    console.log('\n✅ API Update Successful!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
    // Test fetching the updated patient
    console.log('\nFetching updated patient data...');
    const getResponse = await fetch(`${baseUrl}/api/patients/${patientId}`);
    
    if (!getResponse.ok) {
      console.error('❌ Fetch Error:', getResponse.status);
      return;
    }
    
    const getResult = await getResponse.json();
    console.log('✅ Patient Data Retrieved:');
    console.log('- Name:', getResult.patient.name);
    console.log('- Age:', getResult.patient.age);
    console.log('- Gender:', getResult.patient.gender);
    console.log('- Phone:', getResult.patient.phone);
    
    console.log('\n🎉 Age field API test completed successfully!');
    console.log(`Visit: ${baseUrl}/patients/${patientId}/edit to test the frontend`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPatientAgeAPI();
