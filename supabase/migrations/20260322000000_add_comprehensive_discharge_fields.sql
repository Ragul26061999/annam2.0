-- Add comprehensive discharge summary fields
ALTER TABLE discharge_summaries 
ADD COLUMN IF NOT EXISTS room_no TEXT,
ADD COLUMN IF NOT EXISTS bp TEXT, -- Blood pressure format "120/80"
ADD COLUMN IF NOT EXISTS pulse INTEGER,
ADD COLUMN IF NOT EXISTS bs INTEGER, -- Blood Sugar
ADD COLUMN IF NOT EXISTS rr INTEGER, -- Respiratory Rate
ADD COLUMN IF NOT EXISTS spo2 INTEGER, -- Oxygen Saturation
ADD COLUMN IF NOT EXISTS temp DECIMAL(4,1), -- Temperature
ADD COLUMN IF NOT EXISTS complaints TEXT, -- Main complaints/H/O
ADD COLUMN IF NOT EXISTS diagnosis TEXT, -- Final diagnosis
ADD COLUMN IF NOT EXISTS procedure_details TEXT, -- Procedure details
ADD COLUMN IF NOT EXISTS on_examination TEXT, -- O/E / S/E findings
ADD COLUMN IF NOT EXISTS treatment_course TEXT, -- Treatment / Course in Hospital
ADD COLUMN IF NOT EXISTS prescription_table JSONB, -- Structured prescription data
ADD COLUMN IF NOT EXISTS discharge_status TEXT DEFAULT 'Discharged', -- Discharge/Death status
ADD COLUMN IF NOT EXISTS reconnect_status BOOLEAN DEFAULT false; -- Connection status

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_discharge_status ON discharge_summaries(discharge_status);
CREATE INDEX IF NOT EXISTS idx_discharge_summaries_prescription_table ON discharge_summaries USING GIN(prescription_table);
