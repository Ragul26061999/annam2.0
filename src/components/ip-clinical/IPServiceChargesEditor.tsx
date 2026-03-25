'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, Save, List, RefreshCw, Plus, Trash2 
} from 'lucide-react';
import { saveIPBilling } from '../../lib/ipBillingService';
import { getTotalAvailableAdvance } from '../../lib/ipFlexibleBillingService';

const PREDEFINED_CHARGES = [
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
  "SERVICE CHARGES",
  "STABLER PIN CHARGE",
  "STERILIZATION CHARGES",
  "SUGAR MONITORING",
  "SUTURE CHARGE",
  "SYRINGE PUMP",
  "VENTILATOR CHARGE",
  "WARD CHARGE",
  "X-RAY CHARGES"
];

interface IPServiceChargesEditorProps {
  bedAllocationId: string;
  patientId: string;
  billing: any;
  onUpdate?: () => void;
}

export default function IPServiceChargesEditor({ 
  bedAllocationId, 
  patientId, 
  billing,
  onUpdate 
}: IPServiceChargesEditorProps) {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [gridItems, setGridItems] = useState<any[]>([]);
  const [availableAdvance, setAvailableAdvance] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [entryForm, setEntryForm] = useState({
    service_name: '',
    days: 0,
    rate: 0,
    amount: 0
  });

  useEffect(() => {
    if (bedAllocationId) {
      loadData();
    }
  }, [bedAllocationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const totalAvailAdvance = await getTotalAvailableAdvance(bedAllocationId);
      setAvailableAdvance(totalAvailAdvance);
      
      const chargesRes = await fetch(`/api/ip-charges?allocation_id=${bedAllocationId}`);
      const chargesData = await chargesRes.json();
      
      if (chargesData.charges && chargesData.charges.length > 0) {
        setGridItems(chargesData.charges);
      } else if (billing?.other_charges) {
        setGridItems(billing.other_charges);
      }
    } catch (error) {
      console.error('Error loading charges:', error);
      setStatusMsg('Error loading charges');
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
      setStatusMsg('Please enter valid charge details');
      return;
    }

    if (editingIndex !== null) {
      setGridItems(prev => {
        const updated = [...prev];
        updated[editingIndex] = { ...entryForm, quantity: entryForm.days };
        return updated;
      });
      setEditingIndex(null);
    } else {
      setGridItems(prev => [...prev, { ...entryForm, quantity: entryForm.days }]);
    }
    
    setEntryForm({ service_name: '', days: 0, rate: 0, amount: 0 });
    setStatusMsg('Charge added');
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
  };

  const removeGridItem = (index: number) => {
    setGridItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalGridAmount = gridItems.reduce((sum, item) => sum + item.amount, 0);

  const handleSave = async () => {
    if (!billing) return;
    try {
      setIsSaving(true);
      setStatusMsg('Saving...');
      
      const updatedBilling = JSON.parse(JSON.stringify(billing));
      updatedBilling.other_charges = gridItems;
      updatedBilling.summary.other_charges_total = totalGridAmount;
      
      updatedBilling.summary.gross_total = 
         (updatedBilling.summary.doctor_services_total || 0) + 
         totalGridAmount + 
         (updatedBilling.summary.pharmacy_total || 0) + 
         (updatedBilling.summary.lab_total || 0) + 
         (updatedBilling.summary.radiology_total || 0) + 
         (updatedBilling.summary.scan_total || 0) +
         (updatedBilling.summary.prescribed_medicines_total || 0) +
         (updatedBilling.summary.other_bills_total || 0);

      updatedBilling.summary.net_payable = updatedBilling.summary.gross_total - (updatedBilling.summary.advance_paid || 0) - (updatedBilling.summary.discount || 0);

      await saveIPBilling(bedAllocationId, updatedBilling);
      
      await fetch('/api/ip-charges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocation_id: bedAllocationId,
          charges: gridItems
        })
      });
      
      setStatusMsg('Saved successfully!');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving:', error);
      setStatusMsg('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-orange-500" /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 uppercase">Service Charges</h2>
          <p className="text-sm text-gray-600 mt-1">Surgical procedures and related service charges</p>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 mb-6 group transition-all hover:bg-white hover:border-indigo-100 hover:shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Service Component Name</label>
            <input 
              type="text" 
              list="service-charge-options" 
              value={entryForm.service_name}
              onChange={(e) => handleEntryChange('service_name', e.target.value)}
              placeholder="Select or type charge name..."
              className="w-full h-11 px-4 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase placeholder:italic placeholder:font-normal"
            />
            <datalist id="service-charge-options">
              {PREDEFINED_CHARGES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hrs / Days</label>
            <input 
              type="number" 
              value={entryForm.days || ''}
              onChange={(e) => handleEntryChange('days', e.target.value)}
              className="w-full h-11 px-4 bg-white border border-gray-200 rounded-lg text-center text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Unit Rate</label>
            <input 
              type="number" 
              value={entryForm.rate || ''}
              onChange={(e) => handleEntryChange('rate', e.target.value)}
              className="w-full h-11 px-4 bg-white border border-gray-200 rounded-lg text-right text-sm font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-indigo-600">Total Amount</label>
            <div className="flex gap-3">
              <div className="flex-1 h-11 flex items-center justify-end px-4 bg-indigo-50 border border-indigo-100 rounded-lg text-lg font-black text-indigo-700 shadow-inner leading-none">
                ₹ {entryForm.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button 
                onClick={addGridItem}
                className="h-11 w-11 flex items-center justify-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                disabled={!entryForm.service_name || entryForm.amount <= 0}
              >
                {editingIndex !== null ? <Save className="h-5 w-5" /> : <Plus className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-6 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              <th className="px-6 py-3 w-16 text-center">No.</th>
              <th className="px-6 py-3">Charge Description</th>
              <th className="px-6 py-3 text-center">Qty/Days</th>
              <th className="px-6 py-3 text-right">Rate</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gridItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                  <div className="flex flex-col items-center justify-center gap-2 opacity-50">
                    <List className="h-8 w-8 text-gray-300" />
                    No service charges recorded yet.
                  </div>
                </td>
              </tr>
            ) : (
              gridItems.map((item, idx) => (
                <tr key={idx} className={`hover:bg-indigo-50/30 transition-colors group ${editingIndex === idx ? 'bg-indigo-50' : ''}`}>
                  <td className="px-6 py-3.5 text-center text-xs font-bold text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-3.5 text-sm font-bold text-gray-800 uppercase tracking-tight">{item.service_name}</td>
                  <td className="px-6 py-3.5 text-center text-sm font-semibold text-gray-600">{item.days || item.quantity}</td>
                  <td className="px-6 py-3.5 text-right text-sm font-mono text-gray-600">₹{Number(item.rate).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right text-sm font-black text-gray-900 font-mono">₹{Number(item.amount).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editGridItem(idx)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md shadow-sm border border-transparent hover:border-blue-200 transition-all" title="Edit"><RefreshCw className="h-3.5 w-3.5" /></button>
                      <button onClick={() => removeGridItem(idx)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md shadow-sm border border-transparent hover:border-red-200 transition-all" title="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {gridItems.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Subtotal Service Charges</td>
                <td className="px-6 py-4 text-right text-lg font-black font-mono text-indigo-700">₹ {totalGridAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Summary and Save */}
      <div className="flex flex-wrap items-center justify-end gap-6 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-6 group">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[.2em] mb-1">Total Service Charges</span>
            <span className="text-3xl font-black font-mono text-gray-900 tracking-tighter shadow-[#6366f120] drop-shadow-md transition-transform group-hover:scale-110">₹{totalGridAmount.toFixed(2)}</span>
          </div>
          
          <div className="h-12 w-px bg-gray-200 mx-2"></div>

          <div className="flex flex-col gap-2">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-10 py-3.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} 
              {isSaving ? 'Processing...' : 'Save Charges'}
            </button>
            
            {statusMsg && (
              <p className={`text-[10px] font-bold text-center uppercase tracking-widest transition-opacity ${statusMsg.includes('Error') || statusMsg.includes('Failed') ? 'text-red-500' : 'text-green-600 animate-pulse'}`}>
                {statusMsg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
