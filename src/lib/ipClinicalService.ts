import { supabase } from './supabase';

// --- Types ---

export interface IPCaseSheet {
  id: string;
  bed_allocation_id: string;
  patient_id: string;
  case_sheet_date: string;
  present_complaints?: string;
  history_present_illness?: string;
  past_history?: string;
  family_history?: string;
  personal_history?: string;
  examination_notes?: string;
  provisional_diagnosis?: string;
  investigation_summary?: string;
  treatment_plan?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface IPProgressNote {
  id: string;
  bed_allocation_id: string;
  note_date: string;
  content: string;
  created_by?: string;
  created_at: string;
}

export interface IPDoctorOrder {
  id: string;
  bed_allocation_id: string;
  order_date: string;
  assessment?: string;
  treatment_instructions?: string;
  investigation_instructions?: string;
  created_by?: string;
  created_at: string;
}

export interface IPNurseRecord {
  id: string;
  bed_allocation_id: string;
  entry_time: string;
  remark: string;
  created_by?: string;
  created_at: string;
}

export interface IPVital {
  id: string;
  bed_allocation_id: string;
  recorded_at: string;
  temperature?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  pulse?: number;
  respiratory_rate?: number;
  spo2?: number;
  sugar_level?: number;
  sugar_type?: string;
  consciousness_level?: string;
  urine_output?: number;
  intake_fluids?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  creator?: { name: string };
}

export interface IPDischargeSummary {
  id: string;
  bed_allocation_id: string;
  consultant_name?: string;
  admission_date?: string;
  discharge_date?: string;
  surgery_date?: string;
  
  // Patient & Administrative Info
  uhid?: string;
  patient_name?: string;
  address?: string;
  gender?: string;
  age?: number;
  ip_number?: string;
  room_no?: string;
  
  // Clinical Vitals
  bp?: string; // Blood pressure format "120/80"
  pulse?: number;
  bs?: number; // Blood Sugar
  rr?: number; // Respiratory Rate
  spo2?: number; // Oxygen Saturation
  temp?: number; // Temperature
  
  // Clinical Narratives
  presenting_complaint?: string;
  complaints?: string; // Main complaints/H/O
  past_history?: string;
  physical_findings?: string;
  on_examination?: string; // O/E findings
  systemic_examination?: string; // S/E findings
  investigations?: string;
  final_diagnosis?: string;
  diagnosis?: string; // Alternative diagnosis field
  diagnosis_category?: string;
  procedure_details?: string;
  treatment_given?: string; // Treatment given
  course_in_hospital?: string; // Course in Hospital
  condition_at_discharge?: string;
  follow_up_advice?: string;
  prescription?: string;
  prescription_table?: PrescriptionItem[] | null; // Structured prescription data
  review_date?: string;
  
  // Additional requested fields
  surgery_notes?: string;
  discharge_advice?: string;
  consult_doctor_name?: string;
  anesthesiologist_doctor?: string;
  surgeon_doctor_name?: string;
  
  // Status fields
  discharge_status?: string; // Discharged/Death
  reconnect_status?: boolean; // Connection status
  status: 'draft' | 'final';
  finalized_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  anesthesiologist?: string;
  consultant_id?: string;
}

export interface PrescriptionItem {
  id: string;
  drug_details: string;
  per_day_time: string; // Format: "1-0-1"
  nos: string; // Duration like "10 DAYS"
}

// --- Services ---

// 1. IP Case Sheet
export async function getIPCaseSheet(bedAllocationId: string, date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('ip_case_sheets')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .eq('case_sheet_date', targetDate)
    .maybeSingle();

  if (error) {
    console.error('Error fetching IP case sheet:', error.message, error.details, error.hint);
    return null;
  }
  return data as IPCaseSheet | null;
}

export async function createOrUpdateIPCaseSheet(
  bedAllocationId: string,
  patientId: string,
  updates: Partial<IPCaseSheet>,
  date?: string
) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  console.log('createOrUpdateIPCaseSheet called with:', {
    bedAllocationId,
    patientId,
    targetDate,
    updates
  });
  
  // First check if it exists for this date
  const existing = await getIPCaseSheet(bedAllocationId, targetDate);
  
  console.log('Existing case sheet:', existing);

  if (existing) {
    console.log('Updating existing case sheet...');
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    return data;
  } else {
    console.log('Creating new case sheet...');
    
    // Filter out undefined/null values from updates
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined && value !== null && value !== '')
    );
    
    console.log('Filtered updates for insert:', filteredUpdates);
    
    const insertData = {
      bed_allocation_id: bedAllocationId,
      patient_id: patientId,
      case_sheet_date: targetDate,
      ...filteredUpdates
    };
    
    console.log('Final insert data:', insertData);
    
    const { data, error } = await supabase
      .from('ip_case_sheets')
      .insert(insertData)
      .select()
      .single();

    console.log('Insert result:', { data, error });

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
    return data;
  }
}

// 2. IP Progress Notes
export async function getIPProgressNotes(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_progress_notes')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('note_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createIPProgressNote(
  bedAllocationId: string,
  content: string,
  noteDate: string
) {
  const { data, error } = await supabase
    .from('ip_progress_notes')
    .insert({
      bed_allocation_id: bedAllocationId,
      content,
      note_date: noteDate
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 3. IP Doctor Orders
export async function getIPDoctorOrders(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('ip_doctor_orders')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('order_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createIPDoctorOrder(
  bedAllocationId: string,
  order: {
    order_date: string;
    assessment: string;
    treatment_instructions: string;
    investigation_instructions: string;
  }
) {
  const { data, error } = await supabase
    .from('ip_doctor_orders')
    .insert({
      bed_allocation_id: bedAllocationId,
      ...order
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 4. IP Nurse Records
export async function getIPNurseRecords(bedAllocationId: string, dateFilter?: string) {
  let query = supabase
    .from('ip_nurse_records')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('entry_time', { ascending: false });

  if (dateFilter) {
    // Assuming dateFilter is YYYY-MM-DD
    const start = `${dateFilter}T00:00:00`;
    const end = `${dateFilter}T23:59:59`;
    query = query.gte('entry_time', start).lte('entry_time', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createIPNurseRecord(
  bedAllocationId: string,
  remark: string,
  entryTime?: string,
  notedAt?: string
): Promise<IPNurseRecord> {
  const { data, error } = await supabase
    .from('ip_nurse_records')
    .insert({
      bed_allocation_id: bedAllocationId,
      remark,
      entry_time: entryTime || new Date().toISOString(),
      noted_at: notedAt || entryTime || new Date().toISOString()
    })
    .select(`
      *,
      creator:users(name)
    `)
    .single();

  if (error) throw error;
  return data;
}

// 4.1 IP Vitals
export async function getIPVitals(bedAllocationId: string, dateFilter?: string) {
  let query = supabase
    .from('ip_vitals')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('recorded_at', { ascending: false });

  if (dateFilter) {
    const start = `${dateFilter}T00:00:00`;
    const end = `${dateFilter}T23:59:59`;
    query = query.gte('recorded_at', start).lte('recorded_at', end);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as IPVital[];
}

export async function createIPVital(
  bedAllocationId: string,
  vitals: Partial<IPVital>
) {
  const { data, error } = await supabase
    .from('ip_vitals')
    .insert({
      bed_allocation_id: bedAllocationId,
      ...vitals
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// 5. IP Discharge Summary
export async function getIPDischargeSummary(bedAllocationId: string) {
  const { data, error } = await supabase
    .from('discharge_summaries')
    .select('*')
    .eq('allocation_id', bedAllocationId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching discharge summary:', error);
    return null;
  }

  if (!data) return null;

  // Map database columns back to TypeScript interface
  const mappedData: IPDischargeSummary = {
    id: data.id,
    bed_allocation_id: data.allocation_id,
    consultant_name: data.consultant_name,
    admission_date: data.admission_date,
    discharge_date: data.discharge_date,
    surgery_date: data.surgery_date,
    uhid: data.uhid,
    patient_name: data.patient_name,
    address: data.address,
    gender: data.gender,
    age: data.age,
    ip_number: data.ip_number,
    room_no: data.room_no,
    // Clinical Vitals
    bp: data.bp,
    pulse: data.pulse,
    bs: data.bs,
    rr: data.rr,
    spo2: data.spo2,
    temp: data.temp,
    // Clinical Narratives
    presenting_complaint: data.presenting_complaint,
    complaints: data.complaints,
    past_history: data.past_history,
    physical_findings: data.physical_findings,
    on_examination: data.on_examination,
    systemic_examination: data.systemic_examination,
    investigations: data.investigations,
    final_diagnosis: data.final_diagnosis,
    diagnosis: data.diagnosis,
    diagnosis_category: data.diagnosis_category,
    procedure_details: data.procedure_details,
    treatment_given: data.treatment_given,
    course_in_hospital: data.course_in_hospital,
    condition_at_discharge: data.condition_at_discharge,
    follow_up_advice: data.follow_up_advice,
    prescription: data.prescription,
    prescription_table: data.prescription_table,
    review_date: data.review_on, // Map review_on to review_date
    // Additional requested fields
    surgery_notes: data.surgery_notes,
    discharge_advice: data.discharge_advice,
    consult_doctor_name: data.consult_doctor_name,
    anesthesiologist_doctor: data.anesthesiologist_doctor,
    surgeon_doctor_name: data.surgeon_doctor_name,
    anesthesiologist: data.anesthesiologist,
    // Status fields
    discharge_status: data.discharge_status,
    reconnect_status: data.reconnect_status,
    status: 'draft', // Default to draft since status column doesn't exist in DB
    finalized_at: data.finalized_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: data.created_by,
    consultant_id: data.consultant_id
  };

  return mappedData;
}

export async function createOrUpdateIPDischargeSummary(
  bedAllocationId: string,
  updates: Partial<IPDischargeSummary>
) {
  const existing = await getIPDischargeSummary(bedAllocationId);

  // Map TypeScript interface fields to database column names
  const dbUpdates: any = {
    allocation_id: bedAllocationId,
    uhid: updates.uhid,
    patient_name: updates.patient_name,
    address: updates.address,
    gender: updates.gender,
    age: updates.age,
    ip_number: updates.ip_number,
    room_no: updates.room_no,
    admission_date: updates.admission_date,
    surgery_date: updates.surgery_date,
    discharge_date: updates.discharge_date,
    presenting_complaint: updates.presenting_complaint,
    complaints: updates.complaints,
    physical_findings: updates.physical_findings,
    on_examination: updates.on_examination,
    systemic_examination: updates.systemic_examination,
    investigations: updates.investigations,
    past_history: updates.past_history,
    final_diagnosis: updates.final_diagnosis,
    diagnosis: updates.diagnosis,
    diagnosis_category: updates.diagnosis_category,
    procedure_details: updates.procedure_details,
    treatment_given: updates.treatment_given,
    course_in_hospital: updates.course_in_hospital,
    surgery_notes: updates.surgery_notes,
    discharge_advice: updates.discharge_advice,
    condition_at_discharge: updates.condition_at_discharge,
    follow_up_advice: updates.follow_up_advice,
    review_on: updates.review_date,
    prescription: updates.prescription,
    prescription_table: updates.prescription_table,
    // Clinical vitals
    bp: updates.bp,
    pulse: updates.pulse,
    bs: updates.bs,
    rr: updates.rr,
    spo2: updates.spo2,
    temp: updates.temp,
    // Doctor information
    consultant_name: updates.consultant_name || updates.consult_doctor_name,
    consult_doctor_name: updates.consult_doctor_name,
    surgeon_doctor_name: updates.surgeon_doctor_name,
    anesthesiologist: updates.anesthesiologist,
    anesthesiologist_doctor: updates.anesthesiologist_doctor,
    // Status fields
    discharge_status: updates.discharge_status,
    reconnect_status: updates.reconnect_status,
    finalized_at: updates.finalized_at,
    // Only include fields that exist in the database
    created_by: updates.created_by,
    consultant_id: updates.consultant_id,
    updated_at: new Date().toISOString()
  };

  // Remove undefined values to avoid database errors
  Object.keys(dbUpdates).forEach(key => {
    if (dbUpdates[key] === undefined) {
      delete dbUpdates[key];
    }
  });

  if (existing) {
    const { data, error } = await supabase
      .from('discharge_summaries')
      .update(dbUpdates)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Database error updating discharge summary:', error);
      throw error;
    }
    return data;
  } else {
    // For new records, we need to ensure patient_id is provided
    // This should come from the bed allocation
    const { data: bedData, error: bedError } = await supabase
      .from('bed_allocations')
      .select('patient_id')
      .eq('id', bedAllocationId)
      .single();

    if (bedError || !bedData?.patient_id) {
      throw new Error('Patient ID not found for bed allocation');
    }

    dbUpdates.patient_id = bedData.patient_id;

    const { data, error } = await supabase
      .from('discharge_summaries')
      .insert(dbUpdates)
      .select()
      .single();

    if (error) {
      console.error('Database error inserting discharge summary:', error);
      throw error;
    }
    return data;
  }
}

// --- Timeline Service ---

export interface ClinicalEvent {
  id: string;
  type: 'doctor_order' | 'nurse_record' | 'progress_note' | 'vital_sign' | 'case_sheet' | 'prescription';
  timestamp: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  metadata?: any;
  creator?: string;
}

export async function getIPClinicalTimeline(bedAllocationId: string, patientId?: string): Promise<Record<string, ClinicalEvent[]>> {
  // Get all case sheets for this bed allocation
  const caseSheets = await supabase
    .from('ip_case_sheets')
    .select(`
      *,
      creator:users(name)
    `)
    .eq('bed_allocation_id', bedAllocationId)
    .order('updated_at', { ascending: false });

  const [orders, nurseRecords, notes, vitals] = await Promise.all([
    getIPDoctorOrders(bedAllocationId),
    getIPNurseRecords(bedAllocationId),
    getIPProgressNotes(bedAllocationId),
    getIPVitals(bedAllocationId)
  ]);

  // Get prescriptions if patientId is provided
  let prescriptions = null;
  if (patientId) {
    const { data } = await supabase
      .from('prescriptions')
      .select(`
        *,
        prescription_items (
          *,
          medications (
            id,
            name,
            dosage_form,
            strength
          )
        ),
        creator:users(name)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    prescriptions = data;
  }

  // Get medication administration data for this bed allocation
  const { data: administrationData } = await supabase
    .from('ip_prescription_administration')
    .select('*')
    .eq('bed_allocation_id', bedAllocationId)
    .order('administration_date', { ascending: false })
    .order('scheduled_time', { ascending: false });

  const events: ClinicalEvent[] = [];

  // Add case sheet events
  caseSheets.data?.forEach((cs: any) => {
    // Find which fields have content
    const contentFields = [];
    if (cs.present_complaints) contentFields.push(`**Present Complaints:** ${cs.present_complaints}`);
    if (cs.history_present_illness) contentFields.push(`**History:** ${cs.history_present_illness}`);
    if (cs.examination_notes) contentFields.push(`**Examination:** ${cs.examination_notes}`);
    if (cs.provisional_diagnosis) contentFields.push(`**Diagnosis:** ${cs.provisional_diagnosis}`);
    if (cs.treatment_plan) contentFields.push(`**Treatment:** ${cs.treatment_plan}`);
    
    if (contentFields.length > 0) {
      events.push({
        id: cs.id,
        type: 'case_sheet',
        timestamp: cs.updated_at,
        date: cs.case_sheet_date,
        title: 'Case Sheet Updated',
        content: contentFields.join('\n\n'),
        metadata: { 
          case_sheet_date: cs.case_sheet_date,
          present_complaints: cs.present_complaints,
          provisional_diagnosis: cs.provisional_diagnosis,
          treatment_plan: cs.treatment_plan
        },
        creator: cs.created_by ? (cs.creator?.name || 'Medical Staff') : null
      });
    }
  });

  // Add prescription events
  prescriptions?.forEach((p: any) => {
    // Build medication details
    const medicationDetails: string[] = [];
    
    if (p.prescription_items && p.prescription_items.length > 0) {
      p.prescription_items.forEach((item: any) => {
        const med = item.medications;
        const medName = med?.name || 'Medication name not available';
        const dosage = item.dosage || med?.strength || '';
        const frequency = item.frequency || '';
        const duration = item.duration || '';
        const quantity = item.quantity || '';
        
        let medInfo = `**${medName}**`;
        if (dosage) medInfo += ` - ${dosage}`;
        if (frequency) medInfo += `\nFrequency: ${frequency}`;
        if (duration) medInfo += `\nDuration: ${duration}`;
        if (quantity) medInfo += `\nQuantity: ${quantity}`;
        
        medicationDetails.push(medInfo);
      });
    }
    
    // Get administration status for this prescription
    const adminStatus: string[] = [];
    if (administrationData && administrationData.length > 0) {
      const todayAdmin = administrationData.filter((admin: any) => 
        admin.administration_date === p.created_at.split('T')[0]
      );
      
      const administered = todayAdmin.filter((admin: any) => admin.status === 'administered').length;
      const refused = todayAdmin.filter((admin: any) => admin.status === 'refused').length;
      const skipped = todayAdmin.filter((admin: any) => admin.status === 'skipped').length;
      
      if (administered > 0) adminStatus.push(`✅ Administered: ${administered}`);
      if (refused > 0) adminStatus.push(`❌ Refused: ${refused}`);
      if (skipped > 0) adminStatus.push(`⏭️ Skipped: ${skipped}`);
    }
    
    const content = [
      `Prescription ID: ${p.prescription_id}`,
      `Status: ${p.status}`,
      medicationDetails.length > 0 ? medicationDetails.join('\n\n') : 'No medication items found',
      adminStatus.length > 0 ? `\n**Today's Administration:**\n${adminStatus.join(' | ')}` : ''
    ].filter(Boolean).join('\n\n');
    
    events.push({
      id: p.id,
      type: 'prescription',
      timestamp: p.created_at,
      date: p.created_at.split('T')[0],
      title: 'Prescription',
      content: content,
      metadata: { 
        prescription_id: p.prescription_id,
        status: p.status,
        issue_date: p.issue_date,
        medications: p.prescription_items?.map((item: any) => item.medications?.name).filter(Boolean) || [],
        administration_status: adminStatus.join(' | ')
      },
      creator: p.created_by ? (p.creator?.name || 'Prescribing Doctor') : null
    });
  });

  orders?.forEach((o: any) => {
    events.push({
      id: o.id,
      type: 'doctor_order',
      timestamp: o.order_date,
      date: o.order_date.split('T')[0],
      title: 'Doctor Order',
      content: o.assessment || 'No assessment details provided',
      metadata: { treatment: o.treatment_instructions, investigation: o.investigation_instructions },
      creator: o.creator?.name
    });
  });

  nurseRecords?.forEach((n: any) => {
    events.push({
      id: n.id,
      type: 'nurse_record',
      timestamp: n.entry_time,
      date: n.entry_time.split('T')[0],
      title: 'Nurse Record',
      content: n.remark,
      creator: n.creator?.name
    });
  });

  notes?.forEach((n: any) => {
    events.push({
      id: n.id,
      type: 'progress_note',
      timestamp: n.note_date,
      date: n.note_date.split('T')[0],
      title: 'Progress Note',
      content: n.content,
      creator: n.creator?.name
    });
  });

  vitals?.forEach((v: any) => {
    // Format vitals summary
    const parts = [];
    if (v.bp_systolic && v.bp_diastolic) parts.push(`BP: ${v.bp_systolic}/${v.bp_diastolic}`);
    if (v.pulse) parts.push(`Pulse: ${v.pulse}`);
    if (v.temperature) parts.push(`Temp: ${v.temperature}°F`);
    if (v.spo2) parts.push(`SpO2: ${v.spo2}%`);
    
    events.push({
      id: v.id,
      type: 'vital_sign',
      timestamp: v.recorded_at,
      date: v.recorded_at.split('T')[0],
      title: 'Vital Signs',
      content: parts.join(' | ') + (v.notes ? `\nNote: ${v.notes}` : ''),
      metadata: v,
      creator: v.creator?.name
    });
  });

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Group by date
  const grouped: Record<string, ClinicalEvent[]> = {};
  events.forEach(event => {
    if (!grouped[event.date]) grouped[event.date] = [];
    grouped[event.date].push(event);
  });

  return grouped;
}
