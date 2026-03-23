-- Create IP Clinical Tables for storing inpatient clinical data
-- This migration creates the missing tables for IP clinical records

-- 1. IP Case Sheets Table
CREATE TABLE IF NOT EXISTS ip_case_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    case_sheet_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Clinical data fields
    present_complaints TEXT,
    history_present_illness TEXT,
    past_history TEXT,
    family_history TEXT,
    personal_history TEXT,
    examination_notes TEXT,
    provisional_diagnosis TEXT,
    investigation_summary TEXT,
    treatment_plan TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Ensure one case sheet per bed allocation per day
    CONSTRAINT unique_case_sheet_per_day UNIQUE (bed_allocation_id, case_sheet_date)
);

-- 2. IP Vitals Table
CREATE TABLE IF NOT EXISTS ip_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Vital signs
    temperature DECIMAL(4,1), -- Temperature in °F
    bp_systolic INTEGER, -- Blood pressure systolic
    bp_diastolic INTEGER, -- Blood pressure diastolic
    pulse INTEGER, -- Pulse rate
    respiratory_rate INTEGER, -- Respiratory rate
    spo2 INTEGER, -- Oxygen saturation percentage
    sugar_level DECIMAL(6,2), -- Blood sugar level
    sugar_type VARCHAR(20), -- Fasting/Postprandial/Random
    consciousness_level VARCHAR(50), -- Consciousness level
    urine_output INTEGER, -- Urine output in ml
    intake_fluids INTEGER, -- Fluid intake in ml
    notes TEXT, -- Additional notes
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. IP Progress Notes Table
CREATE TABLE IF NOT EXISTS ip_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    note_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content TEXT NOT NULL,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. IP Doctor Orders Table
CREATE TABLE IF NOT EXISTS ip_doctor_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Order details
    assessment TEXT,
    treatment_instructions TEXT,
    investigation_instructions TEXT,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. IP Nurse Records Table
CREATE TABLE IF NOT EXISTS ip_nurse_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bed_allocation_id UUID NOT NULL REFERENCES bed_allocations(id) ON DELETE CASCADE,
    entry_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    noted_at TIMESTAMP WITH TIME ZONE, -- Physical observation time
    remark TEXT NOT NULL,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enhanced Discharge Summary Table (add missing clinical fields)
ALTER TABLE discharge_summaries 
ADD COLUMN IF NOT EXISTS bp VARCHAR(20), -- Blood pressure format "120/80"
ADD COLUMN IF NOT EXISTS pulse INTEGER,
ADD COLUMN IF NOT EXISTS bs DECIMAL(6,2), -- Blood Sugar
ADD COLUMN IF NOT EXISTS rr INTEGER, -- Respiratory Rate
ADD COLUMN IF NOT EXISTS spo2 INTEGER, -- Oxygen Saturation
ADD COLUMN IF NOT EXISTS temp DECIMAL(4,1), -- Temperature
ADD COLUMN IF NOT EXISTS complaints TEXT, -- Main complaints/H/O
ADD COLUMN IF NOT EXISTS on_examination TEXT, -- O/E findings
ADD COLUMN IF NOT EXISTS systemic_examination TEXT, -- S/E findings
ADD COLUMN IF NOT EXISTS diagnosis TEXT, -- Alternative diagnosis field
ADD COLUMN IF NOT EXISTS procedure_details TEXT,
ADD COLUMN IF NOT EXISTS treatment_given TEXT, -- Treatment given
ADD COLUMN IF NOT EXISTS course_in_hospital TEXT, -- Course in Hospital
ADD COLUMN IF NOT EXISTS surgery_notes TEXT,
ADD COLUMN IF NOT EXISTS discharge_advice TEXT,
ADD COLUMN IF NOT EXISTS consult_doctor_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS surgeon_doctor_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS anesthesiologist VARCHAR(200);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ip_case_sheets_bed_date ON ip_case_sheets(bed_allocation_id, case_sheet_date);
CREATE INDEX IF NOT EXISTS idx_ip_case_sheets_patient ON ip_case_sheets(patient_id);
CREATE INDEX IF NOT EXISTS idx_ip_vitals_bed_recorded ON ip_vitals(bed_allocation_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_ip_progress_notes_bed_date ON ip_progress_notes(bed_allocation_id, note_date);
CREATE INDEX IF NOT EXISTS idx_ip_doctor_orders_bed_date ON ip_doctor_orders(bed_allocation_id, order_date);
CREATE INDEX IF NOT EXISTS idx_ip_nurse_records_bed_time ON ip_nurse_records(bed_allocation_id, entry_time);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_ip_case_sheets_updated_at 
    BEFORE UPDATE ON ip_case_sheets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ip_case_sheets IS 'Stores daily case sheets for inpatients with clinical findings';
COMMENT ON TABLE ip_vitals IS 'Stores vital signs measurements for inpatients';
COMMENT ON TABLE ip_progress_notes IS 'Stores daily progress notes for inpatients';
COMMENT ON TABLE ip_doctor_orders IS 'Stores doctor orders for inpatient care';
COMMENT ON TABLE ip_nurse_records IS 'Stores nurse observation records for inpatients';

COMMENT ON COLUMN ip_vitals.temperature IS 'Temperature in Fahrenheit';
COMMENT ON COLUMN ip_vitals.bp_systolic IS 'Blood pressure systolic value';
COMMENT ON COLUMN ip_vitals.bp_diastolic IS 'Blood pressure diastolic value';
COMMENT ON COLUMN ip_vitals.spo2 IS 'Oxygen saturation percentage';
COMMENT ON COLUMN ip_vitals.sugar_level IS 'Blood sugar level in mg/dL';
COMMENT ON COLUMN ip_vitals.pulse IS 'Pulse rate per minute';
COMMENT ON COLUMN ip_vitals.respiratory_rate IS 'Respiratory rate per minute';

COMMENT ON COLUMN discharge_summaries.bp IS 'Blood pressure at discharge (format: 120/80)';
COMMENT ON COLUMN discharge_summaries.pulse IS 'Pulse rate at discharge';
COMMENT ON COLUMN discharge_summaries.bs IS 'Blood sugar level at discharge (mg/dL)';
COMMENT ON COLUMN discharge_summaries.rr IS 'Respiratory rate at discharge';
COMMENT ON COLUMN discharge_summaries.spo2 IS 'Oxygen saturation at discharge (%)';
COMMENT ON COLUMN discharge_summaries.temp IS 'Temperature at discharge (°F)';
COMMENT ON COLUMN discharge_summaries.complaints IS 'Main complaints/history of present illness';
COMMENT ON COLUMN discharge_summaries.on_examination IS 'On examination findings (O/E)';
COMMENT ON COLUMN discharge_summaries.systemic_examination IS 'Systemic examination findings (S/E)';
COMMENT ON COLUMN discharge_summaries.treatment_given IS 'Treatment given during hospital stay';
COMMENT ON COLUMN discharge_summaries.course_in_hospital IS 'Course in hospital';
COMMENT ON COLUMN discharge_summaries.surgery_notes IS 'Surgery notes and details';
COMMENT ON COLUMN discharge_summaries.discharge_advice IS 'Discharge advice for patient';
COMMENT ON COLUMN discharge_summaries.consult_doctor_name IS 'Consulting doctor name';
COMMENT ON COLUMN discharge_summaries.surgeon_doctor_name IS 'Surgeon name';
COMMENT ON COLUMN discharge_summaries.anesthesiologist IS 'Anesthesiologist name';
