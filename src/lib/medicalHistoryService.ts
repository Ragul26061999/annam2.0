import { supabase } from './supabase';

export interface MedicalHistoryEvent {
  id: string;
  patient_id: string;
  event_type: string;
  event_name: string;
  event_date: string;
  details: string | null;
  doctor_name: string | null;
  facility_name: string | null;
  source: 'history' | 'symptom' | 'allergy';
}

export interface CreateMedicalHistoryInput {
  patientId: string;
  eventType: string;
  eventName: string;
  eventDate: string;
  details?: string;
  doctorName?: string;
  facilityName?: string;
}

export const createMedicalHistory = async (input: CreateMedicalHistoryInput): Promise<MedicalHistoryEvent> => {
  if (!input.patientId) {
    throw new Error('Patient ID is required to create medical history.');
  }

  try {
    const { data, error } = await supabase
      .from('medical_history')
      .insert({
        patient_id: input.patientId,
        event_type: input.eventType,
        event_name: input.eventName,
        event_date: input.eventDate,
        details: input.details || null,
        doctor_name: input.doctorName || null,
        facility_name: input.facilityName || null
      })
      .select()
      .single();

    if (error) {
      // Handle case where medical_history table doesn't exist
      if (error.code === '42P01') {
        throw new Error('Medical history table does not exist. Please contact system administrator.');
      }
      console.error('Error creating medical history:', error);
      throw new Error('Failed to create medical history entry.');
    }

    return { ...data, source: 'history' };
  } catch (error) {
    console.error('An unexpected error occurred while creating medical history:', error);
    throw error;
  }
};

// Add some dummy medical history data for testing
export const addDummyMedicalHistory = async (patientId: string): Promise<MedicalHistoryEvent[]> => {
  const dummyData: CreateMedicalHistoryInput[] = [
    {
      patientId,
      eventType: 'Diagnosis',
      eventName: 'Hypertension',
      eventDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      details: 'Diagnosed with Stage 1 Hypertension. Prescribed lifestyle changes and monitoring.',
      doctorName: 'Dr. Sarah Johnson',
      facilityName: 'City General Hospital'
    },
    {
      patientId,
      eventType: 'Surgery',
      eventName: 'Appendectomy',
      eventDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
      details: 'Laparoscopic appendectomy performed due to acute appendicitis. Recovery was uneventful.',
      doctorName: 'Dr. Michael Chen',
      facilityName: 'University Medical Center'
    },
    {
      patientId,
      eventType: 'Vaccination',
      eventName: 'COVID-19 Vaccine',
      eventDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago
      details: 'Received second dose of COVID-19 vaccine. No adverse reactions reported.',
      doctorName: 'Dr. Lisa Wong',
      facilityName: 'Community Health Clinic'
    }
  ];

  const results: MedicalHistoryEvent[] = [];
  
  for (const entry of dummyData) {
    try {
      const result = await createMedicalHistory(entry);
      results.push(result);
    } catch (error) {
      console.error('Error adding dummy data:', error);
    }
  }

  return results;
};

export const getMedicalHistory = async (patientId: string): Promise<MedicalHistoryEvent[]> => {
  if (!patientId) {
    console.error('Patient ID is required to fetch medical history.');
    return [];
  }

  try {
    // Initialize combined history array
    const combinedHistory: MedicalHistoryEvent[] = [];

    // Fetch from medical_history table (handle if table doesn't exist)
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('medical_history')
        .select('*')
        .eq('patient_id', patientId);

      if (historyError) {
        if (historyError.code === '42P01') {
          console.log('Medical history table does not exist, skipping');
        } else if (historyError.code !== 'PGRST116') {
          console.error('Error fetching medical history:', historyError);
        }
      } else if (historyData) {
        historyData.forEach((item: any) => {
          combinedHistory.push({ ...item, source: 'history' as const });
        });
      }
    } catch (err: any) {
      if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        console.log('Medical history table does not exist, skipping');
      } else {
        console.warn('Medical history table may not exist:', err);
      }
    }

    // Fetch from patient_symptoms table (handle if table doesn't exist)
    try {
      const { data: symptomsData, error: symptomsError } = await supabase
        .from('patient_symptoms')
        .select('*')
        .eq('patient_id', patientId);

      if (symptomsError) {
        if (symptomsError.code === '42P01') {
          console.log('Patient symptoms table does not exist, skipping');
        } else if (symptomsError.code !== 'PGRST116') {
          console.error('Error fetching patient symptoms:', symptomsError);
        }
      } else if (symptomsData) {
        symptomsData.forEach((item: any) => {
          combinedHistory.push({
            id: item.id,
            patient_id: item.patient_id,
            event_type: 'Symptom',
            event_name: item.symptom_name,
            event_date: item.recorded_at,
            details: `Severity: ${item.severity}, Onset: ${item.onset_date}`,
            doctor_name: null,
            facility_name: null,
            source: 'symptom' as const,
          });
        });
      }
    } catch (err: any) {
      if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        console.log('Patient symptoms table does not exist, skipping');
      } else {
        console.warn('Patient symptoms table may not exist:', err);
      }
    }

    // Fetch from patient_allergies table (handle if table doesn't exist)
    try {
      const { data: allergiesData, error: allergiesError } = await supabase
        .from('patient_allergies')
        .select('*')
        .eq('patient_id', patientId);

      if (allergiesError) {
        if (allergiesError.code === '42P01') {
          console.log('Patient allergies table does not exist, skipping');
        } else if (allergiesError.code !== 'PGRST116') {
          console.error('Error fetching patient allergies:', allergiesError);
        }
      } else if (allergiesData) {
        allergiesData.forEach((item: any) => {
          combinedHistory.push({
            id: item.id,
            patient_id: item.patient_id,
            event_type: 'Allergy',
            event_name: item.allergen,
            event_date: item.recorded_at,
            details: `Reaction: ${item.reaction}, Severity: ${item.severity}`,
            doctor_name: null,
            facility_name: null,
            source: 'allergy' as const,
          });
        });
      }
    } catch (err: any) {
      if (err.message?.includes('relation') && err.message?.includes('does not exist')) {
        console.log('Patient allergies table does not exist, skipping');
      } else {
        console.warn('Patient allergies table may not exist:', err);
      }
    }

    // Sort by event date, most recent first
    combinedHistory.sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

    return combinedHistory;

  } catch (error) {
    console.error('An unexpected error occurred while fetching medical history:', error);
    return [];
  }
};
