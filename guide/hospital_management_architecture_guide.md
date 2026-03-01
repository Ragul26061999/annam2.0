# 🏥 Hospital Management System (HMS) - Developer Architecture Guide

## 📁 Monorepo Architecture Overview

We recommend using a **modular monorepo** architecture with shared components for scalable, secure, and maintainable development.

### Directory Structure

```bash
/hospital-app
├── apps/
│   ├── admin-panel/
│   ├── doctor-dashboard/
│   ├── patient-portal/
│   ├── pharmacy-portal/
│   ├── receptionist-kiosk/
│   ├── accountant-console/
│   ├── nurse-interface/
│   ├── technician-console/
│   └── md-panel/
├── shared/
│   ├── ui-components/
│   ├── api-services/
│   ├── auth-utils/
│   └── config/
```

### Tools

- **Nx / Turborepo** for managing builds and dependency graphs.
- **Yarn/NPM Workspaces** for efficient package management.

---

## 🔐 Role-Based Access Control Strategy

### Authentication & Authorization

- Use JWT with roles encoded.
- Context Provider (React) or Role Hooks to access user role throughout the app.
- Always validate role in both **frontend** and **backend**.

### Backend Enforcement

- RBAC Middleware: Enforce access to APIs via middleware based on role.

```ts
function requireRole(allowedRoles) {
  return function (req, res, next) {
    const user = req.user;
    if (!allowedRoles.includes(user.role)) return res.status(403).send('Forbidden');
    next();
  };
}
```

---

## 👥 Defined User Roles

### 1. Administrative Roles

- **admin** – System administrator with full access.
- **md** – Medical Director/Chief Doctor with oversight responsibilities.
- **receptionist** – Handles patient registration, appointment scheduling.
- **accountant** – Manages billing, financial records, revenue tracking.

### 2. Medical Staff

- **chief\_doctor** – Senior-most medical authority in departments.
- **doctor** – General and specialized practitioners.
- **nurse** – Responsible for patient vitals, medication, bedside care.

### 3. Support Staff

- **pharmacist** – Prescription handling, medicine inventory.
- **technician** – Lab operations, test reporting, diagnostics.

### 4. Patient Role

- **patient** – Registered users with portal access to health data, appointments.

---

## 🧭 Dynamic Sidebar (Role-Based Navigation)

### Config Setup

```ts
// shared/config/roleRoutes.ts
export const sidebarRoutes = {
  receptionist: [
    { label: 'Patients', path: '/patient-dashboard' },
    { label: 'Appointments', path: '/appointments' },
  ],
  admin: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Users', path: '/manage-users' },
    { label: 'Settings', path: '/settings' },
  ],
  md: [
    { label: 'Reports', path: '/reports' },
    { label: 'Patients', path: '/patient-dashboard' },
  ],
  accountant: [
    { label: 'Billing', path: '/billing' },
    { label: 'Finance Reports', path: '/finance-reports' },
  ],
  doctor: [
    { label: 'My Schedule', path: '/schedule' },
    { label: 'Patient Records', path: '/records' },
  ],
  nurse: [
    { label: 'Patient Care', path: '/care' },
    { label: 'Vitals Entry', path: '/vitals' },
  ],
  pharmacist: [
    { label: 'Prescriptions', path: '/prescriptions' },
    { label: 'Inventory', path: '/inventory' },
  ],
  technician: [
    { label: 'Lab Tests', path: '/lab-tests' },
    { label: 'Diagnostics', path: '/diagnostics' },
  ],
  patient: [
    { label: 'My Appointments', path: '/my-appointments' },
    { label: 'Medical History', path: '/medical-history' },
  ]
};
```

### Sidebar Component

```tsx
const Sidebar = () => {
  const { role } = useUser();
  const routes = sidebarRoutes[role] || [];

  return (
    <nav>
      {routes.map((r) => (
        <Link to={r.path}>{r.label}</Link>
      ))}
    </nav>
  );
};
```

---

## 🛡️ Route Guards

```tsx
const RequireRole = ({ allowedRoles, children }) => {
  const { role } = useUser();
  if (!allowedRoles.includes(role)) return <UnauthorizedPage />;
  return children;
};

// Usage
<Route
  path="/patient-dashboard"
  element={<RequireRole allowedRoles={['admin', 'receptionist', 'md']}><PatientDashboard /></RequireRole>}
/>
```

---

## 📡 Role-Based Service Layer

### Example Hook

```ts
export const usePatientData = () => {
  const { role } = useUser();

  if (role === 'doctor') return fetch('/api/doctor/patients');
  if (role === 'admin') return fetch('/api/admin/patients');

  return fetch('/api/patients');
};
```

---

## 📋 Shared Component Design

- Use base components (e.g., `Button`, `Card`, `Table`) in `/shared/ui-components/`
- Customize views with role-based composition (e.g., `DoctorPatientActions`, `ReceptionistActions`)

---

## 🔄 Data Access and Security

- **Backend** must validate every action by role.
- Use **row-level security (RLS)** if using PostgreSQL/Supabase.
- Implement **Audit Logs** for sensitive activities.
- Sanitize and validate all incoming data.

---

## 📦 Deployment Tips

- Use Docker containers per app (or role-app).
- Environment variable-based config for backend services.
- Use CI/CD (GitHub Actions, GitLab CI) for deploying independently per app.

---

## ✅ Final Notes

- Never rely solely on frontend role checks.
- Keep role config centralized and consistent.
- Reuse logic where possible, but isolate role-specific views/actions.
- Write tests to cover permissions and role-based logic.

---

**Maintainer:** DevOps / Tech Lead

*Last Updated: July 2025*

