# Pharmacy Billing (*/pharmacy/billing*) - Supabase Tables Used

## Source page

- `app/pharmacy/billing/page.tsx`
- `src/components/BillEditModal.tsx`
- `src/lib/supabase.ts` (used for `getCurrentUserProfile()`)

## Supabase project

- URL: `https://zusheijhebsmjiyyeiqq.supabase.co`
- Supabase project ref (project_id): `zusheijhebsmjiyyeiqq`

## Tables referenced by the Pharmacy Billing UI

Each entry below is **directly referenced** via `supabase.from('<table>')` in the above files.

| Table | Where used | Purpose in this screen | Exists in Supabase (public schema) |
|---|---|---|---|
| `hospital_settings` | `app/pharmacy/billing/page.tsx` | Loads pharmacy header details (name/address/GST) | Yes |
| `medications` | `app/pharmacy/billing/page.tsx` | Loads medication master list to support advanced filters | Yes |
| `billing` | `app/pharmacy/billing/page.tsx` | Primary list of bills; updates payment status/method; deletes bills | Yes |
| `billing_item` | `app/pharmacy/billing/page.tsx`, `src/components/BillEditModal.tsx` | Bill line items used for filtering/viewing/editing; deleted during bill delete | Yes |
| `billing_payments` | `app/pharmacy/billing/page.tsx` | Stores split payments; loaded in view modal; inserted/deleted when marking paid or deleting bill | Yes |
| `patients` | `app/pharmacy/billing/page.tsx` | Resolves patient UHID (`patients.patient_id`) for bills having `patient_id` | Yes |
| `staff` | `app/pharmacy/billing/page.tsx` | Resolves `staff_name` for `staff_id` on bills | Yes |
| `sales_returns` | `app/pharmacy/billing/page.tsx` | Return badges + return details in the view modal | Yes |
| `sales_return_items` | `app/pharmacy/billing/page.tsx` | Items inside each sales return | Yes |
| `users` | `src/lib/supabase.ts` (called by `page.tsx`) | `getCurrentUserProfile()` reads the signed-in user profile/role (admin check) | Yes |

---

## Full column definitions for each table

### hospital_settings
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | |
| department | text | NO | |
| address | text | NO | |
| contact_number | text | NO | |
| gst_number | text | NO | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### medications
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| name | text | NO | |
| generic_name | text | YES | |
| dosage_form | text | YES | |
| strength | text | YES | |
| manufacturer | text | YES | |
| category | text | YES | |
| schedule | text | YES | |
| combination | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### billing
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| encounter_id | uuid | YES | |
| patient_id | uuid | YES | |
| bill_no | text | YES | |
| currency | text | NO | 'INR' |
| subtotal | numeric | NO | 0 |
| discount | numeric | NO | 0 |
| tax | numeric | NO | 0 |
| total | numeric | YES | |
| status_id | uuid | YES | |
| issued_at | timestamptz | NO | now() |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| discount_type | text | NO | 'amount' |
| discount_value | numeric(12,2) | NO | 0 |
| tax_percent | numeric(5,2) | NO | 0 |
| customer_name | text | YES | |
| customer_phone | text | YES | |
| customer_type | text | YES | |
| payment_method | text | YES | |
| payment_status | text | NO | 'pending' |
| bill_number | text | YES | |
| amount_paid | numeric(12,2) | NO | 0 |
| balance_due | numeric(12,2) | NO | 0 |
| staff_id | uuid | YES | |
| payment_attachment_url | text | YES | |
| payment_attachment_name | varchar(255) | YES | |
| payment_attachment_uploaded_at | timestamptz | YES | |
| payment_attachment_uploaded_by | uuid | YES | |
| edited_at | timestamptz | YES | |
| edited_by | uuid | YES | |
| edit_count | integer | YES | 0 |
| advance_amount | numeric(12,2) | YES | 0 |
| bed_allocation_id | uuid | YES | |
| bill_type | text | YES | |
| cgst_amount | numeric(12,2) | YES | 0 |
| sgst_amount | numeric(12,2) | YES | 0 |
| igst_amount | numeric(12,2) | YES | 0 |
| customer_gstin | varchar(15) | YES | |

### billing_item
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| billing_id | uuid | NO | |
| line_type_id | uuid | NO | |
| ref_id | uuid | YES | |
| description | text | NO | |
| qty | numeric | NO | 1 |
| unit_amount | numeric(12,2) | YES | |
| total_amount | numeric(12,2) | YES | |
| medicine_id | uuid | YES | |
| batch_number | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### billing_payments
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| billing_id | uuid | NO | |
| payment_method | text | NO | |
| amount | numeric(12,2) | NO | |
| payment_date | timestamptz | NO | now() |
| reference_number | text | YES | |
| notes | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### patients
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| patient_id | text | NO | |
| title | text | YES | |
| first_name | text | NO | |
| last_name | text | NO | |
| gender | text | NO | |
| date_of_birth | date | YES | |
| age | integer | YES | |
| phone | text | YES | |
| email | text | YES | |
| address | text | YES | |
| blood_group | text | YES | |
| emergency_contact_name | text | YES | |
| emergency_contact_phone | text | YES | |
| marital_status | text | YES | |
| occupation | text | YES | |
| nationality | text | YES | |
| religion | text | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| user_id | uuid | YES | |
| status | text | YES | 'active' |

### staff
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| employee_id | text | NO | |
| first_name | text | NO | |
| last_name | text | NO | |
| email | text | YES | |
| phone | text | YES | |
| department_id | uuid | YES | |
| role | text | NO | |
| hire_date | date | YES | CURRENT_DATE |
| specialization | text | YES | |
| is_active | boolean | YES | true |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| pf_number | text | YES | |
| esic_number | text | YES | |
| deleted_at | timestamptz | YES | |
| training_category | text | YES | |
| user_id | uuid | YES | |

### sales_returns
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| bill_id | uuid | NO | |
| return_number | text | NO | |
| return_date | date | YES | |
| reason | text | YES | |
| refund_mode | text | YES | |
| refund_amount | numeric(12,2) | YES | |
| status | text | YES | 'pending' |
| cgst_amount | numeric(12,2) | YES | 0 |
| sgst_amount | numeric(12,2) | YES | 0 |
| igst_amount | numeric(12,2) | YES | 0 |
| total_tax | numeric(12,2) | YES | 0 |
| net_amount | numeric(12,2) | YES | 0 |
| remarks | text | YES | |
| approved_by | uuid | YES | |
| approved_at | timestamptz | YES | |
| created_by | uuid | YES | |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### sales_return_items
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| return_id | uuid | NO | |
| medication_id | uuid | YES | |
| batch_number | text | YES | |
| quantity | numeric | NO | |
| selling_rate | numeric(12,2) | YES | |
| total_amount | numeric(12,2) | YES | |
| return_reason | text | YES | |
| restock_status | text | YES | 'pending' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |

### users
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| auth_id | uuid | YES | |
| employee_id | varchar(20) | YES | |
| name | varchar(100) | NO | |
| email | varchar(255) | NO | |
| role | varchar(50) | NO | |
| specialization | varchar(100) | YES | |
| department | varchar(100) | YES | |
| phone | varchar(20) | YES | |
| address | text | YES | |
| joined_date | date | YES | CURRENT_DATE |
| status | varchar(20) | YES | 'active' |
| permissions | jsonb | YES | '{}' |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| party_id | uuid | YES | |

## Notes / caveats

- This page uses `billing` + `billing_item` as the pharmacy billing storage (not `pharmacy_bills`).
- `src/lib/pharmacyService.ts` contains a `supabase.rpc('create_billing_with_items', ...)` helper, but that RPC is **not called** by `app/pharmacy/billing/page.tsx`.

## How the “exists” check was verified

- Existence was checked against the connected Supabase project (`zusheijhebsmjiyyeiqq`) by resolving each table with `to_regclass('public.<table>')`.
