import { supabase } from '../src/lib/supabase';

async function seedBedAllocations() {
  try {
    console.log('Starting bed allocation seeding...');

    // First, get some beds and patients
    const { data: beds, error: bedsError } = await supabase
      .from('beds')
      .select('id, bed_number')
      .limit(5);

    if (bedsError) {
      console.error('Error fetching beds:', bedsError);
      return;
    }

    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, name')
      .limit(3);

    if (patientsError) {
      console.error('Error fetching patients:', patientsError);
      return;
    }

    if (!beds || beds.length === 0) {
      console.log('No beds found');
      return;
    }

    if (!patients || patients.length === 0) {
      console.log('No patients found');
      return;
    }

    // Create sample bed allocations
    const allocations = [
      {
        bed_id: beds[0].id,
        patient_id: patients[0].id,
        admission_date: '2025-01-20',
        status: 'active'
      },
      {
        bed_id: beds[1].id,
        patient_id: patients[1].id,
        admission_date: '2025-01-19',
        status: 'active'
      }
    ];

    // Insert bed allocations
    const { data: insertedAllocations, error: insertError } = await supabase
      .from('bed_allocations')
      .insert(allocations)
      .select();

    if (insertError) {
      console.error('Error inserting bed allocations:', insertError);
      return;
    }

    console.log('Successfully inserted bed allocations:', insertedAllocations);

    // Update bed status to occupied
    const bedIds = allocations.map(a => a.bed_id);
    const { error: updateError } = await supabase
      .from('beds')
      .update({ status: 'occupied' })
      .in('id', bedIds);

    if (updateError) {
      console.error('Error updating bed status:', updateError);
      return;
    }

    console.log('Successfully updated bed status to occupied');
    console.log('Bed allocation seeding completed!');

  } catch (error) {
    console.error('Error in seedBedAllocations:', error);
  }
}

// Run the seeding function
seedBedAllocations();