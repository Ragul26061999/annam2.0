// Test script to simulate the exact frontend request and debug the issue
const testFrontendRequest = async () => {
  try {
    console.log('=== SIMULATING FRONTEND REQUEST ===');
    
    // This simulates the exact data structure that PatientEditForm sends
    const frontendData = {
      firstName: 'Ragul',
      lastName: 'Test',
      dateOfBirth: '2000-01-01',
      age: '26',  // Note: This is a string from the frontend
      gender: 'male',
      phone: '1234567890',
      email: 'ragul@example.com',
      address: '123 Test Address',
      maritalStatus: 'single',
      bloodGroup: 'O+',
      allergies: 'None',
      medicalHistory: 'None',
      currentMedications: 'None',
      chronicConditions: 'None',
      previousSurgeries: 'None',
      primaryComplaint: 'Test complaint',
      initialSymptoms: 'Test symptoms',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianAddress: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      insuranceProvider: '',
      insuranceNumber: '',
      referredBy: '',
      status: 'active'
    };

    console.log('Frontend data:', JSON.stringify(frontendData, null, 2));

    // Simulate the data transformation that happens in the frontend
    const patientUpdateData = {
      firstName: frontendData.firstName,
      lastName: frontendData.lastName,
      dateOfBirth: frontendData.dateOfBirth,
      age: frontendData.age ? parseInt(frontendData.age, 10) : undefined,
      gender: frontendData.gender,
      phone: frontendData.phone,
      email: frontendData.email,
      address: frontendData.address,
      maritalStatus: frontendData.maritalStatus,
      bloodGroup: frontendData.bloodGroup,
      allergies: frontendData.allergies,
      medicalHistory: frontendData.medicalHistory,
      currentMedications: frontendData.currentMedications,
      chronicConditions: frontendData.chronicConditions,
      previousSurgeries: frontendData.previousSurgeries,
      primaryComplaint: frontendData.primaryComplaint,
      initialSymptoms: frontendData.initialSymptoms,
      guardianName: frontendData.guardianName,
      guardianRelationship: frontendData.guardianRelationship,
      guardianPhone: frontendData.guardianPhone,
      guardianAddress: frontendData.guardianAddress,
      emergencyContactName: frontendData.emergencyContactName,
      emergencyContactPhone: frontendData.emergencyContactPhone,
      emergencyContactRelationship: frontendData.emergencyContactRelationship,
      insuranceProvider: frontendData.insuranceProvider,
      insuranceNumber: frontendData.insuranceNumber,
      referredBy: frontendData.referredBy,
      status: frontendData.status || 'active'
    };

    console.log('Patient update data:', JSON.stringify(patientUpdateData, null, 2));

    // Simulate the data cleaning
    const cleanedUpdateData = { ...patientUpdateData };
    Object.keys(cleanedUpdateData).forEach((key) => {
      if (cleanedUpdateData[key] === undefined || cleanedUpdateData[key] === '') {
        delete cleanedUpdateData[key];
      }
    });

    console.log('Cleaned update data:', JSON.stringify(cleanedUpdateData, null, 2));

    // Make the actual API call
    const patientId = 'caec8dde-cb89-4366-b95d-6d996c6601cd';
    console.log('Making API call to:', `/api/patients/${patientId}`);
    
    const response = await fetch(`http://localhost:3000/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedUpdateData),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      const responseText = await response.text();
      console.error('Response text:', responseText);
      return { success: false, error: errorData, responseText };
    }

    const result = await response.json();
    console.log('Update successful:', result);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
};

// Run the test
testFrontendRequest().then(result => {
  console.log('Test result:', result);
  console.log('===============================');
});
