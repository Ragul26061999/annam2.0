'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Search, BedDouble, User, Stethoscope, Calendar,
  CreditCard, CheckCircle, Loader2, AlertCircle, X, Plus,
  Wallet, Receipt, Clock, Building2, Hash, Banknote,
  Smartphone, Landmark, FileText, TrendingUp, RefreshCw
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import {
  getBedAllocations,
  type BedAllocation
} from '../../../src/lib/bedAllocationService';
import {
  createAdvance,
  getAdvances,
  type IPAdvance,
  type PaymentType
} from '../../../src/lib/ipFlexibleBillingService';

const PAYMENT_METHODS: { value: Exclude<PaymentType, 'advance'>; label: string; icon: React.ElementType }[] = [
  { value: 'cash',        label: 'Cash',        icon: Banknote   },
  { value: 'upi',         label: 'UPI',         icon: Smartphone },
  { value: 'card',        label: 'Card',        icon: CreditCard },
  { value: 'net_banking', label: 'Net Banking', icon: Landmark   },
  { value: 'cheque',      label: 'Cheque',      icon: FileText   },
];

interface AdvanceForm {
  amount: string;
  paymentType: Exclude<PaymentType, 'advance'>;
  referenceNumber: string;
  notes: string;
}

export default function AdvancePaymentPage() {
  const router = useRouter();

  const [allocations, setAllocations]     = useState<BedAllocation[]>([]);
  const [filtered,    setFiltered]        = useState<BedAllocation[]>([]);
  const [search,      setSearch]          = useState('');
  const [selected,    setSelected]        = useState<BedAllocation | null>(null);
  const [advances,    setAdvances]        = useState<IPAdvance[]>([]);
  const [loadingList, setLoadingList]     = useState(true);
  const [loadingAdv,  setLoadingAdv]      = useState(false);
  const [saving,      setSaving]          = useState(false);
  const [toast,       setToast]           = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm,    setShowForm]        = useState(false);

  const [form, setForm] = useState<AdvanceForm>({
    amount:          '',
    paymentType:     'cash',
    referenceNumber: '',
    notes:           '',
  });

  const set = (k: keyof AdvanceForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  // ── Load active admissions ──
  useEffect(() => {
    (async () => {
      try {
        setLoadingList(true);
        const { allocations: data } = await getBedAllocations({ status: 'active', limit: 200 });
        setAllocations(data);
        setFiltered(data);
      } catch {
        showToast('error', 'Failed to load admissions.');
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // ── Filter search ──
  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) { setFiltered(allocations); return; }
    setFiltered(allocations.filter(a =>
      (a.patient?.name || '').toLowerCase().includes(q) ||
      (a.patient?.uhid || '').toLowerCase().includes(q) ||
      (a.ip_number || '').toLowerCase().includes(q) ||
      (a.bed?.bed_number || '').toLowerCase().includes(q)
    ));
  }, [search, allocations]);

  // ── Load advances when patient selected ──
  const selectPatient = async (a: BedAllocation) => {
    setSelected(a);
    setShowForm(false);
    setForm({ amount: '', paymentType: 'cash', referenceNumber: '', notes: '' });
    setLoadingAdv(true);
    try {
      const data = await getAdvances(a.id);
      setAdvances(data);
    } catch {
      setAdvances([]);
    } finally {
      setLoadingAdv(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) { showToast('error', 'Enter a valid amount.'); return; }

    setSaving(true);
    try {
      await createAdvance({
        bed_allocation_id: selected.id,
        patient_id:        selected.patient_id,
        amount:            amt,
        payment_type:      form.paymentType,
        reference_number:  form.referenceNumber || undefined,
        notes:             form.notes || undefined,
        advance_date:      new Date().toISOString(),
      });
      showToast('success', `₹${amt.toLocaleString()} advance recorded successfully.`);
      setShowForm(false);
      setForm({ amount: '', paymentType: 'cash', referenceNumber: '', notes: '' });
      // Refresh advances
      const data = await getAdvances(selected.id);
      setAdvances(data);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to record advance.');
    } finally {
      setSaving(false);
    }
  };

  const totalAdvance     = advances.reduce((s, a) => s + (a.amount || 0), 0);
  const totalAvailable   = advances.reduce((s, a) => s + (a.available_amount || a.amount || 0), 0);
  const totalUsed        = advances.reduce((s, a) => s + (a.used_amount || 0), 0);

  const getDoctor = (a: BedAllocation) => {
    const raw = a.doctor?.name;
    return (typeof raw === 'string' ? raw : (raw as any)?.name || '').trim() || 'Not assigned';
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const fmtDateTime = (d: string) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const statusColor = (s?: string) => {
    switch (s) {
      case 'active':       return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'fully_used':   return 'bg-slate-100 text-slate-600 border border-slate-200';
      case 'refunded':     return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'cancelled':    return 'bg-red-100 text-red-600 border border-red-200';
      default:             return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]">

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-6 h-14 flex items-center gap-4">
          <button onClick={() => router.push('/inpatient')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wallet className="h-3.5 w-3.5 text-white" />
            </div>
            <div>
              <span className="text-[15px] font-semibold text-slate-800">Advance Payment</span>
              <span className="ml-2 text-xs text-slate-400">Record advance for admitted patients</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: 2-col layout ── */}
      <div className="flex-1 overflow-hidden flex gap-0">

        {/* LEFT — Patient list */}
        <div className="w-80 shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, UHID, IP No…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center px-4">
                <BedDouble className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">No active admissions found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filtered.map(a => {
                  const isSelected = selected?.id === a.id;
                  const name = (a.patient?.name || '').trim() || 'Unknown';
                  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <button
                      key={a.id}
                      onClick={() => selectPatient(a)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                        isSelected ? 'bg-emerald-50 border-r-2 border-emerald-500' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                        isSelected ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                      }`}>{initials}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">{a.patient?.uhid}</span>
                          {a.ip_number && <span className="text-[10px] font-mono text-indigo-500">{a.ip_number}</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <BedDouble className="h-3 w-3 text-slate-300" />
                          <span className="text-[11px] text-slate-500">{a.bed?.bed_number} · {a.bed?.bed_type}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Detail */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">Select a Patient</p>
                <p className="text-sm text-slate-400 mt-1">Choose an admitted patient from the left to record advance payment</p>
              </div>
            </div>
          ) : (
            <>
              {/* Patient summary card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
                <div className="p-5 flex items-center gap-5">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(selected.patient?.name || '??').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-bold text-slate-800">{selected.patient?.name}</p>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{selected.patient?.uhid}</span>
                      {selected.ip_number && <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{selected.ip_number}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><BedDouble className="h-3 w-3 text-slate-300" />{selected.bed?.bed_number} · {selected.bed?.bed_type}</span>
                      <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3 text-slate-300" />Dr. {getDoctor(selected)}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-300" />{fmtDate(selected.admission_date)}</span>
                    </div>
                  </div>

                  {/* Advance button */}
                  <button
                    onClick={() => setShowForm(v => !v)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                      showForm
                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-200'
                    }`}
                  >
                    {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showForm ? 'Cancel' : 'Add Advance'}
                  </button>
                </div>

                {/* Advance totals strip */}
                {advances.length > 0 && (
                  <div className="px-5 py-3 border-t border-slate-50 grid grid-cols-3 gap-4 bg-slate-50/60">
                    {[
                      { label: 'Total Advance', value: totalAdvance, color: 'text-slate-800' },
                      { label: 'Available',     value: totalAvailable, color: 'text-emerald-600' },
                      { label: 'Used',          value: totalUsed, color: 'text-orange-600' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{label}</p>
                        <p className={`text-base font-bold mt-0.5 ${color}`}>₹{value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Add Advance Form ── */}
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-emerald-100 shadow-sm overflow-hidden">
                  <div className="h-[3px] bg-gradient-to-r from-emerald-400 to-teal-400" />
                  <div className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <Plus className="h-4 w-4 text-emerald-500" /> Record Advance Payment
                    </h3>

                    {/* Amount */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Amount (₹) *</label>
                      <div className="relative w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
                        <input
                          type="number"
                          value={form.amount}
                          onChange={e => set('amount', e.target.value)}
                          placeholder="0"
                          min="1"
                          required
                          className="w-full pl-7 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300 font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Payment method */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Payment Method *</label>
                      <div className="flex flex-wrap gap-2">
                        {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => set('paymentType', value)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                              form.paymentType === value
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reference + Notes row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Reference No.</label>
                        <input
                          type="text"
                          value={form.referenceNumber}
                          onChange={e => set('referenceNumber', e.target.value)}
                          placeholder="Transaction / cheque no."
                          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notes</label>
                        <input
                          type="text"
                          value={form.notes}
                          onChange={e => set('notes', e.target.value)}
                          placeholder="Optional note…"
                          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        />
                      </div>
                    </div>

                    {/* Preview + Submit */}
                    {form.amount && parseFloat(form.amount) > 0 && (
                      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        <p className="text-sm text-emerald-800">
                          <strong>₹{parseFloat(form.amount).toLocaleString()}</strong> via {PAYMENT_METHODS.find(m => m.value === form.paymentType)?.label}
                          {form.referenceNumber && <> · Ref: <strong>{form.referenceNumber}</strong></>}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-all"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {saving ? 'Recording…' : 'Record Advance'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* ── Advance history ── */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Advance History</span>
                  <button onClick={async () => {
                    setLoadingAdv(true);
                    try { setAdvances(await getAdvances(selected.id)); } finally { setLoadingAdv(false); }
                  }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingAdv ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingAdv ? (
                  <div className="py-10 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  </div>
                ) : advances.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-500">No advance payments yet</p>
                    <button onClick={() => setShowForm(true)}
                      className="text-xs text-emerald-600 font-medium hover:underline">
                      Record first advance →
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {advances.map((adv, i) => {
                      const method = PAYMENT_METHODS.find(m => m.value === adv.payment_type);
                      const Icon = method?.icon || Banknote;
                      return (
                        <div key={adv.id || i} className="px-5 py-4 flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">₹{(adv.amount || 0).toLocaleString()}</span>
                              <span className="text-xs text-slate-500">{method?.label || adv.payment_type}</span>
                              {adv.reference_number && (
                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  #{adv.reference_number}
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${statusColor(adv.status)}`}>
                                {adv.status || 'active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                              {adv.advance_date && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDateTime(adv.advance_date)}</span>}
                              {adv.notes && <span className="truncate max-w-[200px]">{adv.notes}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {(adv.used_amount || 0) > 0 && (
                              <p className="text-[11px] text-orange-600 font-medium">Used: ₹{(adv.used_amount || 0).toLocaleString()}</p>
                            )}
                            <p className="text-[11px] text-emerald-600 font-semibold">Available: ₹{(adv.available_amount ?? adv.amount ?? 0).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium max-w-sm transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.text}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
