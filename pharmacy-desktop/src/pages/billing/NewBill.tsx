import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Minus, Trash2, User, Phone, Package,
  AlertTriangle, CheckCircle, Printer, ArrowLeft, X,
  ShoppingCart, Receipt, ChevronDown, Pill, RefreshCw,
} from "lucide-react";
import { supabase, isMissingColumnError } from "@/lib/supabase";
import { getCachedMedications, searchCachedPatients, cacheItems } from "@/lib/db";
import { formatCurrency, generateBillNumber, formatDate, isExpired, isExpiringSoon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getPrintingSettings } from "@/lib/printingSettings";
import { printReceiptTextSilent } from "@/lib/tauriPrint";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MedicineBatch {
  id: string;
  batch_number: string;
  expiry_date: string;
  current_quantity: number;
  purchase_price: number;
  selling_price: number;
  unit_purchase_price?: number;
  pack_purchase_price?: number;
  pack_mrp?: number;
  pack_size?: number;
  medicine_id: string;
  status: string;
  batch_barcode?: string;
  legacy_code?: string | null;
  rack_location?: string;
}

interface Medicine {
  id: string;
  name: string;
  medicine_code?: string;
  medication_code?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  unit?: string;
  combination?: string;
  location?: string;
  available_stock?: number;
  total_stock?: number;
  batches: MedicineBatch[];
}

interface BillItem {
  medicine: Medicine;
  batch: MedicineBatch;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Patient {
  id: string;
  patient_id: string; // UHID
  name: string;
  phone?: string;
}

interface Customer {
  type: "patient" | "walk_in";
  name: string;
  phone?: string;
  patient_uuid?: string;
  patient_uhid?: string;
}

type PaymentMethod = "cash" | "card" | "upi" | "credit";

interface Payment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function getBatchUnitMrp(batch: MedicineBatch): number {
  const direct = Number(batch.selling_price);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const packMrp = Number(batch.pack_mrp);
  const packSize = Number(batch.pack_size);
  if (packMrp > 0 && packSize > 0) return Math.round((packMrp / packSize) * 100) / 100;
  return 0;
}

function expiryBadge(exp: string) {
  if (isExpired(exp)) return { cls: "bg-danger-100 text-danger-700", label: "Expired" };
  if (isExpiringSoon(exp)) return { cls: "bg-warning-100 text-warning-700", label: "Exp. soon" };
  return { cls: "bg-success-100 text-success-700", label: null };
}

/* ─── NewBill page ───────────────────────────────────────────────────────── */
export function NewBill() {
  const navigate = useNavigate();

  const escapeHtml = (str: string) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");

  /* ── Data ── */
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicinesLoaded, setMedicinesLoaded] = useState(false);

  /* ── Patient search ── */
  const [customer, setCustomer] = useState<Customer>({ type: "patient", name: "", phone: "" });
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const [patientIdx, setPatientIdx] = useState(0);
  const patientRef = useRef<HTMLDivElement>(null);
  const patientDropRef = useRef<HTMLDivElement>(null);
  const patientItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const patientSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Medicine search ── */
  const [searchTerm, setSearchTerm] = useState("");
  const [showMedDrop, setShowMedDrop] = useState(false);
  const [medIdx, setMedIdx] = useState(0);
  const [batchIdx, setBatchIdx] = useState(0);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);
  const [quantity, setQuantity] = useState(1);
  const medDropRef = useRef<HTMLDivElement>(null);
  const medActiveItemRef = useRef<HTMLDivElement | null>(null);
  const medicineInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const deleteButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  /* ── Bill ── */
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountValue, setDiscountValue] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  /* ── Payment modal ── */
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([{ method: "cash", amount: 0 }]);

  /* ── Success ── */
  const [savedBillNumber, setSavedBillNumber] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load medicines: local first then cloud ──────────────────────────── */
  useEffect(() => {
    let mounted = true;
    async function load() {
      // 1. From cache immediately
      const cached = await getCachedMedications();
      if (cached.length && mounted) {
        setMedicines(cached);
        setMedicinesLoaded(true);
      }
      // 2. From Supabase in background
      try {
        const { data: medsData } = await supabase
          .from("medications")
          .select("id, name, medication_code, manufacturer, category, dosage_form, combination, available_stock, total_stock, location")
          .eq("status", "active")
          .order("name");

        let batchesData: any[] | null = null;
        try { const r = await supabase.rpc("get_batches_with_unit_price"); if (!r.error) batchesData = r.data; } catch { /* no rpc */ }
        const batches: MedicineBatch[] = batchesData ?? [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const byMed: Record<string, MedicineBatch[]> = {};
        for (const b of batches) {
          if (!byMed[b.medicine_id]) byMed[b.medicine_id] = [];
          byMed[b.medicine_id].push(b);
        }

        const fresh: Medicine[] = (medsData ?? []).map((m: any) => ({
          id: m.id,
          name: m.name,
          medicine_code: m.medication_code,
          medication_code: m.medication_code,
          manufacturer: m.manufacturer,
          category: m.category,
          dosage_form: m.dosage_form,
          unit: m.dosage_form || "units",
          combination: m.combination,
          location: m.location,
          available_stock: m.available_stock ?? 0,
          total_stock: m.total_stock ?? 0,
          batches: byMed[m.id] ?? [],
        }));

        if (mounted) {
          setMedicines(fresh);
          setMedicinesLoaded(true);
          await cacheItems("medications", medsData ?? []);
          await cacheItems("medicine_batches", batches);
        }
      } catch (e) {
        console.warn("Medicine cloud load error:", e);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  /* ── Patient search ──────────────────────────────────────────────────── */
  const searchPatients = useCallback(async (term: string) => {
    if (term.length < 2) { setPatientResults([]); setShowPatientDrop(false); return; }
    // Local first
    const local = await searchCachedPatients(term);
    if (local.length) { setPatientResults(local as Patient[]); setShowPatientDrop(true); }
    // Cloud
    try {
      const { data } = await supabase
        .from("patients")
        .select("id, patient_id, name, phone")
        .or(`name.ilike.%${term}%,patient_id.ilike.%${term}%`)
        .limit(10);
      if (data?.length) {
        setPatientResults(data as Patient[]);
        setShowPatientDrop(true);
        await cacheItems("patients", data);
      }
    } catch { /* offline: use local results */ }
  }, []);

  const handlePatientInput = (val: string) => {
    setPatientSearch(val);
    // Don't reset customer type when searching for patients
    if (customer.type === "patient") {
      setCustomer((c) => ({ ...c, name: val, phone: "" }));
    }
    setPatientIdx(0);
    if (patientSearchTimeout.current) clearTimeout(patientSearchTimeout.current);
    patientSearchTimeout.current = setTimeout(() => searchPatients(val), 250);
  };

  useEffect(() => {
    if (!showPatientDrop) return;
    const el = patientItemRefs.current[patientIdx];
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [patientIdx, showPatientDrop]);

  const selectPatient = (p: Patient) => {
    setCustomer({ type: "patient", name: p.name, phone: p.phone ?? "", patient_uuid: p.id, patient_uhid: p.patient_id });
    setPatientSearch(`${p.name}${p.patient_id ? ` · ${p.patient_id}` : ""}`);
    setShowPatientDrop(false);
    setPatientIdx(0);
    setTimeout(() => medicineInputRef.current?.focus(), 80);
  };

  const handlePatientKeyDown = (e: React.KeyboardEvent) => {
    if (!showPatientDrop || !patientResults.length) return;
    if (e.key === "ArrowDown") { 
      e.preventDefault(); 
      setPatientIdx((i) => (i + 1) % patientResults.length); 
    }
    if (e.key === "ArrowUp") { 
      e.preventDefault(); 
      setPatientIdx((i) => (i - 1 + patientResults.length) % patientResults.length); 
    }
    if (e.key === "Enter") { 
      e.preventDefault(); 
      if (patientResults[patientIdx]) selectPatient(patientResults[patientIdx]); 
    }
    if (e.key === "Escape") { 
      e.preventDefault();
      setShowPatientDrop(false); 
    }
  };

  // Auto-focus medicine input when a patient is selected (has UUID)
  useEffect(() => {
    if (customer.patient_uuid) {
      setTimeout(() => medicineInputRef.current?.focus(), 100);
    }
  }, [customer.patient_uuid]);

  // Close patient dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) setShowPatientDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Medicine search filtering ───────────────────────────────────────── */
  const searchTermTrimmed = searchTerm.trim().toLowerCase();
  const filteredMedicines = searchTermTrimmed.length < 1 ? [] : medicines.filter((med) => {
    const term = searchTermTrimmed;
    if ((med.name ?? "").toLowerCase().includes(term)) return true;
    if ((med.combination ?? "").toLowerCase().includes(term)) return true;
    if ((med.medicine_code ?? med.medication_code ?? "").toLowerCase().includes(term)) return true;
    if ((med.manufacturer ?? "").toLowerCase().includes(term)) return true;
    if ((med.category ?? "").toLowerCase().includes(term)) return true;
    return med.batches?.some((b) =>
      (b.batch_number ?? "").toLowerCase().includes(term) ||
      (b.batch_barcode ?? "").toLowerCase().includes(term) ||
      ((b.legacy_code ?? "") as string).toLowerCase().includes(term)
    );
  });

  const getMatchingBatches = (med: Medicine) =>
    med.batches.filter((b) =>
      !searchTermTrimmed ||
      (b.batch_number ?? "").toLowerCase().includes(searchTermTrimmed) ||
      (b.batch_barcode ?? "").toLowerCase().includes(searchTermTrimmed) ||
      ((b.legacy_code ?? "") as string).toLowerCase().includes(searchTermTrimmed) ||
      (med.name ?? "").toLowerCase().includes(searchTermTrimmed) ||
      (med.combination ?? "").toLowerCase().includes(searchTermTrimmed)
    ).filter((b) => (b.current_quantity ?? 0) > 0);

  const handleMedicineSearch = (val: string) => {
    setSearchTerm(val);
    setSelectedMedicine(null);
    setSelectedBatch(null);
    // Show dropdown immediately if there's a search term and medicines are loaded
    if (val.trim().length > 0 && medicinesLoaded) {
      setShowMedDrop(true);
    } else {
      setShowMedDrop(false);
    }
    setMedIdx(0);
    setBatchIdx(0);
  };

  // Get all batches from all filtered medicines for navigation
  const getAllBatches = () => {
    const allBatches: { medicine: Medicine; batch: MedicineBatch; medIndex: number; batchIndex: number }[] = [];
    filteredMedicines.forEach((med, mi) => {
      const batches = getMatchingBatches(med);
      batches.forEach((batch, bi) => {
        allBatches.push({ medicine: med, batch, medIndex: mi, batchIndex: bi });
      });
    });
    return allBatches;
  };

  const handleMedicineKeyDown = (e: React.KeyboardEvent) => {
    if (!showMedDrop || filteredMedicines.length === 0) return;
    if (!["ArrowDown", "ArrowUp", "Enter", "Escape", "Tab"].includes(e.key)) return;

    const allBatches = getAllBatches();
    const currentBatchIndex = allBatches.findIndex(
      (b) => b.medIndex === medIdx && b.batchIndex === batchIdx
    );

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentBatchIndex < allBatches.length - 1) {
          const next = allBatches[currentBatchIndex + 1];
          setMedIdx(next.medIndex);
          setBatchIdx(next.batchIndex);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentBatchIndex > 0) {
          const prev = allBatches[currentBatchIndex - 1];
          setMedIdx(prev.medIndex);
          setBatchIdx(prev.batchIndex);
        }
        break;
      case "Enter":
        e.preventDefault();
        const current = allBatches[currentBatchIndex];
        if (current) {
          setSelectedMedicine(current.medicine);
          setSelectedBatch(current.batch);
          setSearchTerm(current.medicine.name);
          setShowMedDrop(false);
          setMedIdx(0); setBatchIdx(0);
          setTimeout(() => quantityInputRef.current?.focus(), 50);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowMedDrop(false);
        break;
      case "Tab":
        if (selectedMedicine && selectedBatch) {
          e.preventDefault();
          setTimeout(() => quantityInputRef.current?.focus(), 50);
        }
        break;
    }
  };

  useEffect(() => {
    if (!showMedDrop) return;
    if (medActiveItemRef.current) medActiveItemRef.current.scrollIntoView({ block: "nearest" });
  }, [medIdx, batchIdx, showMedDrop, searchTermTrimmed]);

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (selectedMedicine && selectedBatch) {
      addToBill(selectedMedicine, selectedBatch, quantity);
      setSearchTerm(""); setSelectedMedicine(null); setSelectedBatch(null); setQuantity(1);
      setShowMedDrop(false);
      setTimeout(() => medicineInputRef.current?.focus(), 60);
    }
  };

  // Outside click closes med dropdown
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (medDropRef.current && !medDropRef.current.contains(e.target as Node)) setShowMedDrop(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  /* ── Bill items ──────────────────────────────────────────────────────── */
  const addToBill = (med: Medicine, batch: MedicineBatch, qty: number) => {
    const price = getBatchUnitMrp(batch);
    setBillItems((prev) => {
      const existing = prev.findIndex((i) => i.batch.id === batch.id);
      if (existing >= 0) {
        return prev.map((i, idx) => idx !== existing ? i : {
          ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unit_price,
        });
      }
      return [...prev, { medicine: med, batch, quantity: qty, unit_price: price, total: qty * price }];
    });
  };

  const updateItem = (idx: number, field: "quantity" | "unit_price", val: number) => {
    setBillItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      updated.total = updated.quantity * updated.unit_price;
      return updated;
    }));
  };

  const removeItem = (idx: number) => setBillItems((prev) => prev.filter((_, i) => i !== idx));

  /* ── Totals ──────────────────────────────────────────────────────────── */
  const subtotal = billItems.reduce((s, i) => s + i.total, 0);
  const discountAmount = discountType === "percent"
    ? Math.round(subtotal * discountValue) / 100
    : discountValue;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = Math.round(taxableAmount * taxPercent) / 100;
  const totalAmount = taxableAmount + taxAmount;
  const paymentsTotal = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

  /* ── Open payment modal ──────────────────────────────────────────────── */
  const openPayment = () => {
    setPayments([{ method: "cash", amount: Math.round(totalAmount * 100) / 100 }]);
    setShowPaymentModal(true);
  };

  /* ── Save bill ───────────────────────────────────────────────────────── */
  const saveBill = async () => {
    if (!billItems.length) { setError("Add at least one medicine"); return; }
    setSaving(true); setError(null);
    try {
      const billNumber = generateBillNumber();
      const paidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const dominantMethod = payments.sort((a, b) => b.amount - a.amount)[0]?.method ?? "cash";
      const paymentStatus: "paid" | "partial" | "pending" =
        paidAmount >= totalAmount - 0.05 ? "paid" : paidAmount > 0 ? "partial" : "pending";

      const billPayload = {
        bill_number: billNumber,
        customer_name: customer.name || "Walk-in",
        customer_type: customer.type,
        patient_id: customer.patient_uuid ?? null,
        patient_uhid: customer.patient_uhid ?? null,
        subtotal, discount: discountAmount, tax: taxAmount,
        total_amount: totalAmount,
        amount_paid: paidAmount,
        payment_method: dominantMethod,
        payment_status: paymentStatus,
        created_at: new Date().toISOString(),
      };

      let savedBill: any = null;

      const tryInsert = async (payload: any) =>
        await supabase
          .from("billing")
          .insert(payload)
          .select()
          .single();

      let payload: any = billPayload;
      let r = await tryInsert(payload);

      if (r.error && isMissingColumnError(r.error, "patient_uhid")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { patient_uhid, ...p2 } = payload;
        payload = p2;
        r = await tryInsert(payload);
      }

      if (r.error && isMissingColumnError(r.error, "total_amount")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { total_amount, ...p3 } = payload;
        payload = p3;
        r = await tryInsert(payload);
      }

      if (r.error) throw r.error;
      savedBill = r.data;

      // Save bill items
      const itemPayloads = billItems.map((i) => ({
        billing_id: savedBill.id,
        medicine_id: i.medicine.id,
        batch_id: i.batch.id,
        medicine_name: i.medicine.name,
        batch_number: i.batch.batch_number,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_amount: i.total,
      }));
      await supabase.from("billing_item").insert(itemPayloads);

      // Cache locally
      await cacheItems("pharmacy_bills", [{ ...billPayload, id: savedBill.id }]);

      setShowPaymentModal(false);
      setSavedBillNumber(billNumber);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save bill");
    } finally {
      setSaving(false);
    }
  };

  /* ── Success screen ──────────────────────────────────────────────────── */
  if (savedBillNumber) {
    const showThermal2 = async () => {
      const now = new Date();
      const printedDateTime = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const patientUhid = customer.patient_uhid || "WALK-IN";

      const paidAmount = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const dominantMethod = payments.sort((a, b) => b.amount - a.amount)[0]?.method ?? "cash";
      const salesType = String(dominantMethod || "cash").toUpperCase();

      const itemsHtml = billItems
        .map((item, index) => {
          return `
            <tr>
              <td class="items-8cm">${index + 1}.</td>
              <td class="items-8cm">${escapeHtml(item.medicine?.name || "")}</td>
              <td class="items-8cm text-center">${Number(item.quantity || 0)}</td>
              <td class="items-8cm text-right">${Math.round(Number(item.total || 0))}</td>
            </tr>
          `;
        })
        .join("");

      const discount = Number(discountAmount || 0);
      const subtotalValue = Number(subtotal || 0);
      const tax = Number(taxAmount || 0);
      const taxableAmountValue = Math.max(subtotalValue - discount, 0);

      const settings = getPrintingSettings();

      const lines = billItems.map((it, idx) => ({
        sn: idx + 1,
        name: it.medicine?.name || "",
        qty: Number(it.quantity || 0),
        amt: Math.round(Number(it.total || 0)),
      }));

      const textContent = {
        billNo: savedBillNumber,
        uhid: patientUhid,
        customerName: customer.name || "WALK-IN CUSTOMER",
        dateTime: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        salesType,
        taxableAmount: Math.round(taxableAmountValue),
        discount: Math.round(discount),
        cgst: Math.round(tax / 2),
        sgst: Math.round(tax / 2),
        total: Math.round(totalAmount),
        paid: Math.round(paidAmount),
        balance: Math.round(Math.max(Number(totalAmount) - Number(paidAmount), 0)),
        printedOn: printedDateTime,
        items: lines,
      };

      try {
        await printReceiptTextSilent({
          printer: settings.printerName || null,
          paperWidthMm: settings.paperWidthMm ?? null,
          receipt: textContent,
        });
        return;
      } catch {
        // fallback to browser preview print below
      }

      const thermalContent = `
        <html>
          <head>
            <title>Thermal Receipt - ${escapeHtml(savedBillNumber)}</title>
            <style>
              @page { margin: 3mm 8mm 3mm 3mm; size: 85mm 297mm; }
              body {
                font-family: 'Verdana', sans-serif;
                font-weight: bold;
                margin: 0;
                padding: 2px;
                font-size: 14px;
                line-height: 1.2;
                width: 85mm;
                color: #000;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              html, body { background: #fff; }
              .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
              .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
              .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
              .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
              .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
              .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
              .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
              .logo { width: 300px; height: auto; margin-bottom: 5px; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
            </style>
          </head>
          <body>
            <div class="center">
              <img src="/logo/annamPharmacy.png" alt="ANNAM LOGO" class="logo" />
              <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
              <div class="header-9cm">Phone- 04639 252592</div>
              <div class="footer-7cm">Gst No: 33AJWPR2713G2ZZ</div>
              <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
            </div>

            <div style="margin-top: 10px;">
              <table class="table">
                <tr>
                  <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${escapeHtml(savedBillNumber)}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${escapeHtml(patientUhid)}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${escapeHtml(customer.name || "WALK-IN CUSTOMER")}</td>
                </tr>
                <tr>
                  <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                  <td class="bill-info-10cm bill-info-bold">${escapeHtml(new Date().toLocaleDateString())} ${escapeHtml(new Date().toLocaleTimeString())}</td>
                </tr>
                <tr>
                  <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                  <td class="header-10cm bill-info-bold">${escapeHtml(salesType)}</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 10px;">
              <table class="table">
                <tr style="border-bottom: 1px dashed #000;">
                  <td width="30%" class="items-8cm">S.No</td>
                  <td width="40%" class="items-8cm">Drug Name</td>
                  <td width="15%" class="items-8cm text-center">Qty</td>
                  <td width="15%" class="items-8cm text-right">Amt</td>
                </tr>
                ${itemsHtml}
              </table>
            </div>

            <div style="margin-top: 10px;">
              <div class="totals-line items-8cm">
                <span>Taxable Amount</span>
                <span>${Math.round(taxableAmountValue)}</span>
              </div>
              <div class="totals-line items-8cm">
                <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
                <span>${Math.round(discount)}</span>
              </div>
              <div class="totals-line items-8cm">
                <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
                <span>${Math.round(tax / 2)}</span>
              </div>
              <div class="totals-line header-8cm">
                <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
                <span>${Math.round(tax / 2)}</span>
              </div>
              <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
                <span>Total Amount</span>
                <span>${Math.round(totalAmount)}</span>
              </div>
              <div class="totals-line footer-7cm" style="margin-top: 4px;">
                <span>Paid</span>
                <span>${Math.round(paidAmount)}</span>
              </div>
              <div class="totals-line footer-7cm">
                <span>Balance</span>
                <span>${Math.round(Math.max(Number(totalAmount) - Number(paidAmount), 0))}</span>
              </div>
            </div>

            <div class="footer">
              <div class="totals-line footer-7cm">
                <span>Printed on ${escapeHtml(printedDateTime)}</span>
                <span>Pharmacist Sign</span>
              </div>
            </div>

            <script>
              (function() {
                function triggerPrint() {
                  try { window.focus(); } catch (e) {}
                  setTimeout(function() { window.print(); }, 250);
                }
                window.onafterprint = function() {
                  try { window.close(); } catch (e) {}
                };
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  triggerPrint();
                } else {
                  document.addEventListener('DOMContentLoaded', triggerPrint);
                }
              })();
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "width=450,height=650");
      if (printWindow) {
        printWindow.document.write(thermalContent);
        printWindow.document.close();
      }
    };

    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-success-100">
            <CheckCircle className="h-10 w-10 text-success-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Bill Saved!</h2>
          <p className="mt-1 text-gray-500">Bill #{savedBillNumber}</p>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => window.print()} className="btn-secondary gap-2 flex items-center">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={showThermal2} className="btn-secondary gap-2 flex items-center">
              <Printer className="h-4 w-4" /> Thermal 2
            </button>
            <button onClick={() => { setSavedBillNumber(null); setBillItems([]); setCustomer({ type: "walk_in", name: "", phone: "" }); setPatientSearch(""); }}
              className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Bill
            </button>
            <button onClick={() => navigate("/billing")} className="btn-secondary flex items-center gap-2">
              <Receipt className="h-4 w-4" /> All Bills
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main UI ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/billing")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </button>
        <div className="flex items-center gap-2">
          {!medicinesLoaded && (
            <span className="flex items-center gap-1.5 text-xs text-orange-500">
              <RefreshCw className="h-3 w-3 animate-spin" /> Loading medicines…
            </span>
          )}
          {error && (
            <span className="text-xs text-danger-600 bg-danger-50 px-3 py-1 rounded-lg">{error}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* ── LEFT: Customer + Medicine ─────────────────────────────────── */}
        <div className="col-span-2 flex flex-col gap-4">

          {/* Patient / Customer card */}
          <div className="card !p-4 relative z-50 isolate">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm text-gray-700">Customer</span>
              <div className="flex gap-1 ml-auto">
                {(["patient", "walk_in"] as const).map((t) => (
                  <button key={t} onClick={() => { setCustomer({ type: t, name: "", phone: "" }); setPatientSearch(""); }}
                    className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                      customer.type === t
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600"
                    )}>
                    {t === "walk_in" ? "Walk-in" : "Patient"}
                  </button>
                ))}
              </div>
            </div>

            {customer.type === "patient" ? (
              /* Patient search input */
              <div ref={patientRef} className="relative z-[99999]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    value={patientSearch}
                    onChange={(e) => handlePatientInput(e.target.value)}
                    onKeyDown={handlePatientKeyDown}
                    onFocus={() => patientSearch.length >= 2 && setShowPatientDrop(true)}
                    placeholder="Search patient by name or UHID…"
                    className="input-field pl-9 py-2.5"
                    name="patient_search"
                    type="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                  />
                  {customer.patient_uhid && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                      {customer.patient_uhid}
                    </span>
                  )}
                </div>

                {/* Patient dropdown */}
                {showPatientDrop && patientResults.length > 0 && (
                  <div ref={patientDropRef} className="absolute top-full left-0 right-0 mt-1 z-[99999] rounded-xl border border-orange-100 bg-white shadow-2xl shadow-orange-900/10 py-1 max-h-56 overflow-y-auto">
                    {patientResults.map((p, i) => (
                      <div key={p.id}
                        ref={(el) => { patientItemRefs.current[i] = el; }}
                        onMouseDown={() => selectPatient(p)}
                        className={cn(
                          "flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors",
                          i === patientIdx ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50"
                        )}>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                          {p.phone && <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</p>}
                        </div>
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                          {p.patient_id}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Patient info pill when selected */}
                {customer.patient_uuid && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-orange-50 border border-orange-100 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-orange-200 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-orange-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{customer.name}</p>
                        {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
                      </div>
                    </div>
                    <button onClick={() => { setCustomer({ type: "patient", name: "", phone: "" }); setPatientSearch(""); }}
                      className="text-gray-400 hover:text-danger-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Walk-in inputs */
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    placeholder="Customer name (optional)"
                    className="input-field py-2.5" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input value={customer.phone ?? ""}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Mobile number"
                    className="input-field py-2.5" />
                </div>
              </div>
            )}
          </div>

          {/* Medicine search card */}
          <div className="card !p-4 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Pill className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm text-gray-700">Add Medicine</span>
              <span className="ml-auto text-xs text-gray-400">
                {medicines.length} medicines loaded
              </span>
            </div>

            <div ref={medDropRef} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={medicineInputRef}
                    value={searchTerm}
                    onChange={(e) => handleMedicineSearch(e.target.value)}
                    onKeyDown={handleMedicineKeyDown}
                    onFocus={() => searchTerm.length > 0 && setShowMedDrop(true)}
                    placeholder="Search medicine by name, code, batch…"
                    className="input-field pl-9 py-2.5"
                    name="medicine_search"
                    type="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                  />
                </div>
                <div className="w-24">
                  <input
                    ref={quantityInputRef}
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={handleQuantityKeyDown}
                    placeholder="Qty"
                    className="input-field py-2.5 text-center"
                  />
                </div>
                <button
                  disabled={!selectedMedicine || !selectedBatch}
                  onClick={() => {
                    if (selectedMedicine && selectedBatch) {
                      addToBill(selectedMedicine, selectedBatch, quantity);
                      setSearchTerm(""); setSelectedMedicine(null); setSelectedBatch(null); setQuantity(1);
                      setTimeout(() => medicineInputRef.current?.focus(), 60);
                    }
                  }}
                  className={cn("px-4 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-1.5",
                    selectedMedicine && selectedBatch
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-sm"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}>
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              {/* Selected medicine pill */}
              {selectedMedicine && selectedBatch && (
                <div className="mt-2 flex items-center gap-3 rounded-xl bg-primary-50 border border-primary-100 px-4 py-2">
                  <Package className="h-4 w-4 text-primary-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{selectedMedicine.name}</p>
                    <p className="text-xs text-gray-400">
                      Batch: {selectedBatch.batch_number} · Exp: {selectedBatch.expiry_date}
                      · Qty avail: {selectedBatch.current_quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary-700">
                    {formatCurrency(getBatchUnitMrp(selectedBatch))}
                  </span>
                </div>
              )}

              {/* Medicine dropdown */}
              {showMedDrop && filteredMedicines.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[9999] rounded-xl border border-gray-100 bg-white shadow-2xl py-1 max-h-72 overflow-y-auto">
                  {filteredMedicines.map((med, mi) => {
                    const batches = getMatchingBatches(med);
                    if (!batches.length) return null;
                    return (
                      <div key={med.id} data-medicine-index={mi}>
                        {/* Medicine name row */}
                        <div className="px-4 pt-2 pb-1 flex items-center gap-2">
                          <Pill className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                          <span className="text-xs font-bold text-gray-700 flex-1 truncate">{med.name}</span>
                          {med.manufacturer && <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{med.manufacturer}</span>}
                          {med.category && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{med.category}</span>}
                        </div>
                        {/* Batch rows */}
                        {batches.map((batch, bi) => {
                          const exp = expiryBadge(batch.expiry_date);
                          const isHighlighted = mi === medIdx && bi === batchIdx;
                          return (
                            <div key={batch.id} data-batch-index={bi}
                              ref={(el) => {
                                if (isHighlighted) medActiveItemRef.current = el;
                              }}
                              onMouseDown={() => {
                                setSelectedMedicine(med); setSelectedBatch(batch);
                                setSearchTerm(med.name); setShowMedDrop(false);
                                setMedIdx(0); setBatchIdx(0);
                                setTimeout(() => quantityInputRef.current?.focus(), 50);
                              }}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 mx-2 my-0.5 rounded-lg cursor-pointer transition-colors",
                                isHighlighted ? "bg-orange-50 border border-orange-200" : "hover:bg-gray-50"
                              )}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-600">Batch: {batch.batch_number}</span>
                                  {exp.label && <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", exp.cls)}>{exp.label}</span>}
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-[11px] text-gray-400">Exp: {batch.expiry_date}</span>
                                  <span className="text-[11px] text-gray-400">Stock: {batch.current_quantity}</span>
                                  {batch.rack_location && <span className="text-[11px] text-gray-400">Rack: {batch.rack_location}</span>}
                                </div>
                              </div>
                              <span className="text-sm font-bold text-gray-800">{formatCurrency(getBatchUnitMrp(batch))}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {filteredMedicines.every((m) => getMatchingBatches(m).length === 0) && (
                    <div className="px-4 py-4 text-sm text-gray-400 text-center">No stock available</div>
                  )}
                </div>
              )}

              {showMedDrop && searchTermTrimmed.length >= 1 && filteredMedicines.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[9999] rounded-xl border border-gray-100 bg-white shadow-xl py-4 text-center text-sm text-gray-400">
                  No medicines found for "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          {/* Bill items table */}
          {billItems.length > 0 && (
            <div className="card !p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-700">
                  Bill Items <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{billItems.length}</span>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Medicine</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Batch</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500">Qty</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">Rate</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {billItems.map((item, idx) => {
                      const exp = expiryBadge(item.batch.expiry_date);
                      return (
                        <tr key={idx} data-row-idx={idx} className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{item.medicine.name}</p>
                            {item.medicine.manufacturer && (
                              <p className="text-xs text-gray-400">{item.medicine.manufacturer}</p>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-xs font-medium text-gray-700">{item.batch.batch_number}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <p className="text-[11px] text-gray-400">{item.batch.expiry_date}</p>
                              {exp.label && <span className={cn("text-[10px] px-1 rounded font-medium", exp.cls)}>{exp.label}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => item.quantity > 1 && updateItem(idx, "quantity", item.quantity - 1)}
                                className="h-6 w-6 rounded-md bg-gray-100 hover:bg-orange-100 hover:text-orange-600 flex items-center justify-center transition-colors">
                                <Minus className="h-3 w-3" />
                              </button>
                              <input type="number" value={item.quantity} min={1}
                                onChange={(e) => updateItem(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                                onKeyDown={(e) => {
                                  if (e.key === "Tab" && !e.shiftKey) {
                                    e.preventDefault();
                                    setTimeout(() => deleteButtonRefs.current[idx]?.focus(), 0);
                                  }
                                  // Disable arrow keys to prevent confusion with +/- buttons
                                  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                                onWheel={(e) => e.preventDefault()} // Disable mouse wheel
                                onInput={(e) => {
                                  // Ensure only valid numbers are entered
                                  const target = e.target as HTMLInputElement;
                                  const value = parseInt(target.value);
                                  if (isNaN(value) || value < 1) {
                                    target.value = "1";
                                  }
                                }}
                                className="w-12 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                              <button onClick={() => updateItem(idx, "quantity", item.quantity + 1)}
                                className="h-6 w-6 rounded-md bg-gray-100 hover:bg-orange-100 hover:text-orange-600 flex items-center justify-center transition-colors">
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input type="number" value={item.unit_price}
                              onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => {
                                if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault();
                                  setTimeout(() => deleteButtonRefs.current[idx]?.focus(), 0);
                                }
                              }}
                              className="w-20 text-right text-sm font-medium border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="pr-3 py-3">
                            <button 
                              ref={(el) => { deleteButtonRefs.current[idx] = el; }}
                              onClick={() => removeItem(idx)}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Tab" && !e.shiftKey && idx < billItems.length - 1) {
                                  e.preventDefault();
                                  // Focus next row's quantity input
                                  setTimeout(() => {
                                    const nextRowQty = document.querySelector(`tr[data-row-idx="${idx + 1}"] input[type="number"]`) as HTMLInputElement;
                                    if (nextRowQty) nextRowQty.focus();
                                  }, 0);
                                }
                              }}
                              className="h-7 w-7 rounded-lg text-gray-300 hover:bg-danger-50 hover:text-danger-500 flex items-center justify-center transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Summary & Payment ──────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Bill summary card */}
          <div className="card !p-4 sticky top-0">
            <h3 className="font-semibold text-sm text-gray-700 mb-4 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-orange-500" /> Summary
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>

              {/* Discount */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Discount</label>
                <div className="flex gap-2">
                  <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "amount" | "percent")}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300 bg-white">
                    <option value="amount">₹</option>
                    <option value="percent">%</option>
                  </select>
                  <input type="number" value={discountValue} min={0}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                </div>
                {discountAmount > 0 && (
                  <p className="text-xs text-success-600 text-right mt-1">- {formatCurrency(discountAmount)}</p>
                )}
              </div>

              {/* Tax */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">GST %</label>
                <input type="number" value={taxPercent} min={0} max={100}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  className="w-full text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                {taxAmount > 0 && (
                  <p className="text-xs text-gray-400 text-right mt-1">+ {formatCurrency(taxAmount)}</p>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                <span className="font-bold text-gray-800">Total</span>
                <span className="text-xl font-bold text-orange-600">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 space-y-2">
              {billItems.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-2">Add medicines to proceed</p>
              ) : (
                <>
                  <button
                    onClick={openPayment}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3">
                    <CheckCircle className="h-4 w-4" /> Receive Payment
                  </button>
                  <button
                    onClick={async () => {
                      // Save without payment (pending)
                      setPayments([{ method: "cash", amount: 0 }]);
                      await saveBill();
                    }}
                    disabled={saving}
                    className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
                    Save as Pending
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Payment</h3>
              <button onClick={() => setShowPaymentModal(false)}
                className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Bill total */}
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 flex items-center justify-between">
                <span className="text-sm text-orange-700">Amount Due</span>
                <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</span>
              </div>

              {/* Payment rows */}
              {payments.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select value={p.method}
                    onChange={(e) => setPayments((prev) => prev.map((r, ri) => ri !== i ? r : { ...r, method: e.target.value as PaymentMethod }))}
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white w-32">
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                    <option value="credit">⏳ Credit</option>
                  </select>
                  <input type="number"
                    value={p.amount || ""}
                    onChange={(e) => setPayments((prev) => prev.map((r, ri) => ri !== i ? r : { ...r, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="Amount"
                    className="flex-1 text-right text-sm font-semibold border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  {payments.length > 1 && (
                    <button onClick={() => setPayments((prev) => prev.filter((_, ri) => ri !== i))}
                      className="h-9 w-9 rounded-lg text-gray-400 hover:bg-danger-50 hover:text-danger-500 flex items-center justify-center">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button onClick={() => setPayments((prev) => [...prev, { method: "cash", amount: 0 }])}
                className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1.5 font-medium">
                <Plus className="h-3.5 w-3.5" /> Add payment method
              </button>

              {/* Totals */}
              <div className="rounded-xl bg-gray-50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Received</span>
                  <span className="font-semibold">{formatCurrency(paymentsTotal)}</span>
                </div>
                {paymentsTotal > totalAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Change</span>
                    <span className="font-semibold text-success-600">{formatCurrency(paymentsTotal - totalAmount)}</span>
                  </div>
                )}
                {paymentsTotal < totalAmount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Balance due</span>
                    <span className="font-semibold text-danger-600">{formatCurrency(totalAmount - paymentsTotal)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setShowPaymentModal(false)}
                className="flex-1 btn-secondary py-3">Cancel</button>
              <button onClick={saveBill} disabled={saving}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                {saving ? "Saving…" : "Confirm & Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
