'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, Save, List, RefreshCw, Plus, Trash2, Printer, 
  ArrowLeft, BedDouble, Stethoscope, Calendar, User, 
  Wallet, Check, CreditCard, Receipt, FileText, ChevronRight,
  Activity, Hash, CheckSquare, Upload, X, Eye
} from 'lucide-react';
import { getIPComprehensiveBilling, saveIPBilling } from '../../../../../src/lib/ipBillingService';
import { getTotalAvailableAdvance } from '../../../../../src/lib/ipFlexibleBillingService';


const PREDEFINED_CHARGES = [
  "RTA WITH LEFT LEG BOTH BONE FRACTURE",
  "ADMISSION FEES",
  "AIR BED",
  "ANAESTHETIC CHARGES",
  "AUTOCLAVE USING CHARGES",
  "BOYLES CHARGES",
  "CAP & MASK CHARGES",
  "C-ARM CHARGES",
  "CASUALITY OBSERVATION CHARGE",
  "CONSUMABLES CHARGES",
  "DOCTOR DREESSING CHARGES",
  "DOCTOR FEES",
  "DRESSING CHARGE",
  "ECG CHARGES",
  "FUMIGATION CHARGES",
  "GM CONSULTATION",
  "ICU CHARGE",
  "IMPLANT NAIL",
  "INFUSION PUMP",
  "IVF FLUIDS",
  "LAB CHARGES",
  "MEDICINE AMOUNT",
  "MONITOR CHARGE",
  "NEB CHARGE",
  "NURSING CARE FEES",
  "NURSING CHARGES",
  "O2 CHARGE",
  "O2 CHARGES",
  "OT CHARGES",
  "OTHER CHARGES",
  "RBS",
  "ROOM RENT",
  "SCAN FEE",
  "STABLER PIN CHARGE",
  "STERILIZATION CHARGES",
  "SUGAR MONITORING",
  "SERVICE CHARGES",
  "SUTURE CHARGE",
  "SYRINGE PUMP",
  "VENTILATOR CHARGE",
  "WARD CHARGE",
  "X-RAY CHARGES"
];

export default function IPNewBillingPage() {
  const params = useParams();
  const router = useRouter();
  const bedAllocationId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [currentDate, setCurrentDate] = useState('');
  
  useEffect(() => {
    const now = new Date();
    const formatted = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setCurrentDate(formatted);
  }, []);
  
  const [entryForm, setEntryForm] = useState({
    service_name: '',
    days: 0,
    rate: 0,
    amount: 0
  });

  const [gridItems, setGridItems] = useState<any[]>([]);
  const [lessAdvance, setLessAdvance] = useState(0);
  const [concession, setConcession] = useState(0);
  const [availableAdvance, setAvailableAdvance] = useState(0);
  const [useAdvanceCheckbox, setUseAdvanceCheckbox] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [printWithHeader, setPrintWithHeader] = useState(true);

  // Specialized Stay Charges State
  const [editingBedCharges, setEditingBedCharges] = useState(false);
  const [bedChargesDraft, setBedChargesDraft] = useState({ days: 0, rate: 0 });
  
  const [editingDoctorFees, setEditingDoctorFees] = useState(false);
  const [doctorFeesDraft, setDoctorFeesDraft] = useState({ days: 0, rate: 0 });

  const [isBedImported, setIsBedImported] = useState(false);
  const [isDoctorImported, setIsDoctorImported] = useState(false);

  // Upload functionality state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedBills, setUploadedBills] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const handlePrint = (withHeader: boolean) => {
    setPrintWithHeader(withHeader);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const loadUploadedBills = async () => {
    try {
      const response = await fetch(`/api/ip-bills?allocation_id=${bedAllocationId}`);
      const result = await response.json();
      
      if (result.success) {
        setUploadedBills(result.bills);
      }
    } catch (error) {
      console.error('Error loading uploaded bills:', error);
    }
  };


  useEffect(() => {
    if (bedAllocationId) {
      loadBillingData();
      loadUploadedBills();
    }
  }, [bedAllocationId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const [data, totalAvailAdvance] = await Promise.all([
        getIPComprehensiveBilling(bedAllocationId),
        getTotalAvailableAdvance(bedAllocationId)
      ]);
      setBilling(data);
      
      // Initialize stay charges drafts
      setBedChargesDraft({
        days: data.bed_charges.days || data.admission.total_days,
        rate: data.bed_charges.daily_rate || 0
      });
      setDoctorFeesDraft({
        days: data.doctor_consultation.days || data.admission.total_days,
        rate: data.doctor_consultation.consultation_fee || 0
      });

      // Load saved charges from dedicated API
      try {
        const chargesRes = await fetch(`/api/ip-charges?allocation_id=${bedAllocationId}`);
        const chargesData = await chargesRes.json();
        const charges = (chargesData.charges && chargesData.charges.length > 0) 
          ? chargesData.charges 
          : (data.other_charges || []);
          
        setGridItems(charges);
        
        // Start with checkboxes unticked - user must manually tick them to include charges
        setIsBedImported(false);
        setIsDoctorImported(false);

      } catch {
        setGridItems(data.other_charges || []);
      }
      
      setLessAdvance(data.summary.advance_paid || 0);
      setConcession(data.summary.discount || 0);
      setAvailableAdvance(totalAvailAdvance);
      if (totalAvailAdvance > 0 && data.summary.advance_paid === totalAvailAdvance) {
        setUseAdvanceCheckbox(true);
      }
    } catch (error) {
      console.error('Error loading billing data:', error);
      setStatusMsg('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleEntryChange = (field: string, value: string | number) => {
    setEntryForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'days' || field === 'rate') {
        const days = field === 'days' ? Number(value) : prev.days;
        const rate = field === 'rate' ? Number(value) : prev.rate;
        updated.amount = days * rate;
      }
      return updated;
    });
  };

  const addGridItem = () => {
    if (!entryForm.service_name || entryForm.amount <= 0) {
      setStatusMsg('Please enter valid charge details (amount > 0)');
      return;
    }

    if (editingIndex !== null) {
      // Update existing item
      setGridItems(prev => {
        const updated = [...prev];
        updated[editingIndex] = {
          service_name: entryForm.service_name,
          quantity: 1,
          days: entryForm.days,
          rate: entryForm.rate,
          amount: entryForm.amount
        };
        return updated;
      });
      setEditingIndex(null);
      setStatusMsg('Charge updated');
    } else {
      // Add new item
      setGridItems(prev => [...prev, {
        service_name: entryForm.service_name,
        quantity: 1,
        days: entryForm.days,
        rate: entryForm.rate,
        amount: entryForm.amount
      }]);
      setStatusMsg('Charge added');
    }
    
    setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
  };

  const editGridItem = (index: number) => {
    const item = gridItems[index];
    setEntryForm({
      service_name: item.service_name,
      days: item.days || item.quantity || 0,
      rate: item.rate,
      amount: item.amount
    });
    setEditingIndex(index);
    setStatusMsg(`Editing: ${item.service_name}`);

    // Scroll back to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeGridItem = (index: number) => {
    setGridItems(prev => prev.filter((_, i) => i !== index));
    setStatusMsg('Charge removed');
  };

  const handleRefresh = () => {
    if (confirm('Are you sure you want to clear all charges?')) {
      setGridItems([]);
      setIsBedImported(false);
      setIsDoctorImported(false);
      setLessAdvance(0);
      setConcession(0);
      setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
      setStatusMsg('Cleared details');
    }
  };

  // Sync Drafts to Grid Items if imported
  useEffect(() => {
    if (isBedImported) {
      setGridItems(prev => prev.map(item => 
        item.isStayCharge === 'bed' 
          ? { ...item, days: bedChargesDraft.days, rate: bedChargesDraft.rate, amount: bedChargesDraft.days * bedChargesDraft.rate } 
          : item
      ));
    }
  }, [bedChargesDraft.days, bedChargesDraft.rate, isBedImported]);

  useEffect(() => {
    if (isDoctorImported) {
      setGridItems(prev => prev.map(item => 
        item.isStayCharge === 'doctor' 
          ? { ...item, days: doctorFeesDraft.days, rate: doctorFeesDraft.rate, amount: doctorFeesDraft.days * doctorFeesDraft.rate } 
          : item
      ));
    }
  }, [doctorFeesDraft.days, doctorFeesDraft.rate, isDoctorImported]);

  const handleToggleBedImport = (checked: boolean) => {
    setIsBedImported(checked);
    if (checked) {
      setGridItems(prev => [...prev, {
        service_name: `ROOM RENT (${billing?.bed_charges?.bed_type || 'STANDARD'})`,
        quantity: 1,
        days: bedChargesDraft.days,
        rate: bedChargesDraft.rate,
        amount: bedChargesDraft.days * bedChargesDraft.rate,
        isStayCharge: 'bed'
      }]);
      setStatusMsg('Bed charges added to grid');
    } else {
      setGridItems(prev => prev.filter(i => i.isStayCharge !== 'bed'));
      setStatusMsg('Bed charges removed from grid');
    }
  };

  const handleToggleDoctorImport = (checked: boolean) => {
    setIsDoctorImported(checked);
    if (checked) {
      setGridItems(prev => [...prev, {
        service_name: `CONSULTANT (${billing?.doctor_consultation?.doctor_name || 'HOSPITAL'})`,
        quantity: 1,
        days: doctorFeesDraft.days,
        rate: doctorFeesDraft.rate,
        amount: doctorFeesDraft.days * doctorFeesDraft.rate,
        isStayCharge: 'doctor'
      }]);
      setStatusMsg('Doctor fees added to grid');
    } else {
      setGridItems(prev => prev.filter(i => i.isStayCharge !== 'doctor'));
      setStatusMsg('Doctor fees removed from grid');
    }
  };

  const totalGridAmount = gridItems.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate Stay Amounts
  const totalBedAmount = (bedChargesDraft.days || 0) * (bedChargesDraft.rate || 0);
  const totalDoctorAmount = (doctorFeesDraft.days || 0) * (doctorFeesDraft.rate || 0);
  
  // Totals from other departments - DISABLED to only calculate manual charges
  const otherDeptsTotal = 0;
    // (billing?.summary?.doctor_services_total || 0) + 
    // (billing?.summary?.prescribed_medicines_total || 0) +
    // (billing?.summary?.pharmacy_total || 0) + 
    // (billing?.summary?.lab_total || 0) + 
    // (billing?.summary?.radiology_total || 0) + 
    // (billing?.summary?.scan_total || 0) +
    // (billing?.summary?.other_bills_total || 0);

  // Calculate bed and doctor amounts only from grid if checkbox is ticked
  const bedChargesInGrid = gridItems.find(item => item.isStayCharge === 'bed');
  const doctorChargesInGrid = gridItems.find(item => item.isStayCharge === 'doctor');
  
  // Use grid amounts for stay charges if checkbox is ticked, otherwise use calculated amounts
  const displayBedAmount = isBedImported ? (bedChargesInGrid?.amount || 0) : 0;
  const displayDoctorAmount = isDoctorImported ? (doctorChargesInGrid?.amount || 0) : 0;

  // Gross Total should only include manual charges + checked stay charges (from grid)
  const finalGrossTotal = totalGridAmount;

  const netAmount = Math.max(0, finalGrossTotal - lessAdvance - concession);

  const handleSave = async () => {
    if (!billing) return;
    try {
      setIsSaving(true);
      setStatusMsg('Saving...');
      
      const updatedBilling = JSON.parse(JSON.stringify(billing));
      updatedBilling.other_charges = gridItems;
      updatedBilling.summary.advance_paid = lessAdvance;
      updatedBilling.summary.discount = concession;
      
      // Update Bed & Doctor charges from drafts
      updatedBilling.bed_charges.days = bedChargesDraft.days;
      updatedBilling.bed_charges.daily_rate = bedChargesDraft.rate;
      updatedBilling.bed_charges.total_amount = totalBedAmount;

      updatedBilling.doctor_consultation.days = doctorFeesDraft.days;
      updatedBilling.doctor_consultation.consultation_fee = doctorFeesDraft.rate;
      updatedBilling.doctor_consultation.total_amount = totalDoctorAmount;

      const otherChargesTotal = totalGridAmount;
      updatedBilling.summary.other_charges_total = otherChargesTotal;
      updatedBilling.summary.bed_charges_total = displayBedAmount;
      updatedBilling.summary.doctor_consultation_total = displayDoctorAmount;
      
      updatedBilling.summary.gross_total = 
         displayBedAmount + 
         displayDoctorAmount + 
         otherChargesTotal; 
         // Department charges disabled - only manual charges calculated
         // (updatedBilling.summary.doctor_services_total || 0) + 
         // (updatedBilling.summary.pharmacy_total || 0) + 
         // (updatedBilling.summary.lab_total || 0) + 
         // (updatedBilling.summary.radiology_total || 0) + 
         // (updatedBilling.summary.scan_total || 0) +
         // (updatedBilling.summary.prescribed_medicines_total || 0) +
         // (updatedBilling.summary.other_bills_total || 0);

      updatedBilling.summary.net_payable = updatedBilling.summary.gross_total - lessAdvance - concession;

      // Save billing summary to discharge_summaries
      await saveIPBilling(bedAllocationId, updatedBilling);
      
      // Save individual charges via dedicated API (bypasses billing_item FK issues)
      const chargesRes = await fetch('/api/ip-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocation_id: bedAllocationId,
          charges: gridItems
        })
      });
      const chargesResult = await chargesRes.json();
      if (chargesResult.error) {
        console.warn('Charges save issue:', chargesResult.message || chargesResult.error);
      }
      
      setStatusMsg('Saved successfully!');
      
      // Clear the entry form
      setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
      setEditingIndex(null);
      
      // Reload billing data so saved charges appear in the SAVED section
      await loadBillingData();
      
    } catch (error) {
      console.error('Error saving billing:', error);
      setStatusMsg('Failed to save billing.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      addGridItem();
    }
  };

  const handleUseAdvanceCheckboxChange = (checked: boolean) => {
    setUseAdvanceCheckbox(checked);
    if (checked) {
      setLessAdvance(availableAdvance);
    } else {
      // Revert to initial advance from billing data
      setLessAdvance(billing?.summary?.advance_paid || 0);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#e67e22]" />
      </div>
    );
  }

  if (!billing) {
    return <div className="p-8">Error loading billing info</div>;
  }

  return (
    <div className="min-h-screen bg-[#f4f6fb] font-sans pb-12">
      {/* ══ MODERN HEADER ══ */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex flex-col">
              <h1 className="text-[17px] font-bold text-slate-800 tracking-tight leading-none mb-1">IP Billing Charges</h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Management</span>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest leading-none">Admin View</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Advance Status Badge */}
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
              <div className="w-8 h-8 rounded-lg bg-indigo-100/50 flex items-center justify-center text-indigo-600">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Avail. Advance</span>
                <span className="text-sm font-bold text-slate-800 font-mono italic tracking-tighter leading-none">₹{availableAdvance.toLocaleString()}</span>
              </div>
              <div className="w-px h-6 bg-indigo-200/50 mx-1" />
              <div className="flex items-center gap-2 cursor-pointer group">
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox"
                    id="apply-advance-header"
                    checked={useAdvanceCheckbox}
                    onChange={(e) => handleUseAdvanceCheckboxChange(e.target.checked)}
                    className="w-4 h-4 rounded border-indigo-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                </div>
                <label htmlFor="apply-advance-header" className="text-[11px] font-bold text-indigo-700 cursor-pointer select-none tracking-tight">AUTO-USE</label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePrint(true)}
                className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <Printer className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                <span className="text-sm font-bold tracking-tight">Standard Print</span>
              </button>

              <button 
                onClick={() => handlePrint(false)}
                className="group flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                <FileText className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                <span className="text-sm font-bold tracking-tight">Letterhead</span>
              </button>

              <button 
                onClick={() => router.push(`/inpatient/billing/${bedAllocationId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 rounded-xl transition-all shadow-md hover:shadow-indigo-200 active:scale-95"
              >
                <List className="h-4 w-4" />
                <span className="text-sm font-bold tracking-tight">History</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 mt-6">
        {/* ── PATIENT & BILLING OVERVIEW ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
          {/* Patient Profile Card (Reduced prominence) */}
          <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden transition-all hover:border-indigo-100 flex items-stretch">
            <div className="p-1 bg-gradient-to-b from-indigo-500 to-indigo-600" />
            <div className="flex-1 p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
              
              {/* Patient Hero Details */}
              <div className="lg:col-span-2 flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0 font-bold text-2xl tracking-tighter">
                  {billing.patient?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'P'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight truncate">{billing.patient?.name || 'N/A'}</h2>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200">
                      <Hash className="h-2.5 w-2.5" /> {billing.admission?.ip_number || 'IP####'}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-200/50 uppercase tracking-tight">
                      {billing.patient?.gender || 'N/A'} • {billing.patient?.age || '??'} yrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Sub Details */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-x-8 gap-y-4 border-l border-slate-100 pl-8">
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Activity className="h-3 w-3" /> UHID
                  </span>
                  <p className="text-sm font-bold text-slate-700 tracking-tight">{billing.patient?.patient_id || 'N/A'}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="flex items-center justify-end gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <Calendar className="h-3 w-3" /> Bill Date
                  </span>
                  <input 
                    type="datetime-local" 
                    value={currentDate} 
                    onChange={(e) => setCurrentDate(e.target.value)} 
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-300 focus:outline-none text-right" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice/Info Card */}
          <div className="md:col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 relative flex flex-col justify-center overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12" />
             <div className="flex items-start gap-4 z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-none mb-1.5 uppercase tracking-tight">Billing Rule</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px]">
                    Ensure "Stay Charges" (Bed & Consultation) are imported from the config below before manual input.
                  </p>
                </div>
             </div>
          </div>
        </div>
              {/* ── STAY CONFIGURATION ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Bed Charges Config */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="import-bed-check"
                    checked={isBedImported}
                    onChange={(e) => handleToggleBedImport(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-indigo-500" />
                  Bed Charges
                </h3>
              </div>
              <div className="px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-100/50">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight italic">₹{totalBedAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Stay Days</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={bedChargesDraft.days} 
                    onChange={(e) => setBedChargesDraft(prev => ({ ...prev, days: Number(e.target.value) }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all focus:bg-white" 
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Daily Rate</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={bedChargesDraft.rate} 
                    onChange={(e) => setBedChargesDraft(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none transition-all focus:bg-white" 
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Consultation Config */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group hover:border-violet-200 transition-all">
            <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="import-doc-check"
                    checked={isDoctorImported}
                    onChange={(e) => handleToggleDoctorImport(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer accent-violet-600"
                  />
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-violet-500" />
                  Consultation
                </h3>
              </div>
              <div className="px-3 py-1 bg-violet-50 rounded-lg border border-violet-100/50">
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-tight italic">₹{totalDoctorAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Visits / Stay</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={doctorFeesDraft.days} 
                    onChange={(e) => setDoctorFeesDraft(prev => ({ ...prev, days: Number(e.target.value) }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:outline-none transition-all focus:bg-white" 
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fee / Visit</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={doctorFeesDraft.rate} 
                    onChange={(e) => setDoctorFeesDraft(prev => ({ ...prev, rate: Number(e.target.value) }))}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:outline-none transition-all focus:bg-white" 
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CHARGE ENTRY FORM ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 overflow-hidden">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[13px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-500" />
              Add New Charge Item
            </h3>
            {editingIndex !== null && (
              <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-200 uppercase tracking-tight animate-pulse">
                Editing Mode Active
              </span>
            )}
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
              <div className="lg:col-span-5 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description / Service Name</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    list="charge-options" 
                    value={entryForm.service_name}
                    onChange={(e) => handleEntryChange('service_name', e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or type service name..."
                    className="w-full h-12 pl-4 pr-10 border border-slate-200 rounded-xl shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 uppercase text-sm font-bold transition-all bg-white hover:border-slate-300"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <datalist id="charge-options">
                  {PREDEFINED_CHARGES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="lg:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Qty / Days</label>
                <input 
                  type="number" 
                  value={entryForm.days || ''}
                  onChange={(e) => handleEntryChange('days', e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-12 px-4 border border-slate-200 rounded-xl text-center text-sm font-bold text-slate-700 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="lg:col-span-2 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unit Rate</label>
                <div className="relative">
                   <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">₹</span>
                   <input 
                    type="number" 
                    value={entryForm.rate || ''}
                    onChange={(e) => handleEntryChange('rate', e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full h-12 pl-7 pr-4 border border-slate-200 rounded-xl text-right text-sm font-bold text-slate-700 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>

              <div className="lg:col-span-3 space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 text-right">Row Total</label>
                <div className="flex gap-3">
                  <div className="flex-1 h-12 px-5 bg-indigo-50/50 border border-indigo-100/50 rounded-xl flex items-center justify-end">
                    <span className="text-xs font-bold text-indigo-400 mr-2 font-mono">₹</span>
                    <span className="text-lg font-black text-indigo-700 font-mono tracking-tight">{entryForm.amount.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={addGridItem}
                    className={`h-12 w-16 flex items-center justify-center rounded-xl shadow-lg transition-all active:scale-95 ${editingIndex !== null ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200 text-white' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 text-white'}`}
                    title={editingIndex !== null ? 'Update Item' : 'Add Item'}
                  >
                    {editingIndex !== null ? <RefreshCw className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CHARGES LIST & TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[14px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Service & Charge Details
            </h3>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Item Count: {gridItems.length}</span>
              <button 
                onClick={handleRefresh}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Clear All Charges"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left border-b border-slate-100">
                  <th className="px-6 py-4 w-16 text-center">#</th>
                  <th className="px-6 py-4">Detailed Description</th>
                  <th className="px-6 py-4 text-center">Qty/Days</th>
                  <th className="px-6 py-4 text-right px-10">Unit Rate</th>
                  <th className="px-6 py-4 text-right px-10">Total Amount</th>
                  <th className="px-6 py-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gridItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Activity className="h-14 w-14 mb-4 text-indigo-200" />
                        <p className="text-lg font-bold text-slate-300 tracking-tighter uppercase italic">No items added to current session</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  gridItems.map((item, idx) => (
                    <tr key={idx} className={`group hover:bg-slate-50/80 transition-all ${editingIndex === idx ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-5 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {item.isStayCharge && (
                            <div className={`w-2 h-2 rounded-full ${item.isStayCharge === 'bed' ? 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]' : 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]'}`} />
                          )}
                          <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{item.service_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-mono font-bold text-xs">{item.days || item.quantity}</span>
                      </td>
                      <td className="px-6 py-5 text-right px-10 font-mono font-bold text-slate-500 text-xs italic">
                        ₹{Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-5 text-right px-10">
                        <span className="font-mono font-black text-slate-900 text-sm">₹{Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => editGridItem(idx)}
                            className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            title="Edit Item"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => removeGridItem(idx)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            title="Remove Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-12 items-center">
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Charges Subtotal</span>
               <span className="text-xl font-bold text-slate-800 font-mono tracking-tighter italic">₹{totalGridAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
          </div>
        </div>

        {/* ── CONSOLIDATED SUMMARY & ACTIONS ── */}
        <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white mb-12 border-4 border-white">
           <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-3xl pointer-events-none" />
           
           <div className="grid grid-cols-1 lg:grid-cols-4 items-stretch divide-y lg:divide-y-0 lg:divide-x divide-white/10 relative z-10">
              {/* Billing Breakdown */}
              <div className="p-8 lg:p-10 col-span-1 space-y-6 bg-white/5">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                       <FileText className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Total Breakdown</h4>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between items-baseline group cursor-default">
                       <span className="text-[10px] uppercase text-slate-500 font-bold tracking-widest group-hover:text-indigo-400 transition-colors">Stay + Other</span>
                       <span className="font-mono text-sm font-bold text-slate-300">₹{finalGrossTotal.toFixed(2)}</span>
                    </div>
                                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                       <span className="text-xs font-black uppercase tracking-widest text-white">Gross Total</span>
                       <span className="text-2xl font-bold font-mono tracking-tighter text-white">₹{finalGrossTotal.toLocaleString()}</span>
                    </div>
                 </div>
              </div>

              {/* Advance & Concession Controls */}
              <div className="p-8 lg:p-10 col-span-2 space-y-10 flex flex-col justify-center">
                 <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                          <Wallet className="h-3.5 w-3.5" /> Advance Adjustment
                       </label>
                       <div className="relative group">
                          <input 
                            type="number" 
                            value={lessAdvance || ''} 
                            onChange={(e) => setLessAdvance(Number(e.target.value))}
                            className="w-full h-14 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xl font-bold text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all placeholder:text-white/10"
                            placeholder="0.00"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xl">₹</span>
                       </div>
                       <p className="text-[10px] font-bold text-slate-500 italic">Adjusting from available ₹{availableAdvance.toLocaleString()}</p>
                    </div>

                    <div className="space-y-3">
                       <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                          <CreditCard className="h-3.5 w-3.5" /> Discount Concession
                       </label>
                       <div className="relative group">
                          <input 
                            type="number" 
                            value={concession || ''} 
                            onChange={(e) => setConcession(Number(e.target.value))}
                            className="w-full h-14 pl-10 pr-4 bg-white/5 border border-white/10 rounded-2xl text-xl font-bold text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none transition-all placeholder:text-white/10"
                            placeholder="0.00"
                          />
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xl">₹</span>
                       </div>
                       <p className="text-[10px] font-bold text-slate-500 italic">Optional deduction from final bill</p>
                    </div>
                 </div>
              </div>

              {/* Final Payable & Save */}
              <div className="p-8 lg:p-10 col-span-1 flex flex-col justify-between bg-gradient-to-br from-slate-800 to-slate-900 border-l border-white/10">
                 <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2 block">Total Outstanding Payable</span>
                    <div className="text-5xl font-black font-mono tracking-tighter text-white">
                       <span className="text-2xl text-slate-600 mr-1">₹</span>
                       {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                 </div>

                 <div className="space-y-4">
                    {statusMsg && (
                      <div className="text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/80 animate-pulse">{statusMsg}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full h-16 bg-white hover:bg-slate-100 text-slate-900 rounded-3xl transition-all shadow-2xl hover:shadow-white/10 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                      <div className="relative z-10 flex items-center justify-center gap-3 group-hover:text-white transition-colors duration-300">
                        {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-5 w-5" />}
                        <span className="text-base font-black uppercase tracking-widest">Finalize & Collect</span>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="w-full h-16 bg-white hover:bg-slate-100 text-slate-900 rounded-3xl transition-all shadow-2xl hover:shadow-white/10 flex items-center justify-center gap-3 active:scale-95 group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-emerald-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                      <div className="relative z-10 flex items-center justify-center gap-3 group-hover:text-white transition-colors duration-300">
                        <Upload className="h-5 w-5" />
                        <span className="text-base font-black uppercase tracking-widest">Upload Bill</span>
                      </div>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* UPLOAD BILL MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="h-6 w-6" />
                  <h2 className="text-xl font-bold">Upload Patient Bill</h2>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-600" />
                    Upload Bill Document
                  </h3>
                  
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setUploadPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="bill-upload"
                    />
                    <label htmlFor="bill-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-slate-500">
                        PNG, JPG, PDF up to 10MB
                      </p>
                    </label>
                  </div>
                  
                  {selectedFile && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-sm font-medium text-emerald-800">
                        Selected: {selectedFile.name}
                      </p>
                      <p className="text-xs text-emerald-600">
                        Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Preview Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-emerald-600" />
                    Preview
                  </h3>
                  
                  {uploadPreview ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      {selectedFile?.type.startsWith('image/') ? (
                        <img 
                          src={uploadPreview} 
                          alt="Bill preview" 
                          className="w-full h-64 object-contain bg-slate-50"
                        />
                      ) : (
                        <div className="h-64 bg-slate-50 flex items-center justify-center">
                          <FileText className="h-16 w-16 text-slate-400" />
                          <p className="ml-3 text-slate-600">PDF Preview</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg h-64 bg-slate-50 flex items-center justify-center">
                      <div className="text-center">
                        <Eye className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">No preview available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Uploaded Bills List */}
              {uploadedBills.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Previously Uploaded Bills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {uploadedBills.map((bill: any) => (
                      <div key={bill.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-slate-50 rounded mb-3 flex items-center justify-center">
                          {bill.file_type.startsWith('image/') ? (
                            <img 
                              src={`data:${bill.file_type};base64,${bill.file_data}`} 
                              alt={bill.file_name} 
                              className="w-full h-full object-contain rounded cursor-pointer"
                              onClick={() => window.open(`data:${bill.file_type};base64,${bill.file_data}`, '_blank')}
                            />
                          ) : (
                            <FileText className="h-8 w-8 text-slate-400" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-800 truncate">{bill.file_name}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(bill.upload_date).toLocaleDateString()}
                        </p>
                        {bill.total_amount > 0 && (
                          <p className="text-xs font-medium text-emerald-600">
                            ₹{bill.total_amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (selectedFile) {
                      try {
                        const formData = new FormData();
                        formData.append('file', selectedFile);
                        formData.append('allocation_id', bedAllocationId);
                        formData.append('patient_name', billing?.patient?.name || '');
                        formData.append('bill_date', new Date().toISOString().split('T')[0]);
                        formData.append('total_amount', finalGrossTotal.toString());

                        const response = await fetch('/api/ip-bills', {
                          method: 'POST',
                          body: formData
                        });

                        const result = await response.json();

                        if (result.success) {
                          // Refresh uploaded bills
                          await loadUploadedBills();
                          setSelectedFile(null);
                          setUploadPreview(null);
                          // Reset file input
                          const fileInput = document.getElementById('bill-upload') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                          setStatusMsg('Bill uploaded successfully!');
                        } else {
                          setStatusMsg('Failed to upload bill: ' + result.error);
                        }
                      } catch (error) {
                        console.error('Upload error:', error);
                        setStatusMsg('Failed to upload bill');
                      }
                    }
                  }}
                  disabled={!selectedFile}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT ONLY SECTION - Styled like Discharge Summary */}
      <div className="print-only-template hidden">
        <div className="print-container bg-white font-sans text-slate-900">
          {/* Official Letterhead Header Area (Reserved 5.9cm space) */}
          <div className="hospital-header-area">
            {printWithHeader && (
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <img src="/images/logo.png" alt="Annam Hospital Logo" className="h-16 w-auto object-contain" />
                </div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Annam Multispeciality Hospital</h2>
                <p className="text-[10px] font-bold text-slate-600 mt-1">
                  2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.
                </p>
                <p className="text-[10px] font-bold text-slate-600">
                  Cell: 8681850592, 8681950592 | Email: annammultispecialityhospital@gmail.com
                </p>
              </div>
            )}
          </div>

          <div className="text-center mb-6 mt-2">
            <h3 className="text-lg font-black text-[#2980b9] uppercase tracking-[0.2em] border-y-2 border-[#2980b9] inline-block px-10 py-1">Inpatient Billing</h3>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-[12px] px-2">
            <div className="space-y-3">
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Patient Name</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-extrabold uppercase ml-1 pb-0.5">{billing.patient?.name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Address</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 uppercase ml-1 pb-0.5 text-[11px] truncate">{billing.patient?.address || 'N/A'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Consultant</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-extrabold uppercase ml-1 pb-0.5">{billing.admission?.doctor_name || 'N/A'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Room/Bed</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">Room {billing.admission?.room_number} / Bed {billing.admission?.bed_number}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-baseline">
                <span className="font-bold w-32 flex-shrink-0">Age & Sex</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">{billing.patient?.age} Yrs / {billing.patient?.gender}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-32 flex-shrink-0">O.P. No / UHID</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-mono font-bold ml-1 pb-0.5">{billing.patient?.patient_id}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-32 flex-shrink-0">I.P. No</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-mono font-bold ml-1 pb-0.5">{billing.admission?.ip_number}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-32 flex-shrink-0">Bill Date</span>
                <span className="font-normal w-4">:</span>
                <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-800 text-[9px] font-black uppercase tracking-widest border-y border-slate-800">
                  <th className="px-3 py-1.5 text-left w-10">S.No</th>
                  <th className="px-3 py-1.5 text-left">Description of Services</th>
                  <th className="px-3 py-1.5 text-center w-20">Qty/Days</th>
                  <th className="px-3 py-1.5 text-right w-28">Rate (₹)</th>
                  <th className="px-3 py-1.5 text-right w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isBedImported && (
                  <tr className="text-[12px]">
                    <td className="px-3 py-2 text-slate-500 font-bold text-center">A</td>
                    <td className="px-3 py-2 font-bold text-slate-800 uppercase">Room Rent / Ward Charges ({billing.bed_charges.bed_type})</td>
                    <td className="px-3 py-2 text-center text-slate-600">{bedChargesDraft.days}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(bedChargesDraft.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{totalBedAmount.toFixed(2)}</td>
                  </tr>
                )}
                {isDoctorImported && (
                  <tr className="text-[12px]">
                    <td className="px-3 py-2 text-slate-500 font-bold text-center">B</td>
                    <td className="px-3 py-2 font-bold text-slate-800 uppercase">Consultation Charges ({billing.doctor_consultation.doctor_name})</td>
                    <td className="px-3 py-2 text-center text-slate-600">{doctorFeesDraft.days}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(doctorFeesDraft.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{totalDoctorAmount.toFixed(2)}</td>
                  </tr>
                )}
                {gridItems.filter(item => !item.isStayCharge).map((item, idx) => (
                  <tr key={idx} className="text-[12px]">
                    <td className="px-3 py-2 text-slate-500 font-bold text-center">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-800 uppercase">{item.service_name}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{item.days || item.quantity}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(item.rate).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-800 font-bold">
                <tr>
                  <td colSpan={4} className="px-3 py-2 text-right text-[10px] uppercase tracking-widest font-black">Gross Total Charges</td>
                  <td className="px-3 py-2 text-right text-[14px] font-mono font-black">₹{finalGrossTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end mb-10 px-2">
            <div className="w-64 space-y-2 py-3 border-t border-slate-200">
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>Advance Adjusted</span>
                <span className="font-mono text-slate-800">- ₹{(lessAdvance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                <span>Discount / Concession</span>
                <span className="font-mono text-slate-800">- ₹{(concession || 0).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-400 flex justify-between items-center text-slate-900">
                <span className="text-[12px] font-black uppercase tracking-tight">Net Payable</span>
                <span className="text-[20px] font-black font-mono tracking-tighter text-slate-900 leading-none">₹{netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-24 mt-16 px-6">
            <div className="text-center flex flex-col items-center">
              <div className="w-full border-t border-slate-300 mb-2"></div>
              <p className="text-[11px] font-black text-slate-800 uppercase">Authorized Signatory</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Annam Hospital Office)</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-full border-t border-slate-300 mb-2"></div>
              <p className="text-[11px] font-black text-slate-800 uppercase">Patient / Attender</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Verification of Charges)</p>
            </div>
          </div>

          <div className="mt-auto pt-8 text-center">
             <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-wider">Computer generated provisional bill • This is not an official receipt • Subject to Hospital Terms</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-only-template, .print-only-template * {
            visibility: visible;
          }
          .print-only-template {
            position: absolute;
            left: 0;
            top: 0;
            width: 20.6cm;
            height: 28.5cm;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          @page {
            size: 20.6cm 28.5cm;
            margin: 0;
          }
          .print-container {
            width: 20.6cm;
            height: 28.5cm;
            padding-left: 1.2cm;
            padding-right: 1.2cm;
            padding-bottom: 1.5cm; /* SPEC: Bottom Margin 1.5 cm */
            position: relative;
            box-sizing: border-box;
            background: white !important;
            display: flex;
            flex-direction: column;
          }
          .hospital-header-area {
            height: 5.9cm; /* SPEC: Top Margin (Header/Logo space) 5.9 cm */
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-bottom: 1px dashed #eee;
          }
          .hospital-header-area:empty {
            border-bottom: none;
          }
          table { width: 100%; border-collapse: collapse; }
          th, td { border-bottom: 1px solid #f0f0f0; }
          .text-emerald-600 { color: #059669 !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
        }
      `}</style>
      </div>
    </div>
  );
}
