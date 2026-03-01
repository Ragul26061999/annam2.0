-- Hospital Management System Database Structure
-- This file contains all the SQL migrations needed for the comprehensive system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'md', 'doctor', 'nurse', 'receptionist', 'accountant', 'pharmacist', 'technician', 'patient');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE admission_type AS ENUM ('emergency', 'elective', 'referred', 'transfer');
CREATE TYPE bed_type AS ENUM ('general', 'private', 'icu', 'surgical', 'maternity', 'pediatric');
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved');
CREATE TYPE visit_type AS ENUM ('new_patient', 'follow_up', 'emergency', 'routine_checkup', 'consultation');
CREATE TYPE vital_type AS ENUM ('blood_pressure', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation', 'weight', 'height', 'bmi');

-- 1. Enhanced Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role user_role NOT NULL DEFAULT 'patient',
    status VARCHAR(20) DEFAULT 'active',
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Enhanced Patients Table with Barcode
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(20) UNIQUE NOT NULL, -- UHID
    barcode_id VARCHAR(50) UNIQUE NOT NULL DEFAULT '', -- Barcode for patient ID
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    marital_status VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    
    -- Medical Information
    blood_group VARCHAR(5),
    allergies TEXT,
    medical_history TEXT,
    current_medications TEXT,
    chronic_conditions TEXT,
    previous_surgeries TEXT,
    
    -- Admission Information
    admission_date TIMESTAMP WITH TIME ZONE,
    admission_time TIME,
    primary_complaint TEXT,
    admission_type admission_type,
    referring_doctor_facility VARCHAR(255),
    department_ward VARCHAR(100),
    room_number VARCHAR(20),
    
    -- Guardian Information
    guardian_name VARCHAR(255),
    guardian_relationship VARCHAR(50),
    guardian_phone VARCHAR(20),
    guardian_address TEXT,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Insurance Information
    insurance_provider VARCHAR(255),
    insurance_number VARCHAR(100),
    
    -- Additional Information
    initial_symptoms TEXT,
    referred_by VARCHAR(255),
    
    -- System fields
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Doctors Table
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    doctor_id VARCHAR(20) UNIQUE NOT NULL,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    qualification VARCHAR(255),
    experience_years INTEGER DEFAULT 0,
    consultation_fee DECIMAL(10,2) DEFAULT 0.00,
    
    -- Schedule Information
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '17:00:00',
    working_days INTEGER[] DEFAULT '{1,2,3,4,5,6}', -- 0=Sunday, 1=Monday, etc.
    
    -- Room Information
    room_number VARCHAR(20),
    floor_number INTEGER,
    
    -- Status
    availability_status VARCHAR(20) DEFAULT 'available', -- available, busy, off_duty, on_leave
    emergency_available BOOLEAN DEFAULT false,
    
    -- System fields
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. Appointments Table with History
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id VARCHAR(30) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    
    -- Appointment Details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    
    -- Type and Status
    type visit_type NOT NULL DEFAULT 'consultation',
    status appointment_status NOT NULL DEFAULT 'scheduled',
    
    -- Medical Information
    symptoms TEXT,
    chief_complaint TEXT,
    diagnosis TEXT,
    treatment_plan TEXT,
    prescriptions JSONB DEFAULT '[]',
    
    -- Follow-up Information
    next_appointment_date DATE,
    follow_up_instructions TEXT,
    
    -- System fields
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 5. Patient Visits Table (for tracking visit history)
CREATE TABLE IF NOT EXISTS patient_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_id VARCHAR(30) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    doctor_id UUID REFERENCES doctors(id),
    appointment_id UUID REFERENCES appointments(id),
    
    -- Visit Details
    visit_date DATE NOT NULL,
    visit_time TIME NOT NULL,
    visit_type visit_type NOT NULL,
    
    -- Medical Information for this visit
    symptoms TEXT,
    current_complaints TEXT,
    vitals_recorded BOOLEAN DEFAULT false,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 6. Vitals Table with History
CREATE TABLE IF NOT EXISTS vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES patient_visits(id),
    recorded_by UUID REFERENCES users(id),
    
    -- Vital Signs
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    temperature DECIMAL(4,2),
    respiratory_rate INTEGER,
    oxygen_saturation INTEGER,
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,2),
    
    -- Additional measurements
    blood_glucose DECIMAL(6,2),
    pain_scale INTEGER CHECK (pain_scale >= 0 AND pain_scale <= 10),
    
    -- Timestamps
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Notes
    notes TEXT,
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 7. Beds Table
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bed_id VARCHAR(20) UNIQUE NOT NULL,
    bed_number VARCHAR(10) NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor_number INTEGER,
    ward_name VARCHAR(100),
    bed_type bed_type NOT NULL DEFAULT 'general',
    status bed_status NOT NULL DEFAULT 'available',
    
    -- Equipment and Features
    equipment JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 8. Bed Allocations Table
CREATE TABLE IF NOT EXISTS bed_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id VARCHAR(30) UNIQUE NOT NULL,
    patient_id UUID REFERENCES patients(id),
    bed_id UUID REFERENCES beds(id),
    doctor_id UUID REFERENCES doctors(id),
    
    -- Allocation Details
    admission_date DATE NOT NULL,
    admission_time TIME NOT NULL,
    discharge_date DATE,
    discharge_time TIME,
    
    -- Medical Information
    admission_type admission_type NOT NULL,
    reason_for_admission TEXT,
    discharge_summary TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, discharged, transferred
    
    -- System fields
    allocated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 9. Patient Symptoms Table (for tracking evolving symptoms)
CREATE TABLE IF NOT EXISTS patient_symptoms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    visit_id UUID REFERENCES patient_visits(id),
    symptom_name VARCHAR(255) NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 10),
    description TEXT,
    onset_date DATE,
    resolved_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, resolved, chronic
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 10. Patient Allergies Table (for tracking evolving allergies)
CREATE TABLE IF NOT EXISTS patient_allergies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id),
    allergen VARCHAR(255) NOT NULL,
    reaction TEXT,
    severity VARCHAR(20) DEFAULT 'mild', -- mild, moderate, severe
    discovered_date DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, resolved
    
    -- System fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON patients(patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_barcode_id ON patients(barcode_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_id ON vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_visit_id ON vitals(visit_id);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_patient_id ON bed_allocations(patient_id);
CREATE INDEX IF NOT EXISTS idx_bed_allocations_bed_id ON bed_allocations(bed_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient_id ON patient_visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_symptoms_patient_id ON patient_symptoms(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_allergies_patient_id ON patient_allergies(patient_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_visits_updated_at BEFORE UPDATE ON patient_visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bed_allocations_updated_at BEFORE UPDATE ON bed_allocations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_symptoms_updated_at BEFORE UPDATE ON patient_symptoms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patient_allergies_updated_at BEFORE UPDATE ON patient_allergies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Medical History Table
CREATE TABLE IF NOT EXISTS medical_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- e.g., 'Diagnosis', 'Surgery', 'Hospitalization', 'Medication'
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    details TEXT,
    doctor_name VARCHAR(255),
    facility_name VARCHAR(255),
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TRIGGER update_medical_history_updated_at BEFORE UPDATE ON medical_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO doctors (doctor_id, license_number, specialization, department, qualification, experience_years, consultation_fee, room_number, floor_number) VALUES
('DR001', 'LIC001', 'Cardiology', 'Internal Medicine', 'MD Cardiology', 15, 500.00, '201', 2),
('DR002', 'LIC002', 'Pediatrics', 'Pediatrics', 'MD Pediatrics', 12, 400.00, '102', 1),
('DR003', 'LIC003', 'Orthopedics', 'Surgery', 'MS Orthopedics', 10, 600.00, '301', 3),
('DR004', 'LIC004', 'Neurology', 'Neurology', 'DM Neurology', 18, 700.00, '401', 4),
('DR005', 'LIC005', 'General Medicine', 'Internal Medicine', 'MBBS, MD', 8, 300.00, '101', 1);

-- Insert sample beds
INSERT INTO beds (bed_id, bed_number, room_number, floor_number, ward_name, bed_type, status) VALUES
('BED001', '101', 'R101', 1, 'General Ward', 'general', 'available'),
('BED002', '102', 'R102', 1, 'General Ward', 'general', 'available'),
('BED003', '201', 'R201', 2, 'ICU', 'icu', 'available'),
('BED004', '202', 'R202', 2, 'ICU', 'icu', 'available'),
('BED005', '301', 'R301', 3, 'Private Ward', 'private', 'available'),
('BED006', '302', 'R302', 3, 'Private Ward', 'private', 'available'),
('BED007', '401', 'R401', 4, 'Pediatric Ward', 'pediatric', 'available'),
('BED008', '402', 'R402', 4, 'Pediatric Ward', 'pediatric', 'available');

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE bed_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - can be enhanced based on requirements)
CREATE POLICY "All authenticated users can view user data" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Patients can view their own data" ON patients FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "Doctors can view their own data" ON doctors FOR SELECT USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));
CREATE POLICY "All authenticated users can view appointments" ON appointments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view patient visits" ON patient_visits FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view vitals" ON vitals FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view beds" ON beds FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view bed allocations" ON bed_allocations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view patient symptoms" ON patient_symptoms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "All authenticated users can view patient allergies" ON patient_allergies FOR SELECT USING (auth.role() = 'authenticated'); 
CREATE POLICY "All authenticated users can view medical history" ON medical_history FOR SELECT USING (auth.role() = 'authenticated'); 