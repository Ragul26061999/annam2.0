'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, BedDouble, Activity, AlertTriangle, Search,
  RefreshCw, Eye, LogOut, Clock, Calendar,
  Stethoscope, CheckCircle, Loader2,
  AlertCircle, Trash2, X, ClipboardList, FileText, Receipt,
  Plus, BarChart3, Building2, HeartPulse, TrendingUp, CreditCard,
  ChevronRight, Hash, MapPin, Zap, Filter, MoreVertical,
  Wifi, WifiOff, Star, Shield, FlaskConical, Pill,
  ArrowUpRight, Percent, BedSingle, Home, Layers
} from 'lucide-react';
import { getDashboardStats } from '../../src/lib/dashboardService';
import { deletePatient } from '../../src/lib/patientService';
import { getDischargeSummaryIdsByAllocations } from '../../src/lib/dischargeService';
import {
  getBedAllocations,
  getBedStats,
  getAvailableBeds,
  type BedAllocation,
  type Bed as BedType
} from '../../src/lib/bedAllocationService';
import { supabase } from '../../src/lib/supabase';

interface InpatientStats {
  admittedPatients: number;
  criticalPatients: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  todayAdmissions: number;
}

const BED_TYPE_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  icu:       { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  private:   { bg: 'bg-violet-100', text: 'text-violet-700', dot: 'bg-violet-500' },
  semi:      { bg: 'bg-sky-100',    text: 'text-sky-700',    dot: 'bg-sky-500'    },
  general:   { bg: 'bg-slate-100',  text: 'text-slate-600',  dot: 'bg-slate-400'  },
  emergency: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
};
const bedStyle = (t: string) => BED_TYPE_COLOR[t?.toLowerCase()] || BED_TYPE_COLOR.general;

export default function InpatientPage() {
  const [stats, setStats] = useState<InpatientStats>({
    admittedPatients: 0, criticalPatients: 0, totalBeds: 0,
    occupiedBeds: 0, availableBeds: 0, occupancyRate: 0, todayAdmissions: 0,
  });
  const [allocations, setAllocations] = useState<BedAllocation[]>([]);
  const [allAllocations, setAllAllocations] = useState<BedAllocation[]>([]);
  const [dischargeSummaryByAllocation, setDischargeSummaryByAllocation] = useState<Record<string, string>>({});
  const [advanceByAllocation, setAdvanceByAllocation] = useState<Record<string, number>>({});
  const [availableBedsList, setAvailableBedsList] = useState<BedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [billingSearchTerm, setBillingSearchTerm] = useState('');
  const [billingStatusFilter, setBillingStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'beds' | 'billing'>('overview');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);

  useEffect(() => { loadInpatientData(); }, [statusFilter]);
  useEffect(() => {
    const close = () => setCardMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const loadInpatientData = async () => {
    try {
      setLoading(true);
      const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Loading timeout')), 15000));
      const results = await Promise.race([
        Promise.allSettled([
          getDashboardStats(),
          getBedStats(),
          getBedAllocations({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 }),
          getBedAllocations({ status: undefined, limit: 500 }),
          getAvailableBeds()
        ]),
        timeout
      ]);
      const [ds, bs, ar, aar, av] = results as PromiseSettledResult<any>[];
      const d = ds.status === 'fulfilled' ? ds.value : {};
      const b = bs.status === 'fulfilled' ? bs.value : {};
      const a = ar.status === 'fulfilled' ? ar.value : { allocations: [] };
      const aa = aar.status === 'fulfilled' ? aar.value : { allocations: [] };
      const avail = av.status === 'fulfilled' ? av.value : [];
      const today = new Date().toISOString().split('T')[0];
      setStats({
        admittedPatients: d.admittedPatients || 0,
        criticalPatients: d.criticalPatients || 0,
        totalBeds: b.total || 0,
        occupiedBeds: b.occupied || 0,
        availableBeds: b.available || 0,
        occupancyRate: b.occupancyRate || 0,
        todayAdmissions: a.allocations.filter((x: any) => x.admission_date?.startsWith(today)).length,
      });
      setAllocations(a.allocations);
      setAllAllocations(aa.allocations);
      if (a.allocations.length > 0) {
        try {
          const allocationIds = a.allocations.map((x: any) => x.id);
          const map = await getDischargeSummaryIdsByAllocations(allocationIds);
          setDischargeSummaryByAllocation(map);
          const { data: advRows } = await supabase
            .from('ip_advances')
            .select('bed_allocation_id, available_amount, amount')
            .in('bed_allocation_id', allocationIds)
            .neq('status', 'cancelled');
          const advMap: Record<string, number> = {};
          for (const row of (advRows || [])) {
            const val = row.available_amount ?? row.amount ?? 0;
            advMap[row.bed_allocation_id] = (advMap[row.bed_allocation_id] || 0) + val;
          }
          setAdvanceByAllocation(advMap);
        } catch { setDischargeSummaryByAllocation({}); setAdvanceByAllocation({}); }
      }
      setAvailableBedsList(avail);
      setError(null);
    } catch (err) {
      setError(err instanceof Error && err.message === 'Loading timeout'
        ? 'Loading timed out. Check your connection and retry.'
        : 'Failed to load inpatient data.');
      setAllocations([]); setAllAllocations([]); setAvailableBedsList([]);
    } finally { setLoading(false); }
  };

  const getDoctor = (allocation: BedAllocation) => {
    const raw = allocation.doctor?.name;
    return (typeof raw === 'string' ? raw : (raw as any)?.name || '').trim() || 'Not assigned';
  };

  const days = (admissionDate: string, dischargeDate?: string | null, status?: string) => {
    const a = new Date(admissionDate);
    const e = (status === 'discharged' && dischargeDate) ? new Date(dischargeDate) : new Date();
    return Math.max(1, Math.ceil(Math.abs(e.getTime() - a.getTime()) / 86400000));
  };

  const filteredAllocations = allocations.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (a.patient?.name || '').toLowerCase().includes(q) ||
      (a.patient?.uhid || '').toLowerCase().includes(q) ||
      (a.bed?.bed_number || '').toLowerCase().includes(q) ||
      (a.ip_number || '').toLowerCase().includes(q);
  });

  const filteredBilling = allAllocations.filter(a => {
    if (billingStatusFilter !== 'all' && a.status !== billingStatusFilter) return false;
    if (!billingSearchTerm) return true;
    const q = billingSearchTerm.toLowerCase();
    return (a.patient?.name || '').toLowerCase().includes(q) ||
      (a.patient?.uhid || '').toLowerCase().includes(q) ||
      (a.bed?.bed_number || '').toLowerCase().includes(q);
  });

  const occ = Math.min(stats.occupancyRate, 100);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
          <BedDouble className="h-8 w-8 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">Loading Ward…</p>
        <p className="text-xs text-slate-400 mt-0.5">Fetching bed allocations</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f0f2f8]">

      {/* ══ STICKY HEADER ══ */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-sm">
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <BedDouble className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-slate-800">Ward Management</span>
              <span className="ml-2 text-xs text-slate-400">Inpatient</span>
            </div>
            {stats.criticalPatients > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 animate-pulse">
                <Zap className="h-2.5 w-2.5" /> {stats.criticalPatients} Critical
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadInpatientData}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <Link href="/inpatient/advance-payment">
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg border border-emerald-200 transition-all">
                <CreditCard className="h-3.5 w-3.5" /> Advance
              </button>
            </Link>
            <Link href="/inpatient/create-inpatient">
              <button className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
                <Plus className="h-3.5 w-3.5" /> Admit Patient
              </button>
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex gap-0 -mb-px">
          {([
            { id: 'overview', label: 'Patients', icon: Users },
            { id: 'beds',     label: 'Bed Map',  icon: BedDouble },
            { id: 'billing',  label: 'Billing',  icon: Receipt },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── STAT STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Admitted */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Users className="h-5.5 w-5.5 text-white h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-3xl font-black text-slate-800 leading-none">{stats.admittedPatients}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Total Admitted</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-0.5 text-emerald-600 text-xs font-semibold">
                <ArrowUpRight className="h-3 w-3" /> {stats.todayAdmissions}
              </div>
              <p className="text-[10px] text-slate-400">today</p>
            </div>
          </div>

          {/* Critical */}
          <div className={`rounded-2xl border shadow-sm p-4 flex items-center gap-4 relative overflow-hidden hover:shadow-md transition-shadow ${
            stats.criticalPatients > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'
          }`}>
            {stats.criticalPatients > 0 && <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
              stats.criticalPatients > 0 ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-slate-300 to-slate-400'
            }`}>
              <HeartPulse className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`text-3xl font-black leading-none ${stats.criticalPatients > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {stats.criticalPatients}
              </p>
              <p className="text-xs font-medium text-slate-500 mt-1">Critical Patients</p>
            </div>
            {stats.criticalPatients > 0 && (
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            )}
          </div>

          {/* Beds Available */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
              <BedDouble className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-3xl font-black text-slate-800 leading-none">{stats.availableBeds}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Beds Available</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-slate-700">{stats.occupiedBeds}</p>
              <p className="text-[10px] text-slate-400">occupied</p>
            </div>
          </div>

          {/* Occupancy */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-3xl font-black text-slate-800 leading-none">{stats.occupancyRate}%</p>
                <p className="text-xs font-medium text-slate-500 mt-1">Occupancy Rate</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0%</span>
                <span className={occ > 85 ? 'text-red-500 font-semibold' : occ > 60 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}>
                  {occ > 85 ? 'High' : occ > 60 ? 'Moderate' : 'Low'}
                </span>
                <span>100%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    occ > 85 ? 'bg-gradient-to-r from-red-400 to-rose-500'
                    : occ > 60 ? 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : 'bg-gradient-to-r from-emerald-400 to-teal-500'
                  }`}
                  style={{ width: `${occ}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ══ PATIENTS TAB ══ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-700">
                  {filteredAllocations.length} Patient{filteredAllocations.length !== 1 ? 's' : ''}
                </h2>
                <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                  {(['active', 'all', 'discharged'] as const).map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1 text-[11px] font-semibold rounded-md capitalize transition-all ${
                        statusFilter === s
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}>{s === 'active' ? 'Active' : s === 'all' ? 'All' : 'Discharged'}</button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search name, bed, UHID, IP…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-60 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Patient cards grid */}
            {filteredAllocations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-4 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <BedDouble className="h-8 w-8 text-indigo-300" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-700">No patients found</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {searchTerm ? 'Try adjusting your search' : 'No patients for this filter'}
                  </p>
                </div>
                <Link href="/inpatient/create-inpatient">
                  <button className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all">
                    <Plus className="h-4 w-4" /> Admit New Patient
                  </button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {filteredAllocations.map(allocation => {
                  const name = (allocation.patient?.name || '').trim() || 'Unknown';
                  const uhid = allocation.patient?.uhid || '';
                  const ipNum = allocation.ip_number || '';
                  const bed = allocation.bed?.bed_number || '—';
                  const bedType = allocation.bed?.bed_type || 'general';
                  const floor = allocation.bed?.floor_number;
                  const room = allocation.bed?.room_number;
                  const rate = allocation.bed?.daily_rate;
                  const doctor = getDoctor(allocation);
                  const d = days(allocation.admission_date, allocation.discharge_date, allocation.status);
                  const isActive = allocation.status === 'active' || allocation.status === 'allocated';
                  const isCritical = allocation.patient?.is_critical;
                  const gender = (allocation.patient as any)?.gender;
                  const age = (allocation.patient as any)?.age;
                  const phone = allocation.patient?.phone;
                  const diagnosis = allocation.patient?.diagnosis;
                  const advance = advanceByAllocation[allocation.id] ?? 0;
                  const hasSummary = !!dischargeSummaryByAllocation[allocation.id];
                  const admitDate = new Date(allocation.admission_date);
                  const bStyle = bedStyle(bedType);
                  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <div
                      key={allocation.id}
                      className={`bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden group relative ${
                        isCritical ? 'border-red-200 ring-1 ring-red-100' : 'border-slate-150'
                      }`}
                      style={{ borderColor: isCritical ? undefined : '#e2e6f0' }}
                    >
                      {/* Top accent gradient */}
                      <div className={`h-1 ${
                        isCritical ? 'bg-gradient-to-r from-red-400 via-rose-500 to-orange-400'
                        : isActive ? 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500'
                        : 'bg-gradient-to-r from-slate-300 to-slate-400'
                      }`} />

                      <div className="p-4 flex flex-col gap-0 flex-1">

                        {/* ── Row 1: Avatar + Name + Badge + Menu ── */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* Avatar */}
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0 shadow-sm ${
                            isCritical ? 'bg-gradient-to-br from-red-500 to-rose-600'
                            : isActive ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                            : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}>
                            {initials}
                          </div>

                          {/* Name block */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm font-bold text-slate-800 truncate leading-tight">{name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {age && <span className="text-[10px] text-slate-400 font-medium">{age}y</span>}
                              {gender && <span className="text-[10px] text-slate-400 capitalize">{gender}</span>}
                              {uhid && <span className="text-[10px] font-mono text-slate-400">{uhid}</span>}
                            </div>
                          </div>

                          {/* Status + critical */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isCritical ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse uppercase tracking-wide">
                                <Zap className="h-2 w-2" /> Critical
                              </span>
                            ) : (
                              <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : allocation.status === 'discharged' ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-sky-50 text-sky-600 border-sky-200'
                              }`}>
                                {isActive ? 'Active' : allocation.status}
                              </span>
                            )}
                            {ipNum && (
                              <span className="text-[9px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{ipNum}</span>
                            )}
                          </div>
                        </div>

                        {/* ── Row 2: Bed Card ── */}
                        <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 mb-3 border ${bStyle.bg} border-opacity-50`}
                          style={{ borderColor: 'transparent' }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${bStyle.dot}`} />
                              <p className="text-sm font-black text-slate-800">Bed {bed}</p>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${bStyle.bg} ${bStyle.text}`}>
                                {bedType}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {floor && <span className="text-[10px] text-slate-500">Floor {floor}</span>}
                              {room && <span className="text-[10px] text-slate-400">· Rm {room}</span>}
                              {rate && <span className="text-[10px] text-slate-400">· ₹{rate.toLocaleString()}/day</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-lg font-black text-indigo-600 leading-none">{d}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">day{d !== 1 ? 's' : ''}</p>
                          </div>
                        </div>

                        {/* ── Row 3: Doctor ── */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-3 w-3 text-sky-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] text-slate-400 font-medium leading-none">Attending Doctor</p>
                            <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">Dr. {doctor}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-400">Since</p>
                            <p className="text-[10px] font-semibold text-slate-600">
                              {admitDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                          </div>
                        </div>

                        {/* ── Row 4: Diagnosis ── */}
                        {diagnosis && (
                          <div className="flex items-start gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-2 mb-3">
                            <Activity className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-violet-800 font-medium line-clamp-1 leading-tight flex-1">{diagnosis}</p>
                          </div>
                        )}

                        {/* ── Row 5: Advance + Phone ── */}
                        <div className="flex items-center gap-2 mb-3">
                          {advance > 0 && (
                            <div className="flex-1 flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-2.5 py-1.5">
                              <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-emerald-600 font-medium">Advance</p>
                                <p className="text-xs font-bold text-emerald-700">₹{advance.toLocaleString()}</p>
                              </div>
                            </div>
                          )}
                          {phone && (
                            <div className={`flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 ${advance > 0 ? '' : 'flex-1'}`}>
                              <div className="min-w-0">
                                <p className="text-[9px] text-slate-400 font-medium">Phone</p>
                                <p className="text-[11px] font-semibold text-slate-600">{phone}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Row 6: Action buttons ── */}
                        <div className="pt-2.5 border-t border-slate-100 mt-auto flex items-center gap-1.5">
                          <Link href={`/inpatient/view/${allocation.id}`} className="flex-1">
                            <button className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm">
                              <Eye className="h-3.5 w-3.5" /> View Details
                            </button>
                          </Link>
                          {isActive && (
                            <Link href={`/inpatient/discharge/${allocation.id}`}>
                              <button className="flex items-center gap-1 py-2 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-xl border border-orange-200 transition-all">
                                <LogOut className="h-3.5 w-3.5" /> Discharge
                              </button>
                            </Link>
                          )}
                          <div className="relative">
                            <button
                              onClick={e => { e.stopPropagation(); setCardMenuOpen(cardMenuOpen === allocation.id ? null : allocation.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                            {cardMenuOpen === allocation.id && (
                              <div className="absolute right-0 bottom-10 bg-white border border-slate-150 rounded-xl shadow-xl z-30 py-1 min-w-[160px]"
                                onClick={e => e.stopPropagation()}>
                                <Link href={`/inpatient/billing/${allocation.id}`}>
                                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                                    <Receipt className="h-3.5 w-3.5 text-sky-500" /> View Bill
                                  </button>
                                </Link>
                                <Link href={`/patients/${allocation.patient_id}?tab=clinical-records&allocation=${allocation.id}`}>
                                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                                    <ClipboardList className="h-3.5 w-3.5 text-violet-500" /> Clinical Records
                                  </button>
                                </Link>
                                {hasSummary && (
                                  <Link href={`/inpatient/discharge/${allocation.id}?view=1`}>
                                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                                      <FileText className="h-3.5 w-3.5 text-emerald-500" /> Discharge Summary
                                    </button>
                                  </Link>
                                )}
                                <Link href={`/patients/${allocation.patient_id}`}>
                                  <button className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                                    <Users className="h-3.5 w-3.5 text-indigo-500" /> Patient Profile
                                  </button>
                                </Link>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  onClick={() => { setPatientToDelete(allocation); setDeleteConfirmOpen(true); setCardMenuOpen(null); }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium">
                                  <Trash2 className="h-3.5 w-3.5" /> Delete Patient
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ BED MAP TAB ══ */}
        {activeTab === 'beds' && (
          <div className="space-y-4">
            {/* Summary pills */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: 'Total', value: stats.totalBeds, color: 'bg-slate-700 text-white' },
                { label: 'Occupied', value: stats.occupiedBeds, color: 'bg-indigo-600 text-white' },
                { label: 'Available', value: stats.availableBeds, color: 'bg-emerald-500 text-white' },
              ].map(({ label, value, color }) => (
                <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${color} shadow-sm`}>
                  {value} <span className="font-normal opacity-80">{label}</span>
                </div>
              ))}
            </div>

            {/* Occupied beds — patient-mapped */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-sm font-bold text-slate-800">Occupied Beds</span>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{allocations.filter(a => a.status === 'active' || a.status === 'allocated').length}</span>
                </div>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {allocations
                  .filter(a => a.status === 'active' || a.status === 'allocated')
                  .map(allocation => {
                    const name = (allocation.patient?.name || '').trim() || 'Unknown';
                    const bed = allocation.bed?.bed_number || '—';
                    const bedType = allocation.bed?.bed_type || 'general';
                    const isCritical = allocation.patient?.is_critical;
                    const d = days(allocation.admission_date, allocation.discharge_date, allocation.status);
                    const bStyle = bedStyle(bedType);
                    const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

                    return (
                      <Link key={allocation.id} href={`/inpatient/view/${allocation.id}`}>
                        <div className={`rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all group ${
                          isCritical ? 'bg-red-50 border-red-200' : `${bStyle.bg} border-opacity-60`
                        }`}>
                          {/* Bed number header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <BedDouble className={`h-3.5 w-3.5 ${isCritical ? 'text-red-500' : bStyle.text}`} />
                              <span className={`text-xs font-black ${isCritical ? 'text-red-700' : bStyle.text}`}>{bed}</span>
                            </div>
                            {isCritical ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          {/* Patient avatar + name */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                              isCritical ? 'bg-gradient-to-br from-red-500 to-rose-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                            }`}>{initials}</div>
                            <p className="text-xs font-semibold text-slate-800 truncate flex-1">{name}</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${bStyle.bg} ${bStyle.text}`}>{bedType}</span>
                            <span className="text-[9px] font-bold text-indigo-600">{d}d</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>

            {/* Available beds */}
            {availableBedsList.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-slate-800">Available Beds</span>
                    <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">{availableBedsList.length} open</span>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 gap-2">
                  {availableBedsList.slice(0, 27).map(bed => {
                    const bStyle = bedStyle(bed.bed_type || 'general');
                    return (
                      <div key={bed.id} className={`${bStyle.bg} border border-opacity-50 rounded-xl p-2.5 hover:shadow-sm transition-all`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-black text-slate-800">{bed.bed_number}</p>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>
                        {(bed.floor_number || bed.room_number) && (
                          <p className="text-[9px] text-slate-500">
                            {bed.floor_number ? `Fl ${bed.floor_number}` : ''}{bed.room_number ? ` Rm ${bed.room_number}` : ''}
                          </p>
                        )}
                        <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded-md mt-1 font-bold uppercase ${bStyle.bg} ${bStyle.text}`}>
                          {bed.bed_type || 'General'}
                        </span>
                      </div>
                    );
                  })}
                  {availableBedsList.length > 27 && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex items-center justify-center">
                      <span className="text-[11px] text-slate-400 font-bold">+{availableBedsList.length - 27} more</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ BILLING TAB ══ */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            {/* Billing stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'All Records',  value: allAllocations.length,                                                   icon: Users,      grad: 'from-slate-600 to-slate-700'   },
                { label: 'Active',       value: allAllocations.filter(a => a.status === 'active' || a.status === 'allocated').length, icon: BedDouble,  grad: 'from-emerald-500 to-teal-600'  },
                { label: 'Discharged',   value: allAllocations.filter(a => a.status === 'discharged').length,             icon: CheckCircle,grad: 'from-slate-400 to-slate-500'   },
              ].map(({ label, value, icon: Icon, grad }) => (
                <div key={label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + filter */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-700">
                IP Billing Records
                <span className="ml-2 text-xs font-normal text-slate-400">{filteredBilling.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input type="text" placeholder="Search…" value={billingSearchTerm}
                    onChange={e => setBillingSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white w-48" />
                </div>
                <select value={billingStatusFilter} onChange={e => setBillingStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white text-slate-600">
                  <option value="all">All status</option>
                  <option value="active">Active</option>
                  <option value="allocated">Allocated</option>
                  <option value="discharged">Discharged</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
            </div>

            {filteredBilling.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-16 flex flex-col items-center gap-3 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Receipt className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 font-medium">No billing records found</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-50">
                  {filteredBilling.map(allocation => {
                    const name = (allocation.patient?.name || '').trim() || 'Unknown';
                    const uhid = allocation.patient?.uhid || 'N/A';
                    const bed = allocation.bed?.bed_number || '—';
                    const bedType = allocation.bed?.bed_type || 'General';
                    const doctor = getDoctor(allocation);
                    const d = days(allocation.admission_date, allocation.discharge_date, allocation.status);
                    const isActive = allocation.status === 'active' || allocation.status === 'allocated';
                    const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
                    const bStyle = bedStyle(bedType);

                    return (
                      <div key={allocation.id} className="px-5 py-3.5 hover:bg-slate-50/70 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 ${
                            isActive ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                          }`}>{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-800">{name}</span>
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{uhid}</span>
                              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>{allocation.status}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                              <span className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${bStyle.dot}`} />
                                Bed {bed} · {bedType}
                              </span>
                              <span className="flex items-center gap-1">
                                <Stethoscope className="h-3 w-3 text-slate-300" />Dr. {doctor}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-slate-300" />
                                {new Date(allocation.admission_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </span>
                              <span className="font-bold text-indigo-600">{d}d</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/inpatient/billing/${allocation.id}`}>
                              <button className="text-xs px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl flex items-center gap-1 font-semibold border border-sky-200">
                                <Receipt className="h-3 w-3" /> Bill
                              </button>
                            </Link>
                            <Link href={`/inpatient/billing-breakdown/${allocation.id}`}>
                              <button className="text-xs px-3 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl flex items-center gap-1 font-semibold border border-violet-200">
                                <FileText className="h-3 w-3" /> Breakdown
                              </button>
                            </Link>
                            <Link href={`/inpatient/view/${allocation.id}`}>
                              <button className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all border border-transparent hover:border-indigo-100">
                                <Eye className="h-4 w-4" />
                              </button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setError(null); loadInpatientData(); }}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">Retry</button>
              <button onClick={() => setError(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ DELETE MODAL ══ */}
      {deleteConfirmOpen && patientToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-800">Delete Patient</h2>
                  <p className="text-xs text-slate-400 mt-0.5">This action cannot be undone</p>
                </div>
                <button onClick={() => { setDeleteConfirmOpen(false); setPatientToDelete(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400" disabled={isDeleting}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name</span>
                  <span className="font-semibold text-slate-800">{patientToDelete.patient?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UHID</span>
                  <span className="font-mono text-xs text-slate-700">{patientToDelete.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-slate-700">{patientToDelete.patient?.phone || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">All associated records (appointments, vitals, history) will be affected.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setDeleteConfirmOpen(false); setPatientToDelete(null); }}
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold" disabled={isDeleting}>
                  Cancel
                </button>
                <button onClick={async () => {
                  setIsDeleting(true);
                  try { await deletePatient(patientToDelete.patient_id); await loadInpatientData(); alert('Patient deleted.'); }
                  catch { alert('Failed to delete patient.'); }
                  finally { setIsDeleting(false); setDeleteConfirmOpen(false); setPatientToDelete(null); }
                }} className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2" disabled={isDeleting}>
                  {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
