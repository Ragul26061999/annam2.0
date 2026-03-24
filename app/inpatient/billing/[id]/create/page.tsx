'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, Save, List, RefreshCw, Plus, Trash2, Printer 
} from 'lucide-react';
import Link from 'next/link';
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
  "SURGERY CHARGES",
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

  useEffect(() => {
    if (bedAllocationId) {
      loadBillingData();
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
      
      // Load saved charges from dedicated API
      try {
        const chargesRes = await fetch(`/api/ip-charges?allocation_id=${bedAllocationId}`);
        const chargesData = await chargesRes.json();
        if (chargesData.charges && chargesData.charges.length > 0) {
          setGridItems(chargesData.charges);
        } else {
          setGridItems(data.other_charges || []);
        }
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
      setLessAdvance(0);
      setConcession(0);
      setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
      setStatusMsg('Cleared details');
    }
  };

  const totalGridAmount = gridItems.reduce((sum, item) => sum + item.amount, 0);
  const netAmount = Math.max(0, totalGridAmount - lessAdvance - concession);

  const handleSave = async () => {
    if (!billing) return;
    try {
      setIsSaving(true);
      setStatusMsg('Saving...');
      
      const updatedBilling = JSON.parse(JSON.stringify(billing));
      updatedBilling.other_charges = gridItems;
      updatedBilling.summary.advance_paid = lessAdvance;
      updatedBilling.summary.discount = concession;
      
      const otherChargesTotal = totalGridAmount;
      updatedBilling.summary.other_charges_total = otherChargesTotal;
      
      updatedBilling.summary.gross_total = 
         (updatedBilling.summary.bed_charges_total || 0) + 
         (updatedBilling.summary.doctor_consultation_total || 0) + 
         (updatedBilling.summary.doctor_services_total || 0) + 
         otherChargesTotal + 
         (updatedBilling.summary.pharmacy_total || 0) + 
         (updatedBilling.summary.lab_total || 0) + 
         (updatedBilling.summary.radiology_total || 0) + 
         (updatedBilling.summary.scan_total || 0) +
         (updatedBilling.summary.prescribed_medicines_total || 0) +
         (updatedBilling.summary.other_bills_total || 0);

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
    <div className="min-h-screen bg-slate-100 font-sans pb-12">
      <div className="bg-[#e67e22] text-white shadow-lg">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-wider">IP BILLING CHARGES</h1>
            <span className="text-xs font-semibold bg-[#d35400] px-3 py-1 rounded-full text-white shadow-inner">USER - ADMIN | DEPARTMENT - ADMIN | IP CHARGES</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 px-4 py-1.5 bg-black/10 rounded-lg border border-white/20">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-white/70 uppercase leading-none">Available Advance</span>
                <span className="text-lg font-black text-white font-mono leading-none mt-1">₹ {availableAdvance.toLocaleString()}</span>
              </div>
              <div className="h-8 w-px bg-white/20 mx-1"></div>
              <div className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox"
                  id="apply-advance-header"
                  checked={useAdvanceCheckbox}
                  onChange={(e) => handleUseAdvanceCheckboxChange(e.target.checked)}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-white focus:ring-amber-500 cursor-pointer accent-white"
                />
                <label htmlFor="apply-advance-header" className="text-xs font-black text-white cursor-pointer select-none">USE ADVANCE</label>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm text-white font-bold text-sm rounded transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" /> Print
            </button>

            <Link href={`/inpatient/billing/${bedAllocationId}`}>
              <button className="flex items-center gap-2 px-5 py-1.5 bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-sm text-white font-bold text-sm rounded transition-all shadow-sm">
                <List className="h-4 w-4" /> List
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 mt-8">
        <div className="bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden">
          
          <div className="p-6 bg-orange-50/50 border-b border-[#e67e22]/20 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-bold text-slate-700">IP No</label>
                <input type="text" readOnly value={billing.admission?.ip_number || ''} className="flex-1 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-bold text-slate-700">UH ID</label>
                <input type="text" readOnly value={billing.patient?.patient_id || ''} className="flex-1 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-24 text-sm font-bold text-slate-700">From</label>
                <input type="text" readOnly value="ADMIN" className="flex-1 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm font-bold text-slate-700">Patient Name</label>
                <input type="text" readOnly value={billing.patient?.name || ''} className="flex-1 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
                
                <label className="w-auto text-sm font-bold text-slate-700 whitespace-nowrap">Gender</label>
                <input type="text" readOnly value={billing.patient?.gender || ''} className="w-24 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm font-bold text-slate-700">Patient Age</label>
                <input type="text" readOnly value={billing.patient?.age || ''} className="flex-1 h-9 px-3 bg-slate-100 border border-slate-300 rounded text-sm font-semibold text-slate-700 focus:outline-none" />
              </div>
              <div className="flex items-center gap-4">
                <label className="w-28 text-sm font-bold text-slate-700">Date</label>
                <input type="datetime-local" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-[#e67e22] focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 bg-[#e67e22]/[0.05] border-b border-[#e67e22]/20 shadow-sm relative z-10">
            <div className="flex items-end gap-5">
              <div className="flex-1">
                <label className="block text-xs font-extrabold text-[#d35400] mb-1.5 uppercase tracking-wide">Charges Name</label>
                <input 
                  type="text" 
                  list="charge-options" 
                  value={entryForm.service_name}
                  onChange={(e) => handleEntryChange('service_name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="SELECT OR TYPE CHARGE NAME..."
                  className="w-full h-11 px-3 border border-[#e67e22]/40 rounded-md shadow-sm focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22] uppercase text-sm font-bold transition-shadow bg-white"
                />
                <datalist id="charge-options">
                  {PREDEFINED_CHARGES.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="w-36">
                <label className="block text-xs font-extrabold text-[#d35400] mb-1.5 uppercase tracking-wide">No of Hrs / Days</label>
                <input 
                  type="number" 
                  value={entryForm.days || ''}
                  onChange={(e) => handleEntryChange('days', e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-11 px-3 border border-[#e67e22]/40 rounded-md shadow-sm focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22] text-right text-sm font-bold transition-shadow bg-white"
                />
              </div>

              <div className="w-36">
                <label className="block text-xs font-extrabold text-[#d35400] mb-1.5 uppercase tracking-wide">Rate</label>
                <input 
                  type="number" 
                  value={entryForm.rate || ''}
                  onChange={(e) => handleEntryChange('rate', e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-11 px-3 border border-[#e67e22]/40 rounded-md shadow-sm focus:border-[#e67e22] focus:ring-1 focus:ring-[#e67e22] text-right text-sm font-bold transition-shadow bg-white"
                />
              </div>

              <div className="w-44">
                <label className="block text-xs font-extrabold text-[#d35400] mb-1.5 uppercase tracking-wide">Amount</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    readOnly 
                    value={entryForm.amount.toFixed(2)}
                    className="w-full h-11 px-4 bg-orange-50/80 border border-[#e67e22]/30 rounded-md text-right text-[15px] font-black text-[#d35400]"
                  />
                  <button 
                    onClick={addGridItem}
                    className="h-11 w-12 flex items-center justify-center bg-[#e67e22] text-white rounded-md shadow-md hover:bg-[#d35400] transition active:scale-95"
                    title="Add Charge"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-[350px] bg-slate-50 relative border-b border-slate-200">
            <div className="grid grid-cols-12 bg-slate-200 border-y border-slate-300 text-slate-700 text-xs font-black uppercase tracking-widest py-3 px-4 shadow-sm">
              <div className="col-span-1 text-center">Sl No</div>
              <div className="col-span-1 text-center">Opt</div>
              <div className="col-span-5 px-4">Charges Name</div>
              <div className="col-span-2 text-center">No of Hrs / Days</div>
              <div className="col-span-1 text-right px-2">Rate</div>
              <div className="col-span-2 text-right px-4">Amount</div>
            </div>
            
            <div className="p-2 space-y-1 bg-white max-h-[450px] overflow-y-auto min-h-[300px]">
              {gridItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-40">
                  <List className="h-16 w-16 mb-4 text-slate-300" />
                  <p className="text-lg font-bold text-slate-400">No charges added yet</p>
                </div>
              ) : (
                gridItems.map((item, idx) => (
                  <div key={idx} className={`grid grid-cols-12 items-center text-sm py-2.5 px-4 rounded-md group transition-all border ${editingIndex === idx ? 'bg-orange-100 border-[#e67e22]' : 'hover:bg-[#e67e22]/5 border-transparent hover:border-[#e67e22]/20'}`}>
                    <div className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</div>
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <button onClick={() => editGridItem(idx)} className="text-slate-400 hover:text-blue-500 transition p-1.5 hover:bg-blue-50 rounded" title="Edit">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button onClick={() => removeGridItem(idx)} className="text-slate-400 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded" title="Remove">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="col-span-5 px-4 font-black text-slate-800 uppercase tracking-tight">{item.service_name}</div>
                    <div className="col-span-2 text-center font-bold text-slate-700">{item.days || item.quantity}</div>
                    <div className="col-span-1 text-right px-2 font-mono font-bold text-slate-600">{Number(item.rate).toFixed(2)}</div>
                    <div className="col-span-2 text-right px-4 font-mono font-black text-slate-900 group">
                      <span className="text-[15px]">{Number(item.amount).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-[#e67e22]/5 px-8 py-7 flex items-center justify-between shadow-inner">
            <div className="flex gap-10 items-center">
              <div className="flex items-center gap-4">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">Less Advance</label>
                <input 
                  type="number" 
                  value={lessAdvance || ''} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setLessAdvance(val);
                    if (val !== availableAdvance) {
                      setUseAdvanceCheckbox(false);
                    } else if (val === availableAdvance && availableAdvance > 0) {
                      setUseAdvanceCheckbox(true);
                    }
                  }}

                  className="w-36 h-11 px-3 border border-slate-300 rounded-md text-right font-mono font-bold text-[15px] focus:ring-2 focus:ring-[#e67e22] focus:border-transparent transition-all shadow-sm" 
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">Concession</label>
                <input 
                  type="number" 
                  value={concession || ''} 
                  onChange={(e) => setConcession(Number(e.target.value))}
                  className="w-36 h-11 px-3 border border-slate-300 rounded-md text-right font-mono font-bold text-[15px] focus:ring-2 focus:ring-[#e67e22] focus:border-transparent transition-all shadow-sm" 
                />
              </div>
              <div className="flex items-center gap-5 bg-white px-8 py-3 rounded-lg border-2 border-[#e67e22] shadow-md ml-4">
                <label className="text-lg font-black text-[#d35400] uppercase tracking-wider">Net Amount</label>
                <span className="text-3xl font-black font-mono text-slate-900 tracking-tight">{netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 bg-white border-t border-slate-200 flex items-center justify-between rounded-b-md">
            <div className="text-sm font-bold text-slate-400 flex items-center gap-2 w-1/2">
              Status 
              <span className={`px-3 py-1 text-xs rounded-full uppercase tracking-wider ${statusMsg.includes('Error') || statusMsg.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'} ${statusMsg ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                {statusMsg || 'Idle'}
              </span>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-8 py-3 text-slate-600 hover:text-slate-900 font-extrabold text-sm uppercase tracking-wide rounded-md transition-all hover:bg-slate-100 border-2 border-slate-200"
              >
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-12 py-3 bg-[#e67e22] text-white hover:bg-[#d35400] font-black text-sm uppercase tracking-widest rounded-md transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} 
                {isSaving ? 'Processing...' : 'Save'}
              </button>
            </div>
          </div>

        </div>

        {/* IP BILLING CHARGES - BOTTOM SECTION */}
        <div className="mt-8 bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 bg-[#2c3e50] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <List className="h-5 w-5" />
              <h2 className="text-lg font-bold tracking-wider">SAVED - IP BILLING CHARGES</h2>
            </div>
            <span className="text-xs font-bold bg-[#34495e] px-3 py-1 rounded border border-white/20">
              {gridItems.length} SAVED CHARGES
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-3 w-16 text-center">S.No</th>
                  <th className="px-6 py-3">Charge Name</th>
                  <th className="px-6 py-3 text-center">Qty / Days</th>
                  <th className="px-6 py-3 text-right">Rate</th>
                  <th className="px-6 py-3 text-right">Total Amount</th>
                  <th className="px-6 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gridItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold italic">
                      No saved charges found for this admission.
                    </td>
                  </tr>
                ) : (
                  gridItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm font-black text-slate-800 uppercase">{item.service_name}</td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-slate-600">{item.days || item.quantity}</td>
                      <td className="px-6 py-4 text-right text-sm font-mono text-slate-600">₹ {Number(item.rate).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right text-sm font-black text-slate-900 font-mono">₹ {Number(item.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => editGridItem(idx)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white text-[10px] font-black uppercase border border-blue-200 rounded transition-all shadow-sm active:scale-95"
                        >
                          Edit saved
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {gridItems.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-200">
                    <td colSpan={4} className="px-6 py-4 text-right text-xs uppercase text-slate-500">Total Charges Amount</td>
                    <td className="px-6 py-4 text-right text-lg font-mono text-[#d35400]">₹ {totalGridAmount.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* PRINT ONLY SECTION - Styled like Discharge Summary */}
      <div className="print-only-template hidden">
        <div className="print-container p-12 bg-white font-sans text-slate-900 min-h-screen">
          
          {/* Official Letterhead Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              <img src="/images/logo.png" alt="Annam Hospital Logo" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-black text-[#e67e22] uppercase tracking-wider leading-none">Annam</h1>
            <h2 className="text-lg font-bold text-[#27ae60] uppercase tracking-widest mt-1">Multispeciality Hospital</h2>
            <p className="text-[11px] font-bold text-slate-600 mt-2">
              2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.
            </p>
            <p className="text-[11px] font-bold text-slate-600">
              Cell: 8681850592, 8681950592 | Email: annammultispecialityhospital@gmail.com
            </p>
          </div>

          <div className="text-center mb-8">
            <h3 className="text-xl font-black text-[#2980b9] uppercase tracking-widest border-b-4 border-[#2980b9] inline-block px-8 pb-1">Inpatient Billing</h3>
          </div>

          {/* Patient Info Structure - Following Image Format */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 mb-8 text-sm px-4">
            <div className="space-y-4">
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Name :</span>
                <span className="flex-1 border-b border-slate-300 font-extrabold uppercase ml-2">{billing.patient?.name}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Address :</span>
                <span className="flex-1 border-b border-slate-300 uppercase ml-2 text-[12px]">{billing.patient?.address || 'N/A'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Consultant :</span>
                <span className="flex-1 border-b border-slate-300 font-extrabold uppercase ml-2">{billing.admission?.doctor_name || 'DR. JOHN DOE'}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-24 flex-shrink-0">Room/Bed :</span>
                <span className="flex-1 border-b border-slate-300 font-bold ml-2">Room {billing.admission?.room_number} / Bed {billing.admission?.bed_number}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-baseline">
                <span className="font-bold w-40 flex-shrink-0">Age & Sex :</span>
                <span className="flex-1 border-b border-slate-300 font-bold ml-2">{billing.patient?.age} Yrs / {billing.patient?.gender}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 flex-shrink-0">O.P. No / UHID :</span>
                <span className="flex-1 border-b border-slate-300 font-mono font-bold ml-2">{billing.patient?.patient_id}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 flex-shrink-0">I.P. No :</span>
                <span className="flex-1 border-b border-slate-300 font-mono font-bold ml-2">{billing.admission?.ip_number}</span>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold w-40 flex-shrink-0">Date of Admission :</span>
                <span className="flex-1 border-b border-slate-300 font-bold ml-2">{new Date(billing.admission?.admission_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <div className="mb-8 px-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Detailed Bill - Other Charges</h4>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest border-y-2 border-slate-800">
                  <th className="px-4 py-2 text-left w-12">S.No</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-center w-24">Qty/Days</th>
                  <th className="px-4 py-2 text-right w-32">Rate (₹)</th>
                  <th className="px-4 py-2 text-right w-32">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gridItems.map((item, idx) => (
                  <tr key={idx} className="text-sm">
                    <td className="px-4 py-2.5 text-slate-500 font-bold">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-800 uppercase">{item.service_name}</td>
                    <td className="px-4 py-2.5 text-center text-slate-600">{item.days || item.quantity}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">{Number(item.rate).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">{Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-800 font-bold">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs uppercase tracking-widest font-black">Gross Total</td>
                  <td className="px-4 py-3 text-right text-base font-mono font-black">₹{totalGridAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Billing Summary Box */}
          <div className="flex justify-end mb-16 px-4">
            <div className="w-72 space-y-2.5 py-4 border-t-2 border-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Advance Paid:</span>
                <span className="font-mono text-emerald-600">- ₹{(lessAdvance || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Concession:</span>
                <span className="font-mono text-emerald-600">- ₹{(concession || 0).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-slate-900">
                <span className="text-sm font-black uppercase tracking-tight">Net Amount Payable:</span>
              </div>
              <div className="flex justify-end">
                <span className="text-3xl font-black font-mono italic tracking-tighter text-slate-900 leading-none">₹{netAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Signature Footer - Matching Image 1 */}
          <div className="grid grid-cols-2 gap-48 mt-24 px-8">
            <div className="text-center flex flex-col items-center">
              <div className="w-full border-t border-slate-400 mb-2"></div>
              <p className="text-sm font-black text-slate-800 uppercase">Authorized Signatory</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Annam Hospital Office)</p>
            </div>
            <div className="text-center flex flex-col items-center">
              <div className="w-full border-t border-slate-400 mb-2"></div>
              <p className="text-sm font-black text-slate-800 uppercase">Patient / Attender Signature</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Verification of Charges)</p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] font-bold text-slate-300 uppercase italic">Computer generated provisional bill • This is not an official receipt</p>
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
            width: 100%;
            display: block !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 10mm;
          }
           /* Force colors for print */
          .text-emerald-600 { color: #059669 !important; }
          .bg-slate-100 { background-color: #f1f5f9 !important; }
          .text-blue-600 { color: #2563eb !important; }
        }
      `}</style>
    </div>
  );
}
