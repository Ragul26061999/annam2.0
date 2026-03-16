'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Eye, UserPlus, UserMinus, CheckCircle,
  Users, MoreVertical, Calendar, Activity, ArrowRightLeft,
  AlertTriangle, X, Trash2, Edit, RefreshCw, BedDouble,
  MapPin, Zap, Clock, DollarSign, Building2, Layers,
  Filter, ChevronDown, Loader2, Home, Hash, WrenchIcon
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { deleteBed } from '@/src/lib/bedAllocationService';
import BedTransferModal from '@/src/components/BedTransferModal';
import AddBedModal from '@/src/components/AddBedModal';
import EditBedModal from '@/src/components/EditBedModal';

interface BedData {
  id: string;
  bed_number: string;
  room_number: string;
  bed_type: string;
  floor_number: number;
  status: string;
  features: string[];
  daily_rate: string;
  department_name: string;
  department_id: string;
  patient_id: string | null;
  patient_name: string | null;
  patient_hospital_id: string | null;
  admission_date: string | null;
  discharge_date: string | null;
}

interface BedStats {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  icuBeds: number;
  generalBeds: number;
  occupancyRate: number;
}

// ── type config ──────────────────────────────────────────────
const BED_TYPE: Record<string, {
  gradient: string; light: string; text: string; border: string; dot: string; label: string
}> = {
  icu:        { gradient: 'from-red-500 to-rose-600',      light: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    label: 'ICU' },
  general:    { gradient: 'from-sky-500 to-blue-600',      light: 'bg-sky-50',    text: 'text-sky-700',    border: 'border-sky-200',    dot: 'bg-sky-500',    label: 'General' },
  private:    { gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', label: 'Private' },
  semi:       { gradient: 'from-indigo-500 to-blue-600',   light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', label: 'Semi' },
  emergency:  { gradient: 'from-orange-500 to-amber-500',  light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500', label: 'Emergency' },
  maternity:  { gradient: 'from-pink-500 to-rose-500',     light: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',   dot: 'bg-pink-500',   label: 'Maternity' },
  pediatric:  { gradient: 'from-teal-500 to-emerald-500',  light: 'bg-teal-50',   text: 'text-teal-700',   border: 'border-teal-200',   dot: 'bg-teal-500',   label: 'Pediatric' },
};
const bedType = (t: string) => BED_TYPE[t?.toLowerCase()] || {
  gradient: 'from-slate-500 to-slate-600', light: 'bg-slate-50', text: 'text-slate-600',
  border: 'border-slate-200', dot: 'bg-slate-400', label: t || 'General'
};

const STATUS = {
  occupied:    { pill: 'bg-red-100 text-red-700 border-red-200',      dot: 'bg-red-500',    glow: 'shadow-red-100' },
  available:   { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-emerald-100' },
  maintenance: { pill: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500',  glow: 'shadow-amber-100' },
  cleaning:    { pill: 'bg-sky-100 text-sky-700 border-sky-200',       dot: 'bg-sky-500',    glow: 'shadow-sky-100' },
};
const bedStatus = (s: string) => STATUS[s?.toLowerCase() as keyof typeof STATUS] || STATUS.available;

const formatDate = (d: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const daysSince = (d: string | null) => {
  if (!d) return 0;
  return Math.max(1, Math.ceil((Date.now() - new Date(d).getTime()) / 86400000));
};
const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

// ── Component ─────────────────────────────────────────────────
export default function BedsPage() {
  const [beds, setBeds] = useState<BedData[]>([]);
  const [stats, setStats] = useState<BedStats>({
    totalBeds: 0, occupiedBeds: 0, availableBeds: 0,
    maintenanceBeds: 0, icuBeds: 0, generalBeds: 0, occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'floor'>('grid');

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddBedModal, setShowAddBedModal] = useState(false);
  const [showEditBedModal, setShowEditBedModal] = useState(false);
  const [selectedBed, setSelectedBed] = useState<BedData | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<BedData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    fetchBedData();
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const fetchBedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: bedStats } = await supabase.from('beds').select('status, bed_type');
      const total = bedStats?.length || 0;
      const occupied = bedStats?.filter((b: any) => b?.status === 'occupied').length || 0;
      const available = bedStats?.filter((b: any) => b?.status === 'available').length || 0;
      const maintenance = bedStats?.filter((b: any) => b?.status === 'maintenance').length || 0;
      const icu = bedStats?.filter((b: any) => b?.bed_type === 'icu').length || 0;
      const general = bedStats?.filter((b: any) => b?.bed_type === 'general').length || 0;

      setStats({
        totalBeds: total, occupiedBeds: occupied, availableBeds: available,
        maintenanceBeds: maintenance, icuBeds: icu, generalBeds: general,
        occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0
      });

      const { data: bedData, error: bedError } = await supabase
        .from('beds')
        .select(`
          *,
          departments(name),
          bed_allocations!left(
            patient_id, admission_date, discharge_date, status,
            patients(id, name, patient_id)
          )
        `);

      if (bedError) throw new Error(bedError.message);

      const transformed: BedData[] = (bedData || []).map((bed: any) => {
        const allocs = Array.isArray(bed.bed_allocations) ? bed.bed_allocations : [];
        const active = allocs.find((a: any) => a?.status === 'active');
        const corrected = bed?.status === 'occupied' && !active ? 'available' : (bed?.status || 'available');
        return {
          id: bed?.id || '',
          bed_number: bed?.bed_number || '',
          room_number: bed?.room_number || '',
          bed_type: bed?.bed_type || 'general',
          floor_number: bed?.floor_number || 1,
          status: corrected,
          features: Array.isArray(bed?.features) ? bed.features : [],
          daily_rate: bed?.daily_rate?.toString() || '0',
          department_name: bed?.departments?.name || 'Unknown',
          department_id: bed?.department_id || '',
          patient_id: active?.patients?.id || null,
          patient_name: active?.patients?.name || null,
          patient_hospital_id: active?.patients?.patient_id || null,
          admission_date: active?.admission_date || null,
          discharge_date: active?.discharge_date || null,
        };
      });

      setBeds(transformed);
    } catch (e: any) {
      setError(e?.message || 'Failed to load bed data');
      setBeds([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = beds.filter(b => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      b.bed_number.toLowerCase().includes(q) ||
      b.department_name.toLowerCase().includes(q) ||
      (b.patient_name || '').toLowerCase().includes(q) ||
      b.room_number.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || b.status.toLowerCase() === statusFilter;
    const matchType = typeFilter === 'all' || b.bed_type.toLowerCase() === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const occ = Math.min(stats.occupancyRate, 100);
  const bedTypes = [...new Set(beds.map(b => b.bed_type.toLowerCase()))];

  // Floor grouping
  const byFloor = filtered.reduce((acc, b) => {
    const k = `Floor ${b.floor_number}`;
    if (!acc[k]) acc[k] = [];
    acc[k].push(b);
    return acc;
  }, {} as Record<string, BedData[]>);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
          <BedDouble className="h-8 w-8 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100">
          <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700">Loading Beds…</p>
        <p className="text-xs text-slate-400 mt-0.5">Fetching bed allocations & status</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f0f2f8]">

      {/* ══ HEADER ══ */}
      <div className="bg-white border-b border-slate-200/80 sticky top-0 z-20 shadow-sm">
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <BedDouble className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-slate-800">Bed Management</span>
              <span className="ml-2 text-xs text-slate-400">{stats.totalBeds} beds</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchBedData}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {/* View toggle */}
            <div className="flex gap-0.5 p-0.5 bg-slate-100 rounded-lg">
              {([
                { id: 'grid',  icon: Layers,   label: 'Grid'  },
                { id: 'floor', icon: Building2, label: 'Floor' },
              ] as const).map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setViewMode(id)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddBedModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Bed
            </button>
          </div>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

        {/* ── STAT STRIP ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Occupancy gauge card */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
            {/* Ring */}
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none"
                  stroke={occ > 85 ? '#ef4444' : occ > 60 ? '#f59e0b' : '#10b981'}
                  strokeWidth="8"
                  strokeDasharray={`${(occ / 100) * 201} 201`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800 leading-none">{occ}%</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <p className="text-sm font-bold text-slate-700">Occupancy Rate</p>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-2xl font-black text-slate-800 leading-none">{stats.occupiedBeds}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Occupied</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-2xl font-black text-emerald-600 leading-none">{stats.availableBeds}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Available</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-2xl font-black text-amber-500 leading-none">{stats.maintenanceBeds}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Maintenance</p>
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shrink-0 shadow-sm">
              <BedDouble className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{stats.totalBeds}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">Total Beds</p>
            </div>
          </div>

          {/* ICU */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0 shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{stats.icuBeds}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">ICU Beds</p>
            </div>
          </div>

          {/* General */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{stats.generalBeds}</p>
              <p className="text-xs font-medium text-slate-500 mt-1">General Beds</p>
            </div>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bed, patient, room…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-400"
            />
          </div>

          {/* Status pills */}
          <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl">
            {(['all', 'occupied', 'available', 'maintenance'] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                  statusFilter === s
                    ? s === 'occupied'    ? 'bg-red-500 text-white shadow-sm'
                      : s === 'available'  ? 'bg-emerald-500 text-white shadow-sm'
                      : s === 'maintenance'? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 capitalize">
            <option value="all">All Types</option>
            {bedTypes.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>

          <span className="ml-auto text-xs text-slate-400 font-medium">{filtered.length} beds</span>
        </div>

        {/* ── GRID VIEW ── */}
        {viewMode === 'grid' && (
          filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-20 flex flex-col items-center gap-4 shadow-sm text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center">
                <BedDouble className="h-8 w-8 text-slate-300" />
              </div>
              <div>
                <p className="text-base font-bold text-slate-700">No beds found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
              <button onClick={() => setShowAddBedModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl shadow-sm">
                <Plus className="h-4 w-4" /> Add Bed
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(bed => <BedCard key={bed.id} bed={bed} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId}
                onEdit={() => { setSelectedBed(bed); setShowEditBedModal(true); }}
                onTransfer={() => { setSelectedBed(bed); setShowTransferModal(true); }}
                onDelete={() => { setBedToDelete(bed); setDeleteConfirmOpen(true); }}
              />)}
            </div>
          )
        )}

        {/* ── FLOOR VIEW ── */}
        {viewMode === 'floor' && (
          <div className="space-y-5">
            {Object.entries(byFloor).sort(([a], [b]) => a.localeCompare(b)).map(([floor, floorBeds]) => {
              const occF = floorBeds.filter(b => b.status === 'occupied').length;
              const availF = floorBeds.filter(b => b.status === 'available').length;
              const occPct = floorBeds.length > 0 ? Math.round((occF / floorBeds.length) * 100) : 0;

              return (
                <div key={floor} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Floor header */}
                  <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Building2 className="h-4.5 w-4.5 text-white h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{floor}</p>
                        <p className="text-xs text-slate-400">{floorBeds.length} bed{floorBeds.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="font-bold text-slate-700">{occF}</span>
                          <span className="text-slate-400 text-xs">Occupied</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span className="font-bold text-slate-700">{availF}</span>
                          <span className="text-slate-400 text-xs">Available</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${occPct > 80 ? 'bg-red-500' : occPct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${occPct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{occPct}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Floor bed tiles */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {floorBeds.map(bed => {
                      const bt = bedType(bed.bed_type);
                      const bs = bedStatus(bed.status);
                      return (
                        <div key={bed.id}
                          className={`rounded-xl border ${bt.border} overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer`}
                          onClick={() => { setSelectedBed(bed); setShowEditBedModal(true); }}
                        >
                          {/* Type color top strip */}
                          <div className={`h-1 bg-gradient-to-r ${bt.gradient}`} />
                          <div className={`${bt.light} p-3`}>
                            {/* Bed number + status dot */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <BedDouble className={`h-3.5 w-3.5 ${bt.text}`} />
                                <span className={`text-sm font-black ${bt.text}`}>{bed.bed_number}</span>
                              </div>
                              <div className={`w-2 h-2 rounded-full ${bs.dot} ${bed.status === 'occupied' ? 'animate-pulse' : ''}`} />
                            </div>

                            {/* Patient or empty state */}
                            {bed.status === 'occupied' && bed.patient_name ? (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[8px] font-black text-white shrink-0">
                                    {initials(bed.patient_name)}
                                  </div>
                                  <p className="text-[11px] font-semibold text-slate-800 truncate">{bed.patient_name}</p>
                                </div>
                                <p className="text-[9px] text-slate-500 font-medium">
                                  {daysSince(bed.admission_date)}d · ₹{parseInt(bed.daily_rate || '0').toLocaleString()}/day
                                </p>
                              </div>
                            ) : bed.status === 'maintenance' ? (
                              <div className="flex items-center gap-1">
                                <WrenchIcon className="h-3 w-3 text-amber-500" />
                                <p className="text-[10px] text-amber-700 font-medium">Maintenance</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-[10px] text-emerald-700 font-semibold">Available</p>
                                <p className="text-[9px] text-slate-400">₹{parseInt(bed.daily_rate || '0').toLocaleString()}/day</p>
                              </div>
                            )}

                            <span className={`mt-2 inline-block text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${bt.light} ${bt.text}`}>
                              {bt.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
            <button onClick={() => { setError(null); fetchBedData(); }}
              className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}
      {showTransferModal && selectedBed?.patient_name && (
        <BedTransferModal
          isOpen={showTransferModal}
          onClose={() => { setShowTransferModal(false); setSelectedBed(null); }}
          currentBed={{
            id: selectedBed.id,
            bed_number: selectedBed.bed_number,
            room_number: selectedBed.room_number,
            bed_type: selectedBed.bed_type,
            patient_name: selectedBed.patient_name,
            patient_hospital_id: selectedBed.patient_hospital_id || 'N/A'
          }}
          onSuccess={() => { fetchBedData(); setShowTransferModal(false); setSelectedBed(null); }}
        />
      )}

      <AddBedModal
        isOpen={showAddBedModal}
        onClose={() => setShowAddBedModal(false)}
        onSuccess={() => { fetchBedData(); setShowAddBedModal(false); }}
      />

      {selectedBed && (
        <EditBedModal
          isOpen={showEditBedModal}
          onClose={() => { setShowEditBedModal(false); setSelectedBed(null); }}
          onSuccess={() => { fetchBedData(); setShowEditBedModal(false); setSelectedBed(null); }}
          bed={{
            id: selectedBed.id,
            bed_number: selectedBed.bed_number,
            room_number: selectedBed.room_number,
            floor_number: selectedBed.floor_number,
            bed_type: selectedBed.bed_type,
            daily_rate: parseFloat(selectedBed.daily_rate),
            department_id: selectedBed.department_id || '',
            features: selectedBed.features,
            status: selectedBed.status
          }}
        />
      )}

      {/* Delete modal */}
      {deleteConfirmOpen && bedToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-red-500 to-rose-500" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-800">Delete Bed</h2>
                  <p className="text-xs text-slate-400 mt-0.5">This cannot be undone</p>
                </div>
                <button onClick={() => { setDeleteConfirmOpen(false); setBedToDelete(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400" disabled={isDeleting}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4 space-y-2 text-sm">
                {[
                  ['Bed Number', bedToDelete.bed_number],
                  ['Type', bedToDelete.bed_type],
                  ['Room', bedToDelete.room_number],
                  ['Status', bedToDelete.status],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800 capitalize">{val}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 mb-5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Only beds without active patient allocations can be deleted.</p>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { setDeleteConfirmOpen(false); setBedToDelete(null); }}
                  className="flex-1 px-4 py-2.5 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold" disabled={isDeleting}>
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await deleteBed(bedToDelete.id);
                      await fetchBedData();
                    } catch {
                      alert('Failed to delete bed. Check if it has active allocations.');
                    } finally {
                      setIsDeleting(false);
                      setDeleteConfirmOpen(false);
                      setBedToDelete(null);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  {isDeleting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                    : <><Trash2 className="h-4 w-4" /> Delete Bed</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bed Card Component ─────────────────────────────────────────
function BedCard({ bed, openMenuId, setOpenMenuId, onEdit, onTransfer, onDelete }: {
  bed: BedData;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onEdit: () => void;
  onTransfer: () => void;
  onDelete: () => void;
}) {
  const bt = bedType(bed.bed_type);
  const bs = bedStatus(bed.status);
  const isOccupied = bed.status === 'occupied';
  const isMaintenance = bed.status === 'maintenance';
  const d = daysSince(bed.admission_date);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col ${
      isOccupied ? 'border-slate-200' : isMaintenance ? 'border-amber-200' : 'border-emerald-100'
    }`}>
      {/* Color accent top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${bt.gradient}`} />

      <div className="p-4 flex flex-col gap-0 flex-1">

        {/* ── Row 1: Bed Number + Type + Status + Menu ── */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Bed icon block */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bt.gradient} flex flex-col items-center justify-center text-white shadow-sm shrink-0`}>
              <BedDouble className="h-4 w-4 mb-0.5" />
              <span className="text-[10px] font-black leading-none">{bed.bed_number}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{bt.label} Bed</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-2.5 w-2.5 text-slate-400" />
                <p className="text-[11px] text-slate-500">Room {bed.room_number}</p>
                {bed.floor_number && (
                  <span className="text-[10px] text-slate-400">· Fl {bed.floor_number}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${bs.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bs.dot} ${isOccupied ? 'animate-pulse' : ''}`} />
              {bed.status}
            </span>
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setOpenMenuId(openMenuId === bed.id ? null : bed.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {openMenuId === bed.id && (
                <div className="absolute right-0 top-8 bg-white border border-slate-150 rounded-xl shadow-xl z-30 py-1 min-w-[160px]">
                  <button onClick={() => { onEdit(); setOpenMenuId(null); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                    <Edit className="h-3.5 w-3.5 text-indigo-500" /> Edit Bed
                  </button>
                  {isOccupied && (
                    <button onClick={() => { onTransfer(); setOpenMenuId(null); }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 font-medium">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-violet-500" /> Transfer Patient
                    </button>
                  )}
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={() => { onDelete(); setOpenMenuId(null); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium">
                    <Trash2 className="h-3.5 w-3.5" /> Delete Bed
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-slate-100 mb-3" />

        {/* ── Patient section / Empty state ── */}
        {isOccupied && bed.patient_name ? (
          <div className="flex flex-col gap-3 flex-1">
            {/* Patient info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm">
                {initials(bed.patient_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{bed.patient_name}</p>
                <p className="text-[11px] font-mono text-slate-400">{bed.patient_hospital_id || '—'}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-indigo-600 leading-none">{d}</p>
                <p className="text-[9px] text-slate-400">day{d !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Admit date + rate */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Admitted</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{formatDate(bed.admission_date || '')}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Daily Rate</p>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">₹{parseInt(bed.daily_rate || '0').toLocaleString()}</p>
              </div>
            </div>

            {/* Dept */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                <Building2 className="h-3 w-3 text-slate-400" />
              </div>
              <p className="text-xs text-slate-500 truncate">{bed.department_name}</p>
            </div>

            {/* Features */}
            {bed.features.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bed.features.slice(0, 3).map(f => (
                  <span key={f} className="text-[9px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-md font-semibold capitalize">{f}</span>
                ))}
                {bed.features.length > 3 && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold">+{bed.features.length - 3}</span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100 mt-auto">
              <button onClick={onTransfer}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-xl border border-violet-200 transition-all">
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transfer
              </button>
              <button onClick={onEdit}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-all">
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
          </div>
        ) : isMaintenance ? (
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex flex-col items-center justify-center py-6 bg-amber-50 rounded-xl border border-amber-100">
              <WrenchIcon className="h-8 w-8 text-amber-400 mb-2" />
              <p className="text-sm font-bold text-amber-700">Under Maintenance</p>
              <p className="text-xs text-amber-500 mt-0.5">Not available for allocation</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2">
              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Daily Rate</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">₹{parseInt(bed.daily_rate || '0').toLocaleString()}</p>
            </div>
            <button onClick={onEdit}
              className="flex items-center justify-center gap-1.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-200 transition-all mt-auto">
              <Edit className="h-3.5 w-3.5" /> Edit Status
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 flex-1">
            {/* Available */}
            <div className="flex flex-col items-center justify-center py-5 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-2 shadow-sm">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-sm font-bold text-emerald-700">Ready for Admission</p>
              <p className="text-xs text-emerald-500 mt-0.5">Cleaned · Sanitized</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Daily Rate</p>
                <p className="text-xs font-bold text-indigo-600 mt-0.5">₹{parseInt(bed.daily_rate || '0').toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-3 py-2">
                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Department</p>
                <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">{bed.department_name}</p>
              </div>
            </div>

            {bed.features.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {bed.features.slice(0, 3).map(f => (
                  <span key={f} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-semibold capitalize">{f}</span>
                ))}
              </div>
            )}

            <button onClick={onEdit}
              className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm mt-auto">
              <UserPlus className="h-3.5 w-3.5" /> Assign / Edit
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
