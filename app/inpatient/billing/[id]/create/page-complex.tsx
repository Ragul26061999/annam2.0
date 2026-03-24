'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Loader2, Save, List, RefreshCw, Plus, Trash2, Check 
} from 'lucide-react';
import Link from 'next/link';
import { getIPComprehensiveBilling, saveIPBilling } from '../../../../../src/lib/ipBillingService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [statusMsg, setStatusMsg] = useState('');
  
  // Advance payment state
  const [advancePayment, setAdvancePayment] = useState(0);
  const [advanceChecked, setAdvanceChecked] = useState(false);

  useEffect(() => {
    if (bedAllocationId) {
      loadBillingData();
      loadAdvancePayment();
    }
  }, [bedAllocationId]);

  const loadAdvancePayment = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_advances')
        .select('amount')
        .eq('bed_allocation_id', bedAllocationId)
        .eq('status', 'active');
      
      if (error) {
        console.error('Error loading advance payment:', error);
        return;
      }
      
      const totalAdvance = data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
      setAdvancePayment(totalAdvance);
    } catch (error) {
      console.error('Error loading advance payment:', error);
    }
  };

  const loadBillingData = async () => {
    try {
      setLoading(true);
      const data = await getIPComprehensiveBilling(bedAllocationId);
      setBilling(data);
      setGridItems(data.other_charges || []);
      setLessAdvance(data.summary.advance_paid || 0);
      setConcession(data.summary.discount || 0);
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
    setGridItems(prev => [...prev, {
      service_name: entryForm.service_name,
      quantity: 1,
      days: entryForm.days,
      rate: entryForm.rate,
      amount: entryForm.amount
    }]);
    
    setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
    setStatusMsg('Charge added');
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

      await saveIPBilling(bedAllocationId, updatedBilling);
      setStatusMsg('Saved successfully!');
      
      setTimeout(() => {
        router.push(`/inpatient/billing/${bedAllocationId}`);
      }, 1000);
      
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

  const handleAdvanceCheckboxChange = (checked: boolean) => {
    setAdvanceChecked(checked);
    if (checked && advancePayment > 0) {
      setLessAdvance(advancePayment);
    } else {
      setLessAdvance(0);
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
          
          <div className="flex items-center gap-4">
            {advancePayment > 0 && (
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="advance-checkbox"
                    checked={advanceChecked}
                    onChange={(e) => handleAdvanceCheckboxChange(e.target.checked)}
                    className="w-4 h-4 text-white bg-white/20 border-white/30 rounded focus:ring-2 focus:ring-white focus:ring-offset-0"
                  />
                  <label htmlFor="advance-checkbox" className="text-sm font-semibold text-white cursor-pointer">
                    Apply Advance
                  </label>
                </div>
                <div className="text-white">
                  <span className="text-xs opacity-75">Advance:</span>
                  <span className="text-sm font-bold ml-1">₹{advancePayment.toFixed(2)}</span>
                </div>
              </div>
            )}
            
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
              <div className="col-span-6 px-4">Charges Name</div>
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
                  <div key={idx} className="grid grid-cols-12 items-center text-sm py-2.5 px-4 hover:bg-[#e67e22]/5 rounded-md group transition-all border border-transparent hover:border-[#e67e22]/20">
                    <div className="col-span-1 text-center font-bold text-slate-400">{idx + 1}</div>
                    <div className="col-span-6 px-4 font-black text-slate-800 uppercase tracking-tight">{item.service_name}</div>
                    <div className="col-span-2 text-center font-bold text-slate-700">{item.days || item.quantity}</div>
                    <div className="col-span-1 text-right px-2 font-mono font-bold text-slate-600">{Number(item.rate).toFixed(2)}</div>
                    <div className="col-span-2 text-right px-4 font-mono font-black text-slate-900 flex justify-between items-center group">
                      <button onClick={() => removeGridItem(idx)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition p-1.5 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                  onChange={(e) => setLessAdvance(Number(e.target.value))}
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
      </div>
    </div>
  );
}
