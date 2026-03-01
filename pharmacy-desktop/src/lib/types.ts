// ============================================================
// PHARMACY DESKTOP - TYPE DEFINITIONS
// Mirrors the web app's pharmacy data models exactly
// ============================================================

export interface Medication {
  id: string;
  medicine_code: string;
  name: string;
  generic_name: string;
  manufacturer: string;
  category: string;
  dosage_form: string;
  strength: string;
  unit: string;
  total_stock: number;
  available_stock: number;
  minimum_stock_level: number;
  purchase_price: number;
  selling_price: number;
  mrp: number;
  prescription_required: boolean;
  storage_conditions?: string;
  side_effects?: string;
  status: "active" | "inactive" | "discontinued";
  location?: string;
  barcode?: string;
  hsn_code?: string;
  gst_percent?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface MedicationBatch {
  id: string;
  medication_id: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  quantity: number;
  available_quantity: number;
  unit_price: number;
  mrp: number;
  rack_location?: string;
  status: "active" | "expired" | "low_stock";
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: string;
  medication_id: string;
  transaction_type: "purchase" | "sale" | "adjustment" | "return" | "expired";
  quantity: number;
  unit_price: number;
  total_amount?: number | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  supplier_id?: string | null;
  notes?: string | null;
  reference_id?: string | null;
  reference_type?: string | null;
  performed_by?: string | null;
  transaction_date?: string | null;
  created_at: string;
}

// ============================================================
// SUPPLIER
// ============================================================
export interface Supplier {
  id: string;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  drug_license_no?: string;
  payment_terms?: string;
  credit_days: number;
  status: "active" | "inactive" | "blacklisted";
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// DRUG PURCHASE
// ============================================================
export interface DrugPurchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier?: Supplier;
  invoice_number?: string;
  invoice_date?: string;
  purchase_date: string;
  subtotal: number;
  discount_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  other_charges: number;
  total_amount: number;
  payment_status: "pending" | "partial" | "paid";
  payment_mode: "cash" | "credit" | "cheque" | "online" | "upi";
  paid_amount: number;
  due_date?: string;
  remarks?: string;
  received_by?: string;
  verified_by?: string;
  status: "draft" | "received" | "verified" | "cancelled";
  items?: DrugPurchaseItem[];
  document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DrugPurchaseItem {
  id?: string;
  purchase_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  manufacturing_date?: string;
  expiry_date: string;
  quantity: number;
  pack_counting: number;
  free_quantity: number;
  unit_price: number;
  mrp: number;
  discount_percent: number;
  discount_amount?: number;
  taxable_amount?: number;
  gst_percent: number;
  cgst_percent: number;
  sgst_percent: number;
  igst_percent: number;
  gst_amount: number;
  total_amount: number;
  hsn_code?: string;
  rack_location?: string;
  free_expiry_date?: string;
  free_mrp?: number;
}

// ============================================================
// PURCHASE RETURN
// ============================================================
export interface PurchaseReturn {
  id: string;
  return_number: string;
  purchase_id?: string;
  supplier_id: string;
  supplier?: Supplier;
  return_date: string;
  subtotal: number;
  gst_amount: number;
  total_amount: number;
  reason:
    | "expired"
    | "damaged"
    | "quality_issue"
    | "wrong_item"
    | "excess_stock"
    | "other";
  reason_details?: string;
  credit_note_number?: string;
  credit_note_date?: string;
  status: "draft" | "submitted" | "approved" | "completed" | "rejected";
  processed_by?: string;
  approved_by?: string;
  items?: PurchaseReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseReturnItem {
  id?: string;
  return_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  reason?: string;
}

// ============================================================
// BILLING
// ============================================================
export interface PharmacyBill {
  id: string;
  bill_number: string;
  patient_id?: string;
  patient_name?: string;
  patient_uhid?: string;
  customer_name?: string;
  customer_type?: string;
  doctor_name?: string;
  subtotal: number;
  discount: number;
  tax_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  total_amount: number;
  amount_paid: number;
  payment_method: "cash" | "card" | "upi" | "insurance" | "online" | "credit";
  payment_status: "pending" | "paid" | "partial" | "refunded";
  staff_id?: string;
  staff_name?: string;
  notes?: string;
  items?: PharmacyBillItem[];
  created_at: string;
  updated_at: string;
}

export interface PharmacyBillItem {
  id?: string;
  bill_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  mrp?: number;
  discount_percent?: number;
  gst_percent?: number;
  total_price: number;
}

// ============================================================
// SALES RETURN
// ============================================================
export interface SalesReturn {
  id: string;
  return_number: string;
  bill_id?: string;
  original_bill_id?: string;
  original_bill_number?: string;
  patient_id?: string;
  customer_name?: string;
  customer_phone?: string;
  return_date: string;
  reason?: string;
  return_reason_code?: string;
  refund_mode?: string;
  refund_amount?: number;
  total_quantity?: number;
  total_amount?: number;
  net_amount?: number;
  total_tax?: number;
  remarks?: string;
  reason_details?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  status: string;
  items?: SalesReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesReturnItem {
  id?: string;
  return_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity: number;
  unit_price: number;
  selling_rate?: number;
  return_reason?: string;
  total_amount: number;
  restock_status: "pending" | "restocked" | "disposed";
  reason?: string;
  gst_percent?: number;
  gst_amount?: number;
}

// ============================================================
// DEPARTMENT DRUG ISSUE
// ============================================================
export interface DepartmentDrugIssue {
  id: string;
  issue_number: string;
  department_id?: string;
  department_name: string;
  requested_by?: string;
  requester_name?: string;
  issue_date: string;
  issue_time?: string;
  purpose?: string;
  total_items: number;
  total_value: number;
  status:
    | "pending"
    | "approved"
    | "issued"
    | "partial"
    | "rejected"
    | "returned";
  approved_by?: string;
  issued_by?: string;
  remarks?: string;
  items?: DepartmentDrugIssueItem[];
  created_at: string;
  updated_at: string;
}

export interface DepartmentDrugIssueItem {
  id?: string;
  issue_id?: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  expiry_date?: string;
  requested_quantity: number;
  issued_quantity: number;
  unit_price?: number;
  total_amount?: number;
  status: "pending" | "issued" | "partial" | "rejected";
  remarks?: string;
}

// ============================================================
// DRUG BROKEN / DAMAGE RECORD
// ============================================================
export interface DrugBrokenRecord {
  id: string;
  record_number: string;
  record_date: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  expiry_date?: string;
  quantity: number;
  unit_price?: number;
  total_loss?: number;
  damage_type:
    | "broken"
    | "leaked"
    | "contaminated"
    | "packaging_damaged"
    | "temperature_damage"
    | "other";
  damage_description?: string;
  location?: string;
  discovered_by?: string;
  discoverer_name?: string;
  verified_by?: string;
  disposal_method?:
    | "disposed"
    | "returned_to_supplier"
    | "pending"
    | "insurance_claim";
  disposal_date?: string;
  insurance_claim_number?: string;
  status: "reported" | "verified" | "disposed" | "claimed";
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CASH COLLECTION
// ============================================================
export interface CashCollection {
  id: string;
  collection_number: string;
  collection_date: string;
  shift: "morning" | "afternoon" | "night" | "general";
  collected_by: string;
  collector_name?: string;
  opening_cash: number;
  cash_sales: number;
  card_collections: number;
  upi_collections: number;
  insurance_collections: number;
  credit_collections: number;
  cash_refunds: number;
  total_collections: number;
  total_bills: number;
  total_returns: number;
  expected_cash: number;
  actual_cash?: number;
  cash_difference: number;
  denominations?: Record<string, number>;
  handover_to?: string;
  handover_time?: string;
  status: "open" | "closed" | "verified" | "discrepancy";
  remarks?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PRESCRIPTION
// ============================================================
export interface MedicationHistory {
  id: string;
  patient_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  dosage_form?: string;
  frequency: string;
  duration: string;
  prescribed_date: string;
  dispensed_date?: string;
  prescribed_by: string;
  dispensed_by?: string;
  status: "prescribed" | "dispensed" | "completed" | "discontinued";
  total_amount?: number;
  payment_status?: string;
  prescription_image_url?: string;
}

export interface PrescriptionGroup {
  id: string;
  prescription_id?: string;
  patient_id: string;
  prescribed_date: string;
  dispensed_date?: string;
  prescribed_by: string;
  dispensed_by?: string;
  status:
    | "active"
    | "partially_dispensed"
    | "dispensed"
    | "expired"
    | "prescribed"
    | "completed"
    | "discontinued";
  prescription_image_url?: string;
  total_amount?: number;
  payment_status?: string;
  patient_name?: string;
  patient_uhid?: string;
  medications: MedicationItem[];
}

export interface MedicationItem {
  id: string;
  medication_id: string;
  medication_name: string;
  generic_name: string;
  dosage: string;
  dosage_form?: string;
  frequency: string;
  duration: string;
}

// ============================================================
// GST LEDGER
// ============================================================
export interface GSTLedgerEntry {
  id: string;
  transaction_date: string;
  transaction_type:
    | "sale"
    | "purchase"
    | "sale_return"
    | "purchase_return";
  reference_type: string;
  reference_id: string;
  reference_number?: string;
  party_name?: string;
  party_gstin?: string;
  hsn_code?: string;
  taxable_amount: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_gst: number;
  total_amount: number;
  gst_return_period?: string;
  filed_status: "pending" | "filed" | "amended";
  created_at: string;
}

// ============================================================
// DASHBOARD STATS
// ============================================================
export interface PharmacyDashboardStats {
  todaysSales: number;
  monthlyCollection: number;
  pendingBills: number;
  lowStockItems: number;
  expiringSoon: number;
  totalMedications: number;
  todaysBills: number;
  pendingPurchases: number;
}

// ============================================================
// INTENT (Medicine Movement)
// ============================================================
export interface MedicineIntent {
  id: string;
  intent_number: string;
  intent_type: string;
  medication_id: string;
  medication_name?: string;
  batch_number?: string;
  quantity: number;
  from_location?: string;
  to_location?: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// UTILITY TYPES
// ============================================================
export type PaymentMethod = "cash" | "card" | "upi" | "insurance" | "online" | "credit";
export type PaymentStatus = "pending" | "paid" | "partial" | "refunded";
export type PurchaseStatus = "draft" | "received" | "verified" | "cancelled";
export type ReturnStatus = "draft" | "submitted" | "approved" | "completed" | "rejected";
export type IssueStatus = "pending" | "approved" | "issued" | "partial" | "rejected" | "returned";
export type CollectionStatus = "open" | "closed" | "verified" | "discrepancy";
