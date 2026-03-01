# Hospital Management System - Developer Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Services](#api-services)
7. [Frontend Components](#frontend-components)
8. [Development Setup](#development-setup)
9. [Key Features](#key-features)
10. [Security Implementation](#security-implementation)

## Project Overview

This Hospital Management System is a comprehensive healthcare solution built with Next.js and Supabase. The system manages patients, doctors, appointments, bed allocations, billing, laboratory tests, prescriptions, and vital signs tracking.

### Key Characteristics
- **Architecture**: Modular monorepo structure
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Frontend**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth with JWT tokens
- **State Management**: React hooks and context
- **UI Components**: Custom components with Lucide React icons

## Technology Stack

### Core Technologies
- **Next.js 14+**: React framework for production
- **TypeScript**: Type-safe JavaScript
- **Supabase**: Backend-as-a-Service (PostgreSQL + Auth + Storage)
- **Tailwind CSS**: Utility-first CSS framework

### Key Dependencies
```json
{
  "@supabase/supabase-js": "Latest",
  "date-fns": "Date manipulation",
  "framer-motion": "Animation library",
  "lucide-react": "Icon library",
  "recharts": "Chart library",
  "react-transition-group": "Transition components"
}
```

## Project Architecture

### Directory Structure
```
project/
├── next-app/                 # Next.js application
│   ├── app/                  # App router pages
│   ├── components/           # Reusable UI components
│   └── src/
│       ├── lib/             # Utility libraries
│       │   ├── supabase.ts  # Supabase client configuration
│       │   └── services/    # API service layers
│       └── types/           # TypeScript type definitions
├── docs/                    # Documentation
└── database-setup.sql       # Database schema
```

### Service Layer Architecture
The application follows a service-oriented architecture with dedicated service files:

- **patientService.ts**: Patient registration, UHID generation, patient management
- **doctorService.ts**: Doctor management, specializations, availability
- **appointmentService.ts**: Appointment scheduling, status management
- **bedAllocationService.ts**: Bed management, allocation tracking
- **vitalsService.ts**: Vital signs recording and monitoring

## Database Schema

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id VARCHAR UNIQUE NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  phone VARCHAR,
  address TEXT,
  date_of_birth DATE,
  gender VARCHAR,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Patients Table
```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  patient_id VARCHAR UNIQUE NOT NULL, -- UHID
  emergency_contact_name VARCHAR,
  emergency_contact_phone VARCHAR,
  blood_group VARCHAR,
  allergies TEXT[],
  medical_history TEXT,
  admission_date TIMESTAMPTZ DEFAULT now(),
  admission_type VARCHAR,
  consulting_doctor_id UUID REFERENCES doctors(id),
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 3. Doctors Table
```sql
CREATE TABLE doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  license_number VARCHAR UNIQUE NOT NULL,
  specialization VARCHAR NOT NULL,
  qualification VARCHAR,
  years_of_experience INTEGER,
  consultation_fee NUMERIC,
  availability_hours JSONB,
  room_number VARCHAR,
  max_patients_per_day INTEGER DEFAULT 50,
  status VARCHAR DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. Appointments Table
```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id VARCHAR UNIQUE NOT NULL,
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  type VARCHAR,
  status VARCHAR DEFAULT 'scheduled',
  notes TEXT,
  symptoms TEXT,
  diagnosis TEXT,
  prescription TEXT,
  follow_up_date DATE,
  fee NUMERIC,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. Beds Table
```sql
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_number VARCHAR UNIQUE NOT NULL,
  room_number VARCHAR NOT NULL,
  department_id UUID REFERENCES departments(id),
  bed_type VARCHAR,
  floor_number INTEGER,
  daily_rate NUMERIC,
  status VARCHAR DEFAULT 'available',
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. Bed Allocations Table
```sql
CREATE TABLE bed_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_id UUID REFERENCES beds(id),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES doctors(id),
  admission_date TIMESTAMPTZ DEFAULT now(),
  discharge_date TIMESTAMPTZ,
  admission_type VARCHAR,
  reason TEXT,
  status VARCHAR DEFAULT 'active',
  daily_charges NUMERIC,
  total_charges NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. Vitals Table
```sql
CREATE TABLE vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  recorded_date TIMESTAMPTZ DEFAULT now(),
  height NUMERIC,
  weight NUMERIC,
  bmi NUMERIC,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  temperature NUMERIC,
  respiratory_rate INTEGER,
  oxygen_saturation NUMERIC,
  blood_sugar NUMERIC,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. Additional Tables
- **departments**: Hospital departments management
- **billing**: Financial transactions and billing
- **lab_tests**: Laboratory test definitions
- **lab_reports**: Test results and reports
- **medicines**: Pharmacy inventory
- **prescriptions**: Medical prescriptions
- **staff**: Non-medical staff management

### Database Indexes

Key performance indexes are implemented:

```sql
-- Appointments
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- Patients
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_user_id ON patients(user_id);
CREATE INDEX idx_patients_consulting_doctor ON patients(consulting_doctor_id);

-- Beds
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_bed_allocations_active ON bed_allocations(status) WHERE status = 'active';

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## Authentication & Authorization

### User Roles
The system implements Role-Based Access Control (RBAC) with the following roles:

1. **admin**: Full system access
2. **md**: Medical Director - oversight and management
3. **doctor**: Medical practitioners
4. **nurse**: Nursing staff
5. **receptionist**: Front desk operations
6. **accountant**: Financial operations
7. **pharmacist**: Pharmacy management
8. **technician**: Laboratory and technical staff
9. **patient**: Patient portal access

### Row Level Security (RLS)

Supabase RLS policies are implemented:

```sql
-- Users table policies
CREATE POLICY "Allow role checking during login" ON users
  FOR SELECT TO anon USING (true);

CREATE POLICY "Users can read user data for authentication" ON users
  FOR SELECT TO public USING (auth.role() = 'authenticated');

-- Vitals table policies
CREATE POLICY "Allow authenticated users to read vitals" ON vitals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert vitals" ON vitals
  FOR INSERT TO authenticated;

CREATE POLICY "Allow users to update their own recorded vitals" ON vitals
  FOR UPDATE TO authenticated USING (auth.uid() = recorded_by);
```

### Authentication Service

```typescript
// src/lib/supabase.ts
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
```

## API Services

### Patient Service

```typescript
// Key functions in patientService.ts

// Generate unique UHID
export const generateUHID = async (): Promise<string> => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `UHID${timestamp}${random}`;
};

// Register new patient
export const registerPatient = async (patientData: PatientRegistrationData) => {
  // Implementation includes UHID generation, auth user creation, and patient record insertion
};
```

### Doctor Service

```typescript
// Key functions in doctorService.ts

// Get available doctors by specialization
export const getDoctorsBySpecialization = async (specialization: string) => {
  const { data, error } = await supabase
    .from('doctors')
    .select(`
      *,
      users!inner(*)
    `)
    .eq('specialization', specialization)
    .eq('status', 'active');
  
  return { data, error };
};
```

### Appointment Service

```typescript
// Key functions in appointmentService.ts

// Get available time slots
export const getAvailableSlots = async (doctorId: string, date: string) => {
  // Implementation includes checking doctor availability and existing appointments
};

// Create new appointment
export const createAppointment = async (appointmentData: AppointmentData) => {
  // Implementation includes slot validation and appointment creation
};
```

## Frontend Components

### Key Component Structure

```typescript
// Example: PatientManagement component structure
interface Patient {
  id: string;
  patient_id: string; // UHID
  full_name: string;
  email: string;
  phone: string;
  blood_group: string;
  admission_date: string;
  status: string;
}

const PatientManagement: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Component implementation
};
```

### UI Components
- **PatientManagement.tsx**: Patient registration and management
- **DoctorsManagement.tsx**: Doctor profiles and scheduling
- **BedManagement.tsx**: Bed allocation and tracking
- **AppointmentScheduling**: Appointment booking system
- **VitalsTracking**: Patient vital signs monitoring

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Database Setup
1. Create a new Supabase project
2. Run the `database-setup.sql` script
3. Configure RLS policies
4. Set up authentication providers

## Key Features

### 1. Patient Management
- Unique Hospital ID (UHID) generation
- Patient registration with medical history
- Emergency contact management
- Allergy and medical condition tracking

### 2. Doctor Management
- Specialization-based categorization
- Availability scheduling
- Consultation fee management
- Patient load tracking

### 3. Appointment System
- Time slot management
- Appointment status tracking
- Medical notes and prescriptions
- Follow-up scheduling

### 4. Bed Management
- Real-time bed availability
- Department-wise allocation
- Admission and discharge tracking
- Billing integration

### 5. Vital Signs Monitoring
- Comprehensive vital signs recording
- BMI auto-calculation
- Trend analysis
- Alert system for abnormal values

### 6. Laboratory Management
- Test catalog management
- Report generation
- Result tracking
- Integration with patient records

### 7. Billing System
- Itemized billing
- Payment tracking
- Insurance integration ready
- Financial reporting

## Security Implementation

### Data Protection
- Row Level Security (RLS) on all tables
- JWT-based authentication
- Role-based access control
- Encrypted data transmission

### Best Practices
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF token implementation
- Secure password policies

### Audit Trail
- Created/updated timestamps on all records
- User tracking for all operations
- Change log implementation
- Access logging

## Performance Optimizations

### Database
- Strategic indexing on frequently queried columns
- Query optimization
- Connection pooling
- Caching strategies

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle size optimization

## Future Enhancements

### Planned Features
- Real-time notifications
- Mobile application
- Telemedicine integration
- AI-powered diagnostics
- Advanced reporting and analytics
- Integration with external systems (insurance, labs)

### Scalability Considerations
- Microservices architecture migration
- Database sharding strategies
- CDN implementation
- Load balancing
- Caching layers

---

## Contributing

When contributing to this project:
1. Follow the established coding standards
2. Write comprehensive tests
3. Update documentation
4. Follow the git workflow
5. Ensure security best practices

## Support

For technical support or questions:
- Review this documentation
- Check the existing codebase
- Consult the Supabase documentation
- Follow Next.js best practices

---

*This documentation is maintained and updated regularly. Last updated: [Current Date]*