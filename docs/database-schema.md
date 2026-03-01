# Hospital Management System - Database Schema Documentation

## Overview
This document provides a comprehensive overview of the database schema for the Hospital Management System built with Supabase PostgreSQL. The system manages patients, doctors, appointments, bed allocations, billing, and other hospital operations.

## Database Configuration
- **Database**: PostgreSQL (Supabase)
- **UUID Extension**: Enabled (`uuid-ossp`)
- **Row Level Security (RLS)**: Enabled on all tables
- **Timezone**: UTC for all timestamps

## Custom Types

### Enums
```sql
-- User roles in the system
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'nurse', 'receptionist', 'patient');

-- Appointment statuses
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');

-- Bed types available
CREATE TYPE bed_type AS ENUM ('general', 'icu', 'private', 'semi_private', 'pediatric', 'maternity');

-- Bed availability status
CREATE TYPE bed_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved');

-- Types of hospital admissions
CREATE TYPE admission_type AS ENUM ('emergency', 'elective', 'transfer', 'observation');
```

## Core Tables

### 1. Users Table
**Purpose**: Central user management for all system users (doctors, staff, patients)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| auth_id | UUID | UNIQUE | Supabase Auth user ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| full_name | VARCHAR(255) | NOT NULL | User's full name |
| phone | VARCHAR(20) | | Phone number |
| role | user_role | NOT NULL, DEFAULT 'patient' | User role in system |
| is_active | BOOLEAN | DEFAULT true | Account status |
| profile_image_url | TEXT | | Profile picture URL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_users_auth_id` on auth_id
- `idx_users_email` on email
- `idx_users_role` on role

---

### 2. Patients Table
**Purpose**: Store patient-specific information and medical details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | REFERENCES users(id) | Link to users table |
| patient_id | VARCHAR(20) | UNIQUE, NOT NULL | Human-readable patient ID |
| date_of_birth | DATE | NOT NULL | Patient's birth date |
| gender | VARCHAR(10) | NOT NULL | Patient's gender |
| blood_group | VARCHAR(5) | | Blood type |
| address | TEXT | | Home address |
| emergency_contact_name | VARCHAR(255) | | Emergency contact person |
| emergency_contact_phone | VARCHAR(20) | | Emergency contact number |
| emergency_contact_relation | VARCHAR(50) | | Relationship to patient |
| medical_history | TEXT | | Previous medical history |
| allergies | TEXT | | Known allergies |
| current_medications | TEXT | | Current medications |
| insurance_provider | VARCHAR(255) | | Insurance company |
| insurance_policy_number | VARCHAR(100) | | Policy number |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_patients_patient_id` on patient_id
- `idx_patients_user_id` on user_id

---

### 3. Doctors Table
**Purpose**: Store doctor-specific information and professional details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| user_id | UUID | REFERENCES users(id) | Link to users table |
| license_number | VARCHAR(50) | UNIQUE, NOT NULL | Medical license number |
| specialization | VARCHAR(255) | NOT NULL | Medical specialization |
| qualification | VARCHAR(255) | | Educational qualifications |
| years_of_experience | INTEGER | | Years of practice |
| consultation_fee | DECIMAL(10,2) | | Consultation charges |
| availability_hours | JSONB | | Working hours schedule |
| room_number | VARCHAR(20) | | Office/clinic room |
| max_patients_per_day | INTEGER | DEFAULT 50 | Daily patient limit |
| status | VARCHAR(20) | DEFAULT 'active' | Doctor availability status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_doctors_license_number` on license_number
- `idx_doctors_specialization` on specialization
- `idx_doctors_user_id` on user_id

---

### 4. Departments Table
**Purpose**: Hospital department management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| name | VARCHAR(255) | UNIQUE, NOT NULL | Department name |
| description | TEXT | | Department description |
| head_of_department | UUID | REFERENCES doctors(id) | Department head |
| location | VARCHAR(255) | | Physical location |
| phone | VARCHAR(20) | | Department phone |
| status | VARCHAR(20) | DEFAULT 'active' | Department status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

---

### 5. Appointments Table
**Purpose**: Manage patient appointments with doctors

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| appointment_id | VARCHAR(30) | UNIQUE, NOT NULL | Human-readable appointment ID |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| doctor_id | UUID | REFERENCES doctors(id) | Doctor reference |
| appointment_date | DATE | NOT NULL | Appointment date |
| appointment_time | TIME | NOT NULL | Appointment time |
| duration_minutes | INTEGER | DEFAULT 30 | Expected duration |
| type | VARCHAR(50) | | Appointment type |
| status | appointment_status | DEFAULT 'scheduled' | Current status |
| notes | TEXT | | Additional notes |
| symptoms | TEXT | | Patient symptoms |
| diagnosis | TEXT | | Doctor's diagnosis |
| prescription | TEXT | | Prescribed medications |
| follow_up_date | DATE | | Next appointment date |
| fee | DECIMAL(10,2) | | Consultation fee |
| created_by | UUID | REFERENCES users(id) | Who created the appointment |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_appointments_patient_id` on patient_id
- `idx_appointments_doctor_id` on doctor_id
- `idx_appointments_date` on appointment_date
- `idx_appointments_status` on status

---

### 6. Beds Table
**Purpose**: Hospital bed inventory management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| bed_number | VARCHAR(20) | UNIQUE, NOT NULL | Bed identifier |
| room_number | VARCHAR(20) | NOT NULL | Room location |
| department_id | UUID | REFERENCES departments(id) | Department assignment |
| bed_type | bed_type | | Type of bed |
| floor_number | INTEGER | | Floor location |
| daily_rate | DECIMAL(10,2) | | Daily charges |
| status | bed_status | DEFAULT 'available' | Current availability |
| features | TEXT[] | | Bed features/equipment |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_beds_bed_number` on bed_number
- `idx_beds_status` on status
- `idx_beds_department_id` on department_id

---

### 7. Bed Allocations Table
**Purpose**: Track patient bed assignments and admissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| bed_id | UUID | REFERENCES beds(id) | Bed reference |
| doctor_id | UUID | REFERENCES doctors(id) | Attending doctor |
| admission_date | TIMESTAMPTZ | DEFAULT NOW() | Admission timestamp |
| discharge_date | TIMESTAMPTZ | | Discharge timestamp |
| admission_type | admission_type | | Type of admission |
| reason | TEXT | | Reason for admission |
| status | VARCHAR(20) | DEFAULT 'active' | Allocation status |
| daily_charges | DECIMAL(10,2) | | Daily bed charges |
| total_charges | DECIMAL(10,2) | | Total charges |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_bed_allocations_patient_id` on patient_id
- `idx_bed_allocations_bed_id` on bed_id
- `idx_bed_allocations_status` on status

---

### 8. Billing Table
**Purpose**: Financial transactions and billing management

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| bill_id | VARCHAR(30) | UNIQUE, NOT NULL | Human-readable bill ID |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| appointment_id | UUID | REFERENCES appointments(id) | Related appointment |
| bed_allocation_id | UUID | REFERENCES bed_allocations(id) | Related bed allocation |
| bill_date | DATE | DEFAULT CURRENT_DATE | Bill generation date |
| items | JSONB | NOT NULL | Itemized charges |
| subtotal | DECIMAL(10,2) | NOT NULL | Pre-tax amount |
| tax_amount | DECIMAL(10,2) | DEFAULT 0 | Tax charges |
| discount_amount | DECIMAL(10,2) | DEFAULT 0 | Discount applied |
| total_amount | DECIMAL(10,2) | NOT NULL | Final amount |
| payment_status | VARCHAR(20) | DEFAULT 'pending' | Payment status |
| payment_method | VARCHAR(50) | | Payment method used |
| payment_date | DATE | | Payment completion date |
| created_by | UUID | REFERENCES users(id) | Bill creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

**Indexes**: 
- `idx_billing_bill_id` on bill_id
- `idx_billing_patient_id` on patient_id
- `idx_billing_payment_status` on payment_status

---

### 9. Patient Visits Table
**Purpose**: Track individual patient visits and medical records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| visit_id | VARCHAR(30) | UNIQUE, NOT NULL | Human-readable visit ID |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| doctor_id | UUID | REFERENCES doctors(id) | Attending doctor |
| appointment_id | UUID | REFERENCES appointments(id) | Related appointment |
| visit_date | DATE | NOT NULL | Visit date |
| visit_time | TIME | NOT NULL | Visit time |
| visit_type | VARCHAR(50) | | Type of visit |
| chief_complaint | TEXT | | Main complaint |
| symptoms | TEXT | | Reported symptoms |
| diagnosis | TEXT | | Medical diagnosis |
| treatment_plan | TEXT | | Treatment recommendations |
| prescription | TEXT | | Prescribed medications |
| follow_up_instructions | TEXT | | Follow-up care |
| next_visit_date | DATE | | Scheduled next visit |
| visit_notes | TEXT | | Additional notes |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

**Indexes**: 
- `idx_patient_visits_patient_id` on patient_id
- `idx_patient_visits_doctor_id` on doctor_id
- `idx_patient_visits_visit_date` on visit_date

---

### 10. Vitals Table
**Purpose**: Store patient vital signs and measurements

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| visit_id | UUID | REFERENCES patient_visits(id) | Related visit |
| recorded_by | UUID | REFERENCES users(id) | Staff who recorded |
| temperature | DECIMAL(4,1) | | Body temperature (°F) |
| blood_pressure_systolic | INTEGER | | Systolic BP |
| blood_pressure_diastolic | INTEGER | | Diastolic BP |
| heart_rate | INTEGER | | Heart rate (BPM) |
| respiratory_rate | INTEGER | | Breathing rate |
| oxygen_saturation | DECIMAL(5,2) | | O2 saturation (%) |
| weight | DECIMAL(5,2) | | Weight (kg) |
| height | DECIMAL(5,2) | | Height (cm) |
| bmi | DECIMAL(4,1) | | Body Mass Index |
| recorded_at | TIMESTAMPTZ | DEFAULT NOW() | Recording timestamp |
| notes | TEXT | | Additional observations |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |

**Indexes**: 
- `idx_vitals_patient_id` on patient_id
- `idx_vitals_visit_id` on visit_id
- `idx_vitals_recorded_at` on recorded_at

---

## Additional Tables

### 11. Patient Symptoms Table
**Purpose**: Track evolving patient symptoms over time

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| visit_id | UUID | REFERENCES patient_visits(id) | Related visit |
| symptom_name | VARCHAR(255) | NOT NULL | Symptom description |
| severity | INTEGER | CHECK (1-10) | Severity scale |
| description | TEXT | | Detailed description |
| onset_date | DATE | | When symptom started |
| resolved_date | DATE | | When symptom resolved |
| status | VARCHAR(20) | DEFAULT 'active' | Current status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 12. Patient Allergies Table
**Purpose**: Maintain patient allergy records

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| allergen | VARCHAR(255) | NOT NULL | Allergen name |
| reaction | TEXT | | Allergic reaction |
| severity | VARCHAR(20) | DEFAULT 'mild' | Severity level |
| discovered_date | DATE | | When allergy discovered |
| status | VARCHAR(20) | DEFAULT 'active' | Current status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

### 13. Medical History Table
**Purpose**: Store comprehensive patient medical history

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique identifier |
| patient_id | UUID | REFERENCES patients(id) | Patient reference |
| event_type | VARCHAR(100) | NOT NULL | Type of medical event |
| event_name | VARCHAR(255) | NOT NULL | Event description |
| event_date | DATE | NOT NULL | When event occurred |
| details | TEXT | | Additional details |
| doctor_name | VARCHAR(255) | | Attending physician |
| facility_name | VARCHAR(255) | | Medical facility |
| recorded_by | UUID | REFERENCES users(id) | Who recorded this |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |

---

## Database Relationships

### Primary Relationships
1. **Users → Patients**: One-to-one relationship via `user_id`
2. **Users → Doctors**: One-to-one relationship via `user_id`
3. **Patients → Appointments**: One-to-many relationship
4. **Doctors → Appointments**: One-to-many relationship
5. **Patients → Bed Allocations**: One-to-many relationship
6. **Beds → Bed Allocations**: One-to-many relationship
7. **Patients → Billing**: One-to-many relationship
8. **Appointments → Billing**: One-to-one relationship (optional)
9. **Bed Allocations → Billing**: One-to-one relationship (optional)

### Secondary Relationships
- **Departments → Doctors**: One-to-many (head_of_department)
- **Departments → Beds**: One-to-many
- **Patient Visits → Vitals**: One-to-many
- **Patients → Patient Symptoms**: One-to-many
- **Patients → Patient Allergies**: One-to-many
- **Patients → Medical History**: One-to-many

---

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled with basic policies:
- **Users**: Authenticated users can view user data
- **Patients**: Patients can view their own data
- **Doctors**: Doctors can view their own data
- **Other tables**: All authenticated users have read access

### Indexes for Performance
Strategic indexes are created on:
- Foreign key columns
- Frequently queried columns (patient_id, doctor_id, dates)
- Unique identifiers and status fields

### Triggers
Automatic `updated_at` timestamp triggers on all tables with update capability.

---

## Data Integration Architecture

### 1. Authentication Layer
- **Supabase Auth**: Handles user authentication and authorization
- **User Management**: Central users table links to all role-specific tables
- **Role-Based Access**: Different user roles (admin, doctor, nurse, receptionist, patient)

### 2. Core Business Logic
- **Patient Management**: Complete patient lifecycle from registration to discharge
- **Appointment System**: Scheduling, tracking, and management of patient appointments
- **Bed Management**: Real-time bed availability and allocation tracking
- **Billing System**: Comprehensive financial transaction management

### 3. Data Flow Architecture

#### Patient Registration Flow
```
User Registration (Supabase Auth) → Users Table → Patients Table → Generate Patient ID
```

#### Appointment Booking Flow
```
Patient Selection → Doctor Selection → Time Slot Validation → Appointment Creation → Notification
```

#### Admission Process Flow
```
Patient → Bed Availability Check → Bed Allocation → Billing Setup → Medical Records
```

#### Billing Process Flow
```
Services Rendered → Item Collection → Bill Generation → Payment Processing → Receipt
```

### 4. Integration Points

#### Frontend Integration
- **React/Next.js**: Frontend application consuming Supabase APIs
- **Real-time Updates**: Supabase real-time subscriptions for live data
- **File Storage**: Supabase Storage for documents and images

#### External Integrations
- **Payment Gateways**: Integration ready for payment processing
- **SMS/Email**: Notification system integration points
- **Insurance Systems**: API endpoints for insurance verification
- **Laboratory Systems**: Integration for test results

### 5. Data Consistency Measures
- **Foreign Key Constraints**: Maintain referential integrity
- **Check Constraints**: Validate data ranges and formats
- **Unique Constraints**: Prevent duplicate records
- **Triggers**: Automatic timestamp updates and data validation

### 6. Scalability Considerations
- **UUID Primary Keys**: Distributed system friendly
- **Indexed Queries**: Optimized for common query patterns
- **Partitioning Ready**: Large tables can be partitioned by date
- **Archive Strategy**: Historical data management capabilities

---

## Sample Data
The schema includes sample data for:
- 5 sample doctors with different specializations
- 8 sample beds across different wards
- Department structure
- Basic configuration data

This comprehensive schema supports a full-featured Hospital Management System with room for expansion and customization based on specific hospital requirements.