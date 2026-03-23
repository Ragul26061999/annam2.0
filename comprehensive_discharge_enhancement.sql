-- Comprehensive Discharge Summary Enhancement Script
-- Run this script in your Supabase SQL editor to add all new fields

-- Step 1: Add new fields to discharge_summaries table
ALTER TABLE discharge_summaries 
ADD COLUMN IF NOT EXISTS surgery_notes TEXT,
ADD COLUMN IF NOT EXISTS discharge_advice TEXT,
ADD COLUMN IF NOT EXISTS consult_doctor_name TEXT,
ADD COLUMN IF NOT EXISTS anesthesiologist_doctor TEXT,
ADD COLUMN IF NOT EXISTS surgeon_doctor_name TEXT,
ADD COLUMN IF NOT EXISTS systemic_examination TEXT, -- Separate S/E field
ADD COLUMN IF NOT EXISTS course_in_hospital TEXT, -- Separate Course in Hospital field
ADD COLUMN IF NOT EXISTS room_no TEXT, -- Room number from bed allocation
ADD COLUMN IF NOT EXISTS bp TEXT, -- Blood pressure format "120/80"
ADD COLUMN IF NOT EXISTS pulse INTEGER,
ADD COLUMN IF NOT EXISTS bs INTEGER, -- Blood Sugar
ADD COLUMN IF NOT EXISTS rr INTEGER, -- Respiratory Rate
ADD COLUMN IF NOT EXISTS spo2 INTEGER, -- Oxygen Saturation
ADD COLUMN IF NOT EXISTS temp DECIMAL(4,1), -- Temperature
ADD COLUMN IF NOT EXISTS complaints TEXT, -- Main complaints/H/O
ADD COLUMN IF NOT EXISTS diagnosis TEXT, -- Final diagnosis
ADD COLUMN IF NOT EXISTS procedure_details TEXT, -- Procedure details
ADD COLUMN IF NOT EXISTS on_examination TEXT, -- O/E findings
ADD COLUMN IF NOT EXISTS treatment_given TEXT, -- Treatment given
ADD COLUMN IF NOT EXISTS prescription_table JSONB, -- Structured prescription data
ADD COLUMN IF NOT EXISTS discharge_status TEXT DEFAULT 'Discharged', -- Discharge/Death status
ADD COLUMN IF NOT EXISTS reconnect_status BOOLEAN DEFAULT false; -- Connection status

-- Step 2: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_discharge_status ON discharge_summaries(discharge_status);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_prescription_table ON discharge_summaries USING GIN(prescription_table);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_room_no ON discharge_summaries(room_no);

-- Step 3: Update existing data to populate room numbers from bed allocations (if possible)
UPDATE discharge_summaries ds
SET room_no = b.room_number
FROM bed_allocations ba
JOIN beds b ON ba.bed_id = b.id
WHERE ds.allocation_id = ba.id AND ds.room_no IS NULL;

-- Step 4: Verify the columns were added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'discharge_summaries' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 5: Show sample data structure
SELECT 
    id,
    allocation_id,
    patient_name,
    room_no,
    admission_date,
    discharge_date,
    consult_doctor_name,
    surgeon_doctor_name,
    anesthesiologist_doctor,
    discharge_status,
    status
FROM discharge_summaries 
LIMIT 5;
