// Test script to debug patient update issue
const testPatientUpdate = async () => {
  try {
    // Sample update data that would be sent from the form
    const updateData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      age: '35',
      gender: 'male',
      phone: '1234567890',
      email: 'john@example.com',
      address: '123 Test St',
      maritalStatus: 'single',
      bloodGroup: 'O+',
      allergies: 'None',
      medicalHistory: 'None',
      currentMedications: 'None',
      chronicConditions: 'None',
      previousSurgeries: 'None',
      primaryComplaint: 'Headache',
      initialSymptoms: 'Head pain',
      guardianName: '',
      guardianRelationship: '',
      guardianPhone: '',
      guardianAddress: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelationship: '',
      insuranceProvider: '',
      insuranceNumber: '',
      referredBy: ''
    };

    console.log('Testing patient update with data:', JSON.stringify(updateData, null, 2));

    // Test the API endpoint
    const patientId = 'caec8dde-cb89-4366-b95d-6d996c6601cd';
    const response = await fetch(`http://localhost:3000/api/patients/${patientId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      return { success: false, error: errorData };
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
testPatientUpdate();
