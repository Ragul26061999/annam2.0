'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, User, Building, Stethoscope,
  Bed,
  Loader2, AlertCircle, X, Hash, Phone,
  Plus, Check,
  Calendar, Clock, BedDouble, Layers, Filter,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAllDoctorsSimple, type Doctor } from '../lib/doctorService';
import {
  getAvailableBeds, allocateBed, getAllBeds,
  type Bed as BedType, getNextIPNumber,
} from '../lib/bedAllocationService';
import { updatePatientAdmissionStatus } from '../lib/patientService';
import StaffSelect from './StaffSelect';

interface InpatientAdmissionFormProps {
  onComplete: (result: { uhid: string; patientName: string; qrCode?: string }) => void;
  onCancel: () => void;
  initialPatientId?: string;
}

// ─── Floor Room Bed Picker Modal ──────────────────────────────────────────────
function BedPickerModal({
  onSelect,
  onClose,
  selectedBedId,
}: {
  onSelect: (bed: BedType) => void;
  onClose: () => void;
  selectedBedId: string;
}) {
  const [allBeds, setAllBeds]         = useState<BedType[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [filterType, setFilterType]   = useState<string>('all');

  useEffect(() => {
    getAllBeds({})
      .then(res => {
        const beds: BedType[] = (res as any).beds ?? res ?? [];
        setAllBeds(beds);
        const floors = [...new Set(beds.map(b => b.floor_number ?? 0))].sort((a,b)=>a-b);
        if (floors.length) setActiveFloor(floors[0]);
      })
      .catch(() => {
        // fallback: try getAvailableBeds
        getAvailableBeds().then(beds => {
          setAllBeds(beds);
          const floors = [...new Set(beds.map(b => b.floor_number ?? 0))].sort((a,b)=>a-b);
          if (floors.length) setActiveFloor(floors[0]);
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const floors = [...new Set(allBeds.map(b => b.floor_number ?? 0))].sort((a,b)=>a-b);
  const bedTypes = ['all', ...new Set(allBeds.map(b => b.bed_type).filter(Boolean))];

  const floorBeds = allBeds.filter(b => {
    const floorMatch = (b.floor_number ?? 0) === activeFloor;
    const typeMatch  = filterType === 'all' || b.bed_type === filterType;
    return floorMatch && typeMatch;
  });

  // Group by room
  const byRoom: Record<string, BedType[]> = {};
  floorBeds.forEach(b => {
    const r = b.room_number || 'General';
    if (!byRoom[r]) byRoom[r] = [];
    byRoom[r].push(b);
  });
  const rooms = Object.keys(byRoom).sort();

  const statusColor = (s: string) => {
    if (s === 'available') return 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer';
    if (s === 'occupied')  return 'bg-red-50 border-red-300 text-red-700 cursor-not-allowed opacity-80';
    if (s === 'maintenance') return 'bg-amber-50 border-amber-300 text-amber-700 cursor-not-allowed opacity-80';
    return 'bg-slate-50 border-slate-300 text-slate-600 cursor-not-allowed opacity-80';
  };

  const statusLabel = (s: string) => {
    if (s === 'available')   return '✓ Available';
    if (s === 'occupied')    return '✗ Occupied';
    if (s === 'maintenance') return '⚠ Maintenance';
    return s;
  };

  const floorStats = (floor: number) => {
    const bs = allBeds.filter(b => (b.floor_number ?? 0) === floor);
    const avail = bs.filter(b => b.status === 'available').length;
    return { total: bs.length, avail };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <BedDouble size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Select Room &amp; Bed</h2>
              <p className="text-blue-100 text-xs">Click an available bed to assign</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Legend + filter bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0 gap-4">
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block"/> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400 inline-block"/>  Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400 inline-block"/> Maintenance</span>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} className="text-slate-400" />
            <span className="text-xs text-slate-500">Type:</span>
            {bedTypes.map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all capitalize
                  ${filterType === t ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Floor sidebar */}
          <div className="w-36 flex-shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto">
            <div className="p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Layers size={11}/> Floors
              </p>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-400 mx-auto mt-4" />
              ) : floors.map(floor => {
                const { total, avail } = floorStats(floor);
                return (
                  <button key={floor} onClick={() => setActiveFloor(floor)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all
                      ${activeFloor === floor
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'hover:bg-slate-200 text-slate-700'}`}>
                    <div className="font-bold text-sm">{floor === 0 ? 'Ground' : `Floor ${floor}`}</div>
                    <div className={`text-[10px] mt-0.5 ${activeFloor === floor ? 'text-blue-100' : 'text-slate-500'}`}>
                      {avail}/{total} available
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Room grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <BedDouble size={40} className="mb-2 opacity-30" />
                <p className="text-sm">No beds found for this floor</p>
              </div>
            ) : (
              <div className="space-y-5">
                {rooms.map(room => (
                  <div key={room}>
                    {/* Room header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                        <Building size={12} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">Room {room}</span>
                      </div>
                      <div className="flex-1 h-px bg-slate-200"/>
                      <span className="text-[10px] text-slate-400">
                        {byRoom[room].filter(b => b.status === 'available').length} of {byRoom[room].length} free
                      </span>
                    </div>
                    {/* Bed cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {byRoom[room].map(bed => {
                        const isSelected = bed.id === selectedBedId;
                        const isAvail    = bed.status === 'available';
                        return (
                          <button
                            key={bed.id}
                            type="button"
                            disabled={!isAvail}
                            onClick={() => isAvail && onSelect(bed)}
                            className={`
                              relative flex flex-col items-center justify-center p-3 rounded-xl border-2
                              transition-all duration-150 text-center
                              ${statusColor(bed.status)}
                              ${isSelected ? '!border-blue-600 !bg-blue-50 ring-2 ring-blue-400 ring-offset-1' : ''}
                            `}
                          >
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check size={10} className="text-white" />
                              </span>
                            )}
                            <BedDouble size={22} className={`mb-1 ${
                              bed.status === 'available' ? 'text-emerald-500' :
                              bed.status === 'occupied'  ? 'text-red-400' : 'text-amber-500'
                            }`} />
                            <span className="font-bold text-xs leading-tight">{bed.bed_number}</span>
                            {bed.bed_type && (
                              <span className="text-[9px] mt-0.5 opacity-70 capitalize">{bed.bed_type}</span>
                            )}
                            <span className={`text-[9px] mt-1 font-semibold px-1.5 py-0.5 rounded-full ${
                              bed.status === 'available' ? 'bg-emerald-200 text-emerald-800' :
                              bed.status === 'occupied'  ? 'bg-red-200 text-red-700' :
                              'bg-amber-200 text-amber-700'
                            }`}>
                              {statusLabel(bed.status)}
                            </span>
                            {bed.daily_rate && (
                              <span className="text-[9px] mt-0.5 text-slate-500">₹{bed.daily_rate}/day</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <p className="text-xs text-slate-500">
            {selectedBedId
              ? `Selected: ${allBeds.find(b => b.id === selectedBedId)?.bed_number || '—'} · ${allBeds.find(b => b.id === selectedBedId)?.bed_type || ''}`
              : 'No bed selected — you can also assign later'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => onSelect({ id: '', bed_number: '', room_number: '', bed_type: '', status: 'available' })}
              className="px-4 py-1.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-medium">
              Skip for Now
            </button>
            <button onClick={onClose}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function InpatientAdmissionForm({ onComplete, onCancel, initialPatientId }: InpatientAdmissionFormProps) {
  const [loading,    setLoading]    = useState(false);
  const [searching,  setSearching]  = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patients,   setPatients]   = useState<any[]>([]);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const [selectedPatient, setSelectedPatient] = useState<any|null>(null);
  const [doctors,    setDoctors]    = useState<Doctor[]>([]);
  const [message,    setMessage]    = useState<{type:'success'|'error', text:string}|null>(null);
  const [showBedPicker, setShowBedPicker] = useState(false);
  const [selectedBed, setSelectedBed]     = useState<BedType|null>(null);
  const [admissionCategories, setAdmissionCategories] = useState<string[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const selectRoomBtnRef  = React.useRef<HTMLButtonElement>(null);
  const departmentSelRef  = React.useRef<HTMLSelectElement>(null);

  const [formData, setFormData] = useState({
    department:             '',
    attendingDoctorIds:     [] as string[],
    reasonForAdmission:     '',
    selectedBedId:          '',
    admissionDate:          new Date().toISOString().split('T')[0],
    admissionTime:          new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    staffId:                '',
    admissionCategory:      '',
    ipNumber:               '',
    registrationType:       'admission' as 'admission' | 'observation',
  });
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);

  const set = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));
  const toggleDoctor = (id: string) => setFormData(p => ({ ...p, attendingDoctorIds: p.attendingDoctorIds.includes(id) ? p.attendingDoctorIds.filter(x => x !== id) : [...p.attendingDoctorIds, id] }));

  const updatePatientField = (key: string, val: any) => {
    if (!selectedPatient) return;
    setSelectedPatient((p: any) => p ? ({ ...p, [key]: val }) : null);
  };

  useEffect(() => {
    loadInitialData();
    if (initialPatientId) fetchAndSelectPatient(initialPatientId);
  }, []);

  const fetchAndSelectPatient = async (id: string) => {
    try {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
      if (!error && data) selectPatient(data);
    } catch {}
  };

  const loadInitialData = async () => {
    try {
      const [docs, ipNum] = await Promise.all([getAllDoctorsSimple(), getNextIPNumber()]);
      setDoctors(docs);
      setFormData(p => ({ ...p, ipNumber: ipNum }));
    } catch {}
    fetchAdmissionCategories();
  };

  const fetchAdmissionCategories = async () => {
    try {
      const { data } = await supabase.from('admission_categories').select('name').eq('status', 'active').order('name');
      setAdmissionCategories((data || []).map((c: any) => c.name));
    } catch {}
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const { error } = await supabase.from('admission_categories').insert([{ name: newCategory.trim() }]);
      if (error) throw error;
      setAdmissionCategories(p => [...p, newCategory.trim()].sort());
      set('admissionCategory', newCategory.trim());
      setNewCategory('');
      setIsAddingCategory(false);
    } catch {
      setMessage({ type: 'error', text: 'Failed to add category' });
    }
  };

  const handlePatientSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 3) { setPatients([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.from('patients').select('*')
        .or(`patient_id.ilike.%${term}%,phone.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(5);
      if (error) throw error;
      setPatients(data || []);
    } catch {} finally { setSearching(false); }
  };

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setSearchTerm(patient.name);
    setPatients([]);
    setHighlightedIdx(-1);
    // Auto-focus Select Room button after patient selected
    setTimeout(() => selectRoomBtnRef.current?.focus(), 50);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onCancel(); return; }
    if (!patients.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx(i => (i < patients.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx(i => (i > 0 ? i - 1 : patients.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && patients[highlightedIdx]) {
        selectPatient(patients[highlightedIdx]);
      }
    }
  };

  const departments = [
    'General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics',
    'Neurology', 'Gastroenterology', 'Oncology', 'Gynecology', 'Surgery',
  ];

  const handleBedSelect = (bed: BedType) => {
    if (!bed.id) {
      setSelectedBed(null);
      setFormData(p => ({ ...p, selectedBedId: '' }));
    } else {
      setSelectedBed(bed);
      setFormData(p => ({ ...p, selectedBedId: bed.id }));
    }
    setShowBedPicker(false);
    // Auto-focus Department dropdown after bed selected
    setTimeout(() => departmentSelRef.current?.focus(), 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) { setMessage({ type: 'error', text: 'Please select a patient' }); return; }
    if (!formData.selectedBedId) { setMessage({ type: 'error', text: 'Please assign a bed' }); return; }
    setLoading(true); setMessage(null);
    try {
      console.log('Starting IP admission for patient:', selectedPatient.id, selectedPatient.patient_id);
      
      if (formData.selectedBedId) {
        console.log('Allocating bed:', formData.selectedBedId);
        const allocation = await allocateBed({
          patientId:        selectedPatient.id,
          bedId:            formData.selectedBedId,
          doctorId:         formData.attendingDoctorIds[0],
          admissionDate:    formData.admissionDate,
          admissionType:    'inpatient',
          reason:           formData.reasonForAdmission,
          staffId:          formData.staffId,
          admissionCategory: formData.admissionCategory,
          ipNumber:         formData.ipNumber,
          registrationType: formData.registrationType,
          admissionTime:    formData.admissionTime,
        });
        console.log('Bed allocation created:', allocation?.id);
      }

      console.log('Updating patient admission status...');
      await updatePatientAdmissionStatus(selectedPatient.patient_id, true, 'inpatient', {
        department_ward:        formData.department,
        diagnosis:              selectedPatient.diagnosis || '',
        primary_complaint:      formData.reasonForAdmission,
        admission_date:         formData.admissionDate,
        admission_category:     formData.admissionCategory,
      });
      console.log('Patient status updated successfully');

      // Show success message before navigating
      setMessage({ type: 'success', text: 'IP Admission created successfully! Redirecting...' });
      
      // Small delay to show success message
      setTimeout(() => {
        onComplete({ uhid: selectedPatient.patient_id, patientName: selectedPatient.name, qrCode: selectedPatient.qr_code });
      }, 1000);
    } catch (error: any) {
      console.error('IP Admission error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create admission' });
    } finally { setLoading(false); }
  };

  // ── shared classes ──
  const inp  = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400 transition-all';
  const lbl  = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen bg-slate-100 overflow-hidden font-sans"
      onKeyDown={e => { if (e.key === 'Escape' && !showBedPicker) onCancel(); }}
      tabIndex={-1}
    >

      {/* ════ Thin nav sidebar ════ */}
      <aside className="w-12 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-3 gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-2">
          <Bed size={15} className="text-white" />
        </div>
        {[
          { href: '/inpatient',         icon: <Bed size={16}/>,          tip: 'Inpatient List' },
          { href: '/outpatient',         icon: <User size={16}/>,         tip: 'Outpatient' },
          { href: '/dashboard',          icon: <Building size={16}/>,      tip: 'Dashboard' },
        ].map(item => (
          <a key={item.href} href={item.href} title={item.tip}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
            {item.icon}
          </a>
        ))}
        <div className="flex-1"/>
        <button onClick={onCancel} title="Cancel / Go back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
          <X size={16}/>
        </button>
      </aside>

      {/* ════ Main area ════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Bed size={16} className="text-white"/>
              </div>
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">IP Registration</h1>
                <p className="text-blue-100 text-[11px]">New InPatient Entry</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-blue-100">
              <span className="bg-white/20 px-3 py-1 rounded-full font-bold text-white text-sm font-mono">
                {formData.ipNumber || '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12}/>
                <strong className="text-white">{new Date(formData.admissionDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12}/>
                <strong className="text-white">
                  {(() => {
                    const time = formData.admissionTime || '00:00';
                    const parts = time.split(':');
                    const h = parseInt(parts[0]) || 0;
                    const m = parts[1] || '00';
                    const period = h >= 12 ? 'PM' : 'AM';
                    const h12 = h % 12 || 12;
                    return `${h12}:${m} ${period}`;
                  })()}
                </strong>
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4 space-y-3 max-w-screen-2xl mx-auto">

            {message && (
              <div className={`flex items-center gap-3 text-xs px-4 py-2.5 rounded-xl border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'}`}>
                <AlertCircle size={14}/>
                {message.text}
              </div>
            )}

            {/* ══ SECTION 1: IP Registration Details ══ */}
            <SCard 
              icon={<User size={14}/>} 
              title="IP Registration Details" 
              accent="blue"
              rightElement={
                <div className="flex items-center gap-5 mr-4 bg-white/50 px-3 py-1 rounded-lg border border-slate-200 shadow-sm">
                  {['admission', 'observation'].map(type => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="registrationType" 
                        checked={formData.registrationType === type}
                        onChange={() => set('registrationType', type)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className={`text-[11px] font-black uppercase tracking-widest transition-colors duration-200 
                        ${formData.registrationType === type ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              }
            >
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-3 mb-3">
                {/* IP Reg No — compact */}
                <div className="col-span-1">
                  <label className={lbl}>IP No</label>
                  <input type="text" value={formData.ipNumber} readOnly
                    className={`${inp} bg-blue-50 border-blue-200 text-blue-800 font-mono font-bold cursor-default text-xs px-2`}/>
                </div>

                {/* Admission Date — compact */}
                <div className="col-span-1">
                  <label className={lbl}>Date</label>
                  <input type="date" value={formData.admissionDate}
                    onChange={e => set('admissionDate', e.target.value)} className={`${inp} text-xs px-2`}/>
                </div>

                {/* Admission Time — slightly wider */}
                <div className="col-span-3">
                  <label className={lbl}>Admission Time (12h)</label>
                  <div className="flex items-center gap-1">
                    {/* Hour */}
                    <select 
                      value={(() => {
                        const h = parseInt(formData.admissionTime.split(':')[0]) || 0;
                        return (h % 12 || 12).toString().padStart(2, '0');
                      })()}
                      onChange={(e) => {
                        const h12 = parseInt(e.target.value);
                        const m = formData.admissionTime.split(':')[1] || '00';
                        const p = (parseInt(formData.admissionTime.split(':')[0]) || 0) >= 12 ? 'PM' : 'AM';
                        let h24 = h12 % 12;
                        if (p === 'PM') h24 += 12;
                        set('admissionTime', `${h24.toString().padStart(2, '0')}:${m}`);
                      }}
                      className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    
                    <span className="text-slate-400 font-bold">:</span>

                    {/* Minute */}
                    <select 
                      value={formData.admissionTime.split(':')[1] || '00'}
                      onChange={(e) => {
                        const h24 = formData.admissionTime.split(':')[0] || '00';
                        set('admissionTime', `${h24}:${e.target.value}`);
                      }}
                      className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    {/* AM/PM */}
                    <button
                      type="button"
                      onClick={() => {
                        const parts = formData.admissionTime.split(':');
                        let h = parseInt(parts[0]) || 0;
                        const m = parts[1] || '00';
                        if (h >= 12) h -= 12; else h += 12;
                        set('admissionTime', `${h.toString().padStart(2, '0')}:${m}`);
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all
                        ${(parseInt(formData.admissionTime.split(':')[0]) || 0) >= 12 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100'}`}
                    >
                      {(parseInt(formData.admissionTime.split(':')[0]) || 0) >= 12 ? 'PM' : 'AM'}
                    </button>
                  </div>
                </div>

                {/* Patient Search — takes remaining space */}
                <div className="col-span-7 relative">
                  <label className={lbl}>Patient Search (UHID / Mobile / Name) <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4"/>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => { handlePatientSearch(e.target.value); setHighlightedIdx(-1); }}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Type UHID, phone, or name… (↑↓ to navigate, Enter to select)"
                      className={`${inp} pl-9`}
                      autoComplete="off"
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-500"/>}
                  </div>
                  {patients.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                      style={{ zIndex: 99999, position: 'absolute' }}>
                      {patients.map((p, idx) => (
                        <button key={p.id} type="button"
                          onMouseDown={e => { e.preventDefault(); selectPatient(p); }}
                          onMouseEnter={() => setHighlightedIdx(idx)}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between border-b last:border-0 border-slate-100 transition-colors
                            ${idx === highlightedIdx ? 'bg-blue-50' : 'hover:bg-blue-50'}`}>
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{p.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Hash size={10}/>{p.patient_id} · <Phone size={10}/>{p.phone}
                              {p.age && ` · ${p.age} yrs`}
                            </p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            p.is_admitted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {p.is_admitted ? 'ADMITTED' : p.admission_type?.toUpperCase() || 'OUTPATIENT'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: patient info + gender + select room */}
              {selectedPatient ? (
                <div className="grid grid-cols-12 gap-3 items-start">
                  {/* Patient details card */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-blue-900 text-sm truncate">{selectedPatient.name}</p>
                        <p className="text-xs text-blue-700 truncate">
                          {selectedPatient.patient_id} · {selectedPatient.gender} · {selectedPatient.age} yrs
                        </p>
                        {selectedPatient.phone && (
                          <p className="text-xs text-blue-600">{selectedPatient.phone}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => { setSelectedPatient(null); setSearchTerm(''); }}
                        className="text-xs text-red-500 hover:text-red-700 font-semibold flex-shrink-0">
                        Change
                      </button>
                    </div>
                  </div>

                  {/* OP Reg No */}
                  <div className="col-span-2">
                    <label className={lbl}>OP Reg No</label>
                    <input type="text" value={selectedPatient.patient_id} readOnly
                      className={`${inp} bg-slate-50 text-slate-500 cursor-default`}/>
                  </div>

                  {/* Age */}
                  <div className="col-span-1">
                    <label className={lbl}>Age</label>
                    <input type="number" value={selectedPatient.age || ''} 
                      onChange={e => updatePatientField('age', parseInt(e.target.value))}
                      className={`${inp} bg-white shadow-sm font-bold text-slate-800`}/>
                  </div>

                  {/* Gender radios */}
                  <div className="col-span-2">
                    <label className={lbl}>Gender</label>
                    <div className="flex items-center gap-4 py-2">
                      {['Male','Female','Other'].map(g => (
                        <label key={g} className="flex items-center gap-1.5 text-xs cursor-pointer text-slate-600 group">
                          <input 
                            type="radio" 
                            name="patientGender"
                            checked={selectedPatient.gender?.toLowerCase() === g.toLowerCase()} 
                            onChange={() => updatePatientField('gender', g)}
                            className="accent-blue-600 w-3.5 h-3.5"
                          />
                          <span className="group-hover:text-blue-600 transition-colors font-semibold">{g}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Select Room button + display */}
                  <div className="col-span-2">
                    <label className={lbl}>Room / Bed</label>
                    <button ref={selectRoomBtnRef} type="button" onClick={() => setShowBedPicker(true)}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:outline-none">
                      <BedDouble size={15}/>
                      {selectedBed ? `${selectedBed.room_number} / ${selectedBed.bed_number}` : 'Select Room'}
                    </button>
                    {selectedBed && (
                      <p className="text-[10px] text-blue-600 mt-1 text-center">
                        {selectedBed.bed_type} · Floor {selectedBed.floor_number ?? 0}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12">
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-400 text-xs">
                      <User size={14}/> Search and select a patient above to continue
                    </div>
                  </div>
                </div>
              )}
            </SCard>

            {/* ══ SECTION 2: Address Details (from patient, read-only) ══ */}
            {selectedPatient && (
              <SCard icon={<Building size={14}/>} title="Address Details" accent="slate">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-4">
                    <label className={lbl}>Address</label>
                    <textarea 
                      rows={2} 
                      value={selectedPatient.address || ''}
                      onChange={e => updatePatientField('address', e.target.value)}
                      className={`${inp} bg-white shadow-sm resize-none text-slate-700 font-semibold`}
                      placeholder="Street address..."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>City</label>
                    <input 
                      value={selectedPatient.city || ''} 
                      onChange={e => updatePatientField('city', e.target.value)}
                      className={`${inp} bg-white shadow-sm text-slate-700 font-semibold`}
                      placeholder="City"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>State</label>
                    <input 
                      value={selectedPatient.state || ''} 
                      onChange={e => updatePatientField('state', e.target.value)}
                      className={`${inp} bg-white shadow-sm text-slate-700 font-semibold`}
                      placeholder="State"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className={lbl}>Pincode</label>
                    <input 
                      value={selectedPatient.pincode || ''} 
                      onChange={e => updatePatientField('pincode', e.target.value)}
                      className={`${inp} bg-white shadow-sm text-slate-700 font-semibold`}
                      placeholder="Pin"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Phone</label>
                    <input 
                      value={selectedPatient.phone || ''} 
                      onChange={e => updatePatientField('phone', e.target.value)}
                      className={`${inp} bg-white shadow-sm text-slate-700 font-semibold`}
                      placeholder="Phone"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className={lbl}>Place</label>
                    <input 
                      value={selectedPatient.place || ''} 
                      onChange={e => updatePatientField('place', e.target.value)}
                      className={`${inp} bg-white shadow-sm text-slate-700 font-semibold`}
                      placeholder="Place"
                    />
                  </div>
                </div>
              </SCard>
            )}

            {/* ══ SECTION 3: Clinical + Ward + Doctor ══ */}
            <SCard icon={<Stethoscope size={14}/>} title="Clinical & Ward Details" accent="blue">
              <div className="grid grid-cols-12 gap-3">
                {/* Department */}
                <div className="col-span-3">
                  <label className={lbl}>Department / Ward</label>
                  <select ref={departmentSelRef} value={formData.department} onChange={e => set('department', e.target.value)} className={inp}>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Attending Doctors (multi-select) */}
                <div className="col-span-3">
                  <label className={lbl}>Attending Doctor(s)</label>
                  <div className="relative">
                    <button type="button" onClick={() => setShowDoctorDropdown(v => !v)}
                      className={`${inp} text-left flex items-center justify-between`}>
                      <span className={formData.attendingDoctorIds.length === 0 ? 'text-slate-400' : 'text-slate-800'}>
                        {formData.attendingDoctorIds.length === 0 ? 'Select doctors…' : `${formData.attendingDoctorIds.length} doctor${formData.attendingDoctorIds.length > 1 ? 's' : ''} selected`}
                      </span>
                      <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    </button>
                    {showDoctorDropdown && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        {doctors.map(doc => (
                          <label key={doc.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                            <input type="checkbox" checked={formData.attendingDoctorIds.includes(doc.id)}
                              onChange={() => toggleDoctor(doc.id)}
                              className="w-3.5 h-3.5 rounded accent-indigo-600" />
                            <span className="text-xs text-slate-700">Dr. {doc.user?.name} {doc.qualification} — {doc.specialization}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admission Category */}
                <div className="col-span-3">
                  <label className={`${lbl} flex items-center justify-between`}>
                    <span>Admission Category</span>
                    {!isAddingCategory
                      ? <button type="button" onClick={() => setIsAddingCategory(true)} className="text-blue-500 hover:text-blue-700 font-medium normal-case text-[10px] flex items-center gap-0.5"><Plus size={11}/> Add</button>
                      : <button type="button" onClick={() => setIsAddingCategory(false)} className="text-slate-400 hover:text-slate-600 normal-case text-[10px]">Cancel</button>
                    }
                  </label>
                  {!isAddingCategory ? (
                    <select value={formData.admissionCategory} onChange={e => set('admissionCategory', e.target.value)} className={inp}>
                      <option value="">Select Category</option>
                      {admissionCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <div className="flex gap-1.5">
                      <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                        placeholder="New category…" className={`${inp} flex-1`} autoFocus
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}/>
                      <button type="button" onClick={handleAddCategory}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <Check size={15}/>
                      </button>
                    </div>
                  )}
                </div>

                {/* Staff */}
                <div className="col-span-3">
                  <StaffSelect value={formData.staffId} onChange={v => set('staffId', v)} label="Admitted By"/>
                </div>

                {/* Reason for Admission */}
                <div className="col-span-12">
                  <label className={lbl}>Reason for Admission</label>
                  <textarea rows={2} value={formData.reasonForAdmission}
                    onChange={e => set('reasonForAdmission', e.target.value)}
                    placeholder="Main reason for recommending admission…"
                    className={`${inp} resize-none`}/>
                </div>
              </div>
            </SCard>

            {/* ── Selected Doctors Display ── */}
            {formData.attendingDoctorIds.length > 0 && (
              <div className="bg-white border border-indigo-100 rounded-xl px-5 py-3 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                    <Stethoscope size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Attending Doctor(s)</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {formData.attendingDoctorIds.map(id => {
                        const doc = doctors.find(d => d.id === id);
                        return (
                          <span key={id} className="bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-bold text-indigo-700 border border-indigo-100 flex items-center gap-1.5">
                            <Check size={12} className="text-indigo-500" />
                             Dr. {doc?.user?.name || 'Unknown'} {doc?.qualification || ''}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ══ SECTION: Bed Assignment ══ */}
            <SCard 
              icon={<BedDouble size={14}/>} 
              title="Bed Assignment" 
              accent="green"
              rightElement={
                selectedBed ? (
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    <Check size={12}/> Bed Selected
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    <AlertCircle size={12}/> No Bed Assigned
                  </span>
                )
              }
            >
              <div className="flex items-center gap-4">
                {/* Bed Info Display */}
                <div className="flex-1">
                  {selectedBed ? (
                    <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-white rounded-xl border border-emerald-200">
                      <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
                        <BedDouble size={24} className="text-white"/>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-lg font-bold text-slate-800">Room {selectedBed.room_number}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-lg font-bold text-slate-800">Bed {selectedBed.bed_number}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            selectedBed.bed_type?.toLowerCase() === 'icu' ? 'bg-red-100 text-red-700' :
                            selectedBed.bed_type?.toLowerCase() === 'private' ? 'bg-violet-100 text-violet-700' :
                            selectedBed.bed_type?.toLowerCase() === 'semi' ? 'bg-sky-100 text-sky-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {selectedBed.bed_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Building size={12}/> Floor {selectedBed.floor_number ?? 0}
                          </span>
                          {selectedBed.daily_rate && (
                            <span className="flex items-center gap-1">
                              <span className="font-bold text-emerald-600">₹{selectedBed.daily_rate}</span> / day
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <Check size={12}/> Available
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                      <div className="w-14 h-14 bg-slate-200 rounded-xl flex items-center justify-center">
                        <BedDouble size={24} className="text-slate-400"/>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-600">No bed assigned yet</p>
                        <p className="text-xs text-slate-400 mt-0.5">Click the button to view available beds and assign one</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Assign/Change Bed Button */}
                <button 
                  type="button" 
                  onClick={() => setShowBedPicker(true)}
                  className={`flex flex-col items-center justify-center gap-1 px-6 py-4 rounded-xl font-bold text-sm transition-all shadow-md focus:ring-2 focus:ring-offset-1 focus:outline-none min-w-[140px]
                    ${selectedBed 
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-200 focus:ring-emerald-400' 
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-blue-200 focus:ring-blue-400 animate-pulse'
                    }`}
                >
                  <BedDouble size={20}/>
                  <span>{selectedBed ? 'Change Bed' : 'Assign Bed'}</span>
                </button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-400"></span>
                    <span className="text-slate-600">Available</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-red-400"></span>
                    <span className="text-slate-600">Occupied</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-400"></span>
                    <span className="text-slate-600">Maintenance</span>
                  </span>
                </div>
              </div>
            </SCard>

            {/* ── Action bar ── */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
              <span className="text-[11px] text-slate-400">
                <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono text-[10px]">Esc</kbd>
                {' '}or click ✕ in sidebar to cancel
              </span>
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-300 disabled:to-slate-400 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-200 disabled:shadow-none">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin"/><span>Admitting…</span></>
                  : <><Bed className="h-4 w-4"/><span>Create IP Admission</span></>
                }
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Bed Picker Modal */}
      {showBedPicker && (
        <BedPickerModal
          onSelect={handleBedSelect}
          onClose={() => setShowBedPicker(false)}
          selectedBedId={formData.selectedBedId}
        />
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SCard({ icon, title, accent = 'blue', children, rightElement }: {
  icon: React.ReactNode;
  title: string;
  accent?: 'blue' | 'green' | 'slate';
  children: React.ReactNode;
  rightElement?: React.ReactNode;
}) {
  const colors = {
    blue:  'text-blue-500',
    green: 'text-emerald-500',
    slate: 'text-slate-500',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className={colors[accent]}>{icon}</span>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</span>
        </div>
        {rightElement}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
