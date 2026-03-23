-- Add enhanced discharge summary fields
ALTER TABLE discharge_summaries 
ADD COLUMN IF NOT EXISTS surgery_notes TEXT,
ADD COLUMN IF NOT EXISTS discharge_advice TEXT,
ADD COLUMN IF NOT EXISTS consult_doctor_name TEXT,
ADD COLUMN IF NOT EXISTS anesthesiologist_doctor TEXT,
ADD COLUMN IF NOT EXISTS surgeon_doctor_name TEXT,
ADD COLUMN IF NOT EXISTS systemic_examination TEXT, -- Separate S/E field
ADD COLUMN IF NOT EXISTS course_in_hospital TEXT; -- Separate Course in Hospital field

-- Update existing data: split combined fields if they exist
UPDATE discharge_summaries 
SET 
  systemic_examination = NULL, -- Will be populated separately
  course_in_hospital = NULL -- Will be populated separately
WHERE 1=1;
