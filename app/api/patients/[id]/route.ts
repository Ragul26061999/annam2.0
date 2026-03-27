import { NextRequest, NextResponse } from 'next/server';
import { updatePatientRecord, getPatientByUHID } from '../../../../src/lib/patientService';

// GET /api/patients/[id] - Get patient by UHID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const patient = await getPatientByUHID(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

// PATCH /api/patients/[id] - Update patient by UHID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('=== API PATCH DEBUG ===');
    console.log('Patient ID:', id);
    
    if (!id) {
      console.log('ERROR: Patient ID is required');
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    console.log('Received update data for patient ID:', id);
    console.log('Raw update data:', JSON.stringify(updateData, null, 2));
    
    if (!updateData || Object.keys(updateData).length === 0) {
      console.log('ERROR: Update data is required');
      return NextResponse.json(
        { error: 'Update data is required' },
        { status: 400 }
      );
    }

    // Validate required fields - only firstName is mandatory
    if (updateData.firstName !== undefined && (!updateData.firstName || updateData.firstName.trim() === '')) {
      console.log('ERROR: First name is required');
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    console.log('Validation passed, proceeding with field mapping...');

    // Map frontend fields to database fields
    const mappedData: Record<string, string | number | null | undefined> = {};
    
    // Combine firstName and lastName into name field
    if (updateData.firstName || updateData.lastName) {
      const firstName = updateData.firstName || '';
      const lastName = updateData.lastName || '';
      mappedData.name = `${firstName} ${lastName}`.trim();
      console.log('Combined name:', mappedData.name);
    }
    
    // Map other fields that exist in database
    const fieldMapping = {
      dateOfBirth: 'date_of_birth',
      maritalStatus: 'marital_status',
      currentMedications: 'current_medications',
      chronicConditions: 'chronic_conditions',
      previousSurgeries: 'previous_surgeries',
      bloodGroup: 'blood_group',
      medicalHistory: 'medical_history',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelationship: 'emergency_contact_relationship',
      insuranceProvider: 'insurance_provider',
      insuranceNumber: 'insurance_number',
      primaryComplaint: 'primary_complaint',
      initialSymptoms: 'initial_symptoms',
      guardianName: 'guardian_name',
      guardianRelationship: 'guardian_relationship',
      guardianPhone: 'guardian_phone',
      guardianAddress: 'guardian_address',
      referredBy: 'referred_by'
    };
    
    // Direct field mappings (same name in frontend and database)
    const directFields = ['gender', 'phone', 'email', 'address', 'allergies', 'status'];
    
    // Handle age field separately (convert to number or null)
    if (updateData.age !== undefined) {
      mappedData.age = updateData.age && updateData.age.toString().trim() !== '' ? parseInt(updateData.age.toString(), 10) : null;
      console.log('Mapped age:', mappedData.age);
    }
    
    // Map fields with different names
    Object.entries(fieldMapping).forEach(([frontendField, dbField]) => {
      if (updateData[frontendField] !== undefined) {
        const value = updateData[frontendField];
        
        // Special handling for fields with check constraints
        if (dbField === 'marital_status') {
          const validValues = ['single', 'married', 'divorced', 'widowed', 'separated'];
          mappedData[dbField] = (value && validValues.includes(value)) ? value : null;
        } else if (dbField === 'gender') {
          const validValues = ['male', 'female', 'other'];
          mappedData[dbField] = (value && validValues.includes(value)) ? value : null;
        } else if (dbField === 'admission_type') {
          const validValues = ['emergency', 'elective', 'scheduled', 'referred', 'transfer', 'inpatient', 'outpatient'];
          mappedData[dbField] = (value && validValues.includes(value)) ? value : null;
        } else if (dbField === 'status') {
          const validValues = ['active', 'inactive', 'deceased'];
          mappedData[dbField] = (value && validValues.includes(value)) ? value : 'active';
        } else {
          mappedData[dbField] = value;
        }
        console.log(`Mapped ${frontendField} -> ${dbField}:`, mappedData[dbField]);
      }
    });
    
    // Map direct fields with validation for constrained fields
    directFields.forEach(field => {
      if (updateData[field] !== undefined) {
        const value = updateData[field];
        
        // Special handling for fields with check constraints
        if (field === 'gender') {
          const validValues = ['male', 'female', 'other'];
          mappedData[field] = (value && validValues.includes(value)) ? value : null;
        } else if (field === 'status') {
          const validValues = ['active', 'inactive', 'deceased'];
          mappedData[field] = (value && validValues.includes(value)) ? value : 'active';
        } else {
          mappedData[field] = value;
        }
        console.log(`Direct mapped ${field}:`, mappedData[field]);
      }
    });
    
    // Add updated timestamp
    mappedData.updated_at = new Date().toISOString();

    console.log('Final mapped data being sent to database:', JSON.stringify(mappedData, null, 2));
    console.log('Calling updatePatientRecord function...');
    
    // Additional validation before sending to database
    console.log('Validating mapped data against constraints...');
    if (mappedData.marital_status) {
      console.log('marital_status value:', mappedData.marital_status);
    }
    if (mappedData.gender) {
      console.log('gender value:', mappedData.gender);
    }
    if (mappedData.status) {
      console.log('status value:', mappedData.status);
    }
    
    console.log('========================');
    
    const updatedPatient = await updatePatientRecord(id, mappedData);
    
    console.log('Update successful, returning result');
    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error updating patient:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('==================');
    
    return NextResponse.json(
      { error: 'Failed to update patient', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}