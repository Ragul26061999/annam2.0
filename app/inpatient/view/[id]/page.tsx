'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, BedDouble, Stethoscope, Calendar, Clock,
  User, Phone, MapPin, Activity, AlertTriangle, FileText,
  Receipt, LogOut, ClipboardList, Loader2, Building2,
  Hash, CreditCard, ChevronRight, HeartPulse, Shield,
  X, Pill, Eye, Plus, RefreshCw, FlaskConical, Search,
  ChevronDown, Microscope, Radiation, ScanLine, CheckSquare,
  Square, Zap, Filter, Pencil, Check, Bed
} from 'lucide-react';
import { getBedAllocationById, type BedAllocation, getAvailableBeds } from '../../../../src/lib/bedAllocationService';
import IPClinicalRecords from '../../../../src/components/ip-clinical/IPClinicalRecords';
import IPPrescriptionForm from '../../../../src/components/ip-clinical/IPPrescriptionForm';
import { supabase } from '../../../../src/lib/supabase';
import {
  getLabTestCatalog, getRadiologyTestCatalog, createGroupedLabOrder,
  type LabTestCatalog, type RadiologyTestCatalog, type GroupedLabOrder
} from '../../../../src/lib/labXrayService';

type Tab = 'overview' | 'clinical' | 'medications' | 'lab' | 'billing';

export default function IPDetailPage() {
  const params = useParams();
  const router = useRouter();
  const allocationId = (params?.id as string) ?? '';

  const [allocation, setAllocation] = useState<BedAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDoctorId, setCurrentDoctorId] = useState<string | null>(null);
  const [showPrescribeForm, setShowPrescribeForm] = useState(false);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  // Lab / Scan / X-Ray tab state
  const [labOrders, setLabOrders] = useState<GroupedLabOrder[]>([]);
  const [loadingLabOrders, setLoadingLabOrders] = useState(false);
  const [labCatalog, setLabCatalog] = useState<LabTestCatalog[]>([]);
  const [radiologyCatalog, setRadiologyCatalog] = useState<RadiologyTestCatalog[]>([]);
  const [showLabForm, setShowLabForm] = useState(false);
  const [labSubTab, setLabSubTab] = useState<'lab' | 'radiology'>('lab');
  const [labSearch, setLabSearch] = useState('');
  const [selectedTests, setSelectedTests] = useState<{ id: string; name: string; type: 'lab' | 'radiology'; cost: number }[]>([]);
  const [labIndication, setLabIndication] = useState('');
  const [labUrgency, setLabUrgency] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [submittingLab, setSubmittingLab] = useState(false);
  const [labToast, setLabToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Edit mode states
  const [editSection, setEditSection] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  
  // Edit form states
  const [editPatientData, setEditPatientData] = useState({
    name: '',
    phone: '',
    address: '',
    diagnosis: '',
    age: '',
    gender: ''
  });
  const [editReason, setEditReason] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editStaffId, setEditStaffId] = useState('');
  const [editBedId, setEditBedId] = useState('');
  
  // Dropdown data
  const [doctors, setDoctors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);

  useEffect(() => {
    if (allocationId) loadData();
    loadCurrentUser();
  }, [allocationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBedAllocationById(allocationId);
      setAllocation(data);
      setError(null);
    } catch (e) {
      setError('Failed to load patient details.');
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users').select('*').eq('auth_id', user.id).maybeSingle();
        
        const userProfile = profile || { id: user.id, name: user.email };
        setCurrentUser(userProfile);

        // Fetch doctor ID for this user if it exists
        if (userProfile?.id) {
          const { data: doctor } = await supabase
            .from('doctors')
            .select('id')
            .eq('user_id', userProfile.id)
            .is('deleted_at', null)
            .maybeSingle();
          
          if (doctor) {
            setCurrentDoctorId(doctor.id);
          }
        }
      }
    } catch (err) {
      console.error('Error loading current user/doctor:', err);
    }
  };

  const loadPrescriptions = async () => {
    if (!allocationId || !allocation?.patient_id) return;
    setLoadingPrescriptions(true);
    try {
      const admissionDate = allocation.admission_date || allocation.created_at;
      const { data: prescriptionData } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_id,
          created_at,
          issue_date,
          status,
          instructions,
          doctor:doctor_id(user:user_id(name)),
          items:prescription_items(
            id,
            medication_id,
            dosage,
            frequency,
            duration,
            instructions,
            quantity,
            unit_price,
            status,
            medication:medication_id(name, dosage_form, strength)
          )
        `)
        .eq('patient_id', allocation.patient_id)
        .gte('created_at', admissionDate)
        .order('created_at', { ascending: false });

      const prescriptionIds = (prescriptionData || []).map((rx: any) => rx.id).filter(Boolean);
      const { data: dispensingData } = prescriptionIds.length > 0
        ? await supabase
            .from('prescription_dispensing')
            .select('id, prescription_id, medication_id, quantity_dispensed, dispensed_by, dispensed_at, status')
            .in('prescription_id', prescriptionIds)
            .order('dispensed_at', { ascending: false })
        : { data: [] };

      const dispenserIds = [...new Set((dispensingData || []).map((row: any) => row.dispensed_by).filter(Boolean))];
      const dispenserResult: { data: any[] | null } = dispenserIds.length > 0
        ? await supabase
            .from('users')
            .select('id, name')
            .in('id', dispenserIds)
        : { data: [] };

      const dispenserNameById = new Map((dispenserResult.data || []).map((user: any) => [user.id, user.name]));
      const dispensingByPrescriptionMedication = new Map<string, any[]>();

      (dispensingData || []).forEach((row: any) => {
        const key = `${row.prescription_id}:${row.medication_id}`;
        const existing = dispensingByPrescriptionMedication.get(key) || [];
        existing.push(row);
        dispensingByPrescriptionMedication.set(key, existing);
      });

      const normalized = (prescriptionData || []).map((rx: any) => {
        const items = (rx.items || []).map((item: any) => {
          const medicationName = item.medication?.name || 'Unknown Medicine';
          const dispensingRows = dispensingByPrescriptionMedication.get(`${rx.id}:${item.medication_id}`) || [];
          const latestDispensing = dispensingRows[0];
          const dispensedQty = dispensingRows.reduce((sum: number, row: any) => sum + (Number(row.quantity_dispensed) || 0), 0);
          const itemStatus = latestDispensing
            ? latestDispensing.status === 'complete'
              ? 'dispensed'
              : latestDispensing.status || 'dispensed'
            : item.status || 'pending';

          return {
            id: item.id,
            medication_id: item.medication_id,
            medication_name: medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
            meal_timing: '',
            status: itemStatus,
            dispensed_at: latestDispensing?.dispensed_at,
            dispensed_by: latestDispensing?.dispensed_by ? String(dispenserNameById.get(latestDispensing.dispensed_by) || 'Unknown Pharmacist') : undefined,
            dispensed_quantity: dispensedQty
          };
        });

        const hasDispensedItems = items.some((item: any) => item.status === 'dispensed' || item.status === 'complete' || item.status === 'partial');
        const allDispensed = items.length > 0 && items.every((item: any) => item.status === 'dispensed' || item.status === 'complete');

        return {
          id: rx.id,
          prescription_id: rx.prescription_id,
          created_at: rx.created_at,
          prescription_date: rx.issue_date || rx.created_at,
          status: allDispensed ? 'dispensed' : hasDispensedItems ? 'partial' : (rx.status || 'active'),
          notes: rx.instructions,
          doctor: {
            name: rx.doctor?.user?.name || 'Unknown'
          },
          items
        };
      });

      setPrescriptions(normalized);
    } catch {
      setPrescriptions([]);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'medications' && allocation?.patient_id) loadPrescriptions();
    if (activeTab === 'lab') { loadLabOrders(); loadCatalogs(); }
  }, [activeTab, allocation?.patient_id, allocation?.admission_date]);

  const loadLabOrders = async () => {
    if (!allocationId) return;
    setLoadingLabOrders(true);
    try {
      const { data } = await supabase
        .from('diagnostic_group_orders')
        .select(`
          id, created_at, urgency, clinical_indication, status,
          group_name_snapshot,
          items:diagnostic_group_order_items(
            id, service_type, item_name_snapshot, status, catalog_id, sort_order
          )
        `)
        .eq('bed_allocation_id', allocationId)
        .order('created_at', { ascending: false });
      setLabOrders((data || []) as any[]);
    } catch {
      setLabOrders([]);
    } finally {
      setLoadingLabOrders(false);
    }
  };

  const loadCatalogs = async () => {
    if (labCatalog.length || radiologyCatalog.length) return;
    const [lab, rad] = await Promise.all([getLabTestCatalog(), getRadiologyTestCatalog()]);
    setLabCatalog(lab);
    setRadiologyCatalog(rad);
  };

  const toggleTest = (id: string, name: string, type: 'lab' | 'radiology', cost: number) => {
    setSelectedTests(prev =>
      prev.find(t => t.id === id)
        ? prev.filter(t => t.id !== id)
        : [...prev, { id, name, type, cost }]
    );
  };

  const handleLabSubmit = async () => {
    if (!selectedTests.length || !labIndication.trim()) return;
    setSubmittingLab(true);
    try {
      await createGroupedLabOrder({
        patient_id: allocation!.patient_id,
        bed_allocation_id: allocationId,
        is_ip: true,
        clinical_indication: labIndication.trim(),
        urgency: labUrgency,
        ordering_doctor_id: currentDoctorId || allocation?.doctor_id || undefined,
        service_items: selectedTests.map((t, i) => ({
          service_type: t.type,
          catalog_id: t.id,
          item_name: t.name,
          sort_order: i
        }))
      });
      setLabToast({ type: 'success', msg: 'Order placed successfully' });
      setShowLabForm(false);
      setSelectedTests([]);
      setLabIndication('');
      setLabUrgency('routine');
      loadLabOrders();
      setTimeout(() => setLabToast(null), 3000);
    } catch (e: any) {
      setLabToast({ type: 'error', msg: e?.message || 'Failed to place order' });
      setTimeout(() => setLabToast(null), 4000);
    } finally {
      setSubmittingLab(false);
    }
  };

  // ── Edit Functions ──
  const loadDropdownData = async (section: string) => {
    try {
      if (section === 'doctor') {
        const { data } = await supabase
          .from('doctors')
          .select('id, license_number, user:user_id(name)')
          .eq('status', 'active');
        setDoctors(data || []);
      } else if (section === 'staff') {
        const { data } = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_id')
          .eq('status', 'active');
        setStaffList(data || []);
      } else if (section === 'bed') {
        const beds = await getAvailableBeds();
        // Include current bed in the list
        if (allocation?.bed_id && allocation?.bed) {
          const currentBedInList = beds.find((b: any) => b.id === allocation.bed_id);
          if (!currentBedInList) {
            setAvailableBeds([allocation.bed, ...beds]);
          } else {
            setAvailableBeds(beds);
          }
        } else {
          setAvailableBeds(beds);
        }
      }
    } catch (e) {
      console.error('Failed to load dropdown data:', e);
    }
  };

  const startEdit = (section: string) => {
    setEditSection(section);
    if (section === 'patient' && allocation?.patient) {
      setEditPatientData({
        name: allocation.patient.name || '',
        phone: allocation.patient.phone || '',
        address: (allocation.patient as any).address || '',
        diagnosis: allocation.patient.diagnosis || '',
        age: String(allocation.patient.age || ''),
        gender: allocation.patient.gender || ''
      });
    } else if (section === 'reason') {
      setEditReason(allocation?.reason || '');
    } else if (section === 'doctor') {
      setEditDoctorId(allocation?.doctor_id || '');
      loadDropdownData('doctor');
    } else if (section === 'staff') {
      setEditStaffId(allocation?.staff_id || '');
      loadDropdownData('staff');
    } else if (section === 'bed') {
      setEditBedId(allocation?.bed_id || '');
      loadDropdownData('bed');
    }
  };

  const cancelEdit = () => {
    setEditSection(null);
    setEditPatientData({ name: '', phone: '', address: '', diagnosis: '', age: '', gender: '' });
    setEditReason('');
    setEditDoctorId('');
    setEditStaffId('');
    setEditBedId('');
  };

  const saveSection = async (section: string) => {
    if (!allocation) return;
    setSavingSection(section);
    try {
      if (section === 'patient') {
        const { error } = await supabase
          .from('patients')
          .update({
            name: editPatientData.name,
            phone: editPatientData.phone,
            address: editPatientData.address,
            diagnosis: editPatientData.diagnosis,
            age: editPatientData.age ? parseInt(editPatientData.age) : null,
            gender: editPatientData.gender,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocation.patient_id);
        if (error) throw error;
      } else if (section === 'reason') {
        const { error } = await supabase
          .from('bed_allocations')
          .update({
            reason: editReason,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocationId);
        if (error) throw error;
      } else if (section === 'doctor') {
        const { error } = await supabase
          .from('bed_allocations')
          .update({
            doctor_id: editDoctorId,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocationId);
        if (error) throw error;
      } else if (section === 'staff') {
        const { error } = await supabase
          .from('bed_allocations')
          .update({
            staff_id: editStaffId,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocationId);
        if (error) throw error;
      } else if (section === 'bed') {
        // Get current bed and new bed details
        const oldBedId = allocation.bed_id;
        const newBedId = editBedId;
        
        if (oldBedId !== newBedId) {
          // Update bed allocation
          const { error: allocError } = await supabase
            .from('bed_allocations')
            .update({
              bed_id: newBedId,
              updated_at: new Date().toISOString()
            })
            .eq('id', allocationId);
          if (allocError) throw allocError;
          
          // Mark old bed as available
          if (oldBedId) {
            await supabase
              .from('beds')
              .update({ status: 'available', updated_at: new Date().toISOString() })
              .eq('id', oldBedId);
          }
          
          // Mark new bed as occupied
          await supabase
            .from('beds')
            .update({ status: 'occupied', updated_at: new Date().toISOString() })
            .eq('id', newBedId);
        }
      }
      
      // Reload data to show updates
      await loadData();
      setEditSection(null);
    } catch (e: any) {
      alert('Failed to save: ' + e.message);
    } finally {
      setSavingSection(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
      </div>
      <p className="text-sm font-medium text-slate-600">Loading patient details…</p>
    </div>
  );

  if (error || !allocation) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <p className="text-sm text-slate-600">{error || 'Patient not found.'}</p>
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
        <ArrowLeft className="h-4 w-4" /> Go back
      </button>
    </div>
  );

  // ── Derived values ──
  const patient = allocation.patient;
  const bed = allocation.bed;
  const doctorRaw = allocation.doctor?.name;
  const doctorName = (typeof doctorRaw === 'string' ? doctorRaw : (doctorRaw as any)?.name || '').trim() || 'Not assigned';
  const isActive = allocation.status === 'active' || allocation.status === 'allocated';
  const isCritical = patient?.is_critical;
  const name = (patient?.name || '').trim() || 'Unknown';
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  const admitDate = new Date(allocation.admission_date);
  const endDate = allocation.discharge_date ? new Date(allocation.discharge_date) : new Date();
  const totalDays = Math.max(1, Math.ceil(Math.abs(endDate.getTime() - admitDate.getTime()) / 86400000));

  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtDateTime = (d: string | Date) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const statusStyle = isActive
    ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-200'
    : allocation.status === 'discharged'
      ? 'bg-slate-100 text-slate-600 border border-slate-200'
      : 'bg-sky-500/10 text-sky-700 border border-sky-200';

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',     label: 'Overview',          icon: User          },
    { id: 'clinical',     label: 'Clinical Records',  icon: ClipboardList  },
    { id: 'medications',  label: 'Medications',        icon: Pill           },
    { id: 'lab',          label: 'Lab / Scan / X-Ray', icon: FlaskConical   },
    { id: 'billing',      label: 'Billing',            icon: Receipt        },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]">

      {/* ══ HEADER ══ */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/inpatient')}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ${
                isCritical ? 'bg-gradient-to-br from-red-500 to-orange-500'
                  : isActive ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                    : 'bg-gradient-to-br from-slate-400 to-slate-500'
              }`}>{initials}</div>
              <div>
                <span className="text-[15px] font-semibold text-slate-800">{name}</span>
                {allocation.ip_number && (
                  <span className="ml-2 text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{allocation.ip_number}</span>
                )}
              </div>
              {isCritical && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 animate-pulse">
                  <AlertTriangle className="h-2.5 w-2.5" /> Critical
                </span>
              )}
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${statusStyle}`}>
                {allocation.status}
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {isActive && (
              <Link href={`/inpatient/discharge/${allocationId}`}>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-all">
                  <LogOut className="h-3.5 w-3.5" /> Discharge
                </button>
              </Link>
            )}
            <Link href={`/inpatient/billing/${allocationId}`}>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all">
                <Receipt className="h-3.5 w-3.5" /> Billing
              </button>
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 flex gap-0 -mb-px">
          {tabs.map(({ id, label, icon: Icon }) => (
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
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-12 gap-4">

            {/* Left column — Patient + Admission */}
            <div className="col-span-12 lg:col-span-4 space-y-4">

              {/* Patient card */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Color top */}
                <div className={`h-1 ${isCritical ? 'bg-gradient-to-r from-red-400 to-orange-400' : isActive ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-200'}`} />
                <div className="p-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 ${
                      isCritical ? 'bg-gradient-to-br from-red-500 to-orange-500'
                        : isActive ? 'bg-gradient-to-br from-indigo-500 to-violet-600'
                          : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>{initials}</div>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-slate-800 leading-tight">{name}</p>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{patient?.uhid || 'N/A'}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {patient?.gender && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium capitalize">{patient.gender}</span>
                        )}
                        {patient?.age && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{patient.age} yrs</span>
                        )}
                      </div>
                    </div>
                    {/* Edit Patient Button */}
                    {editSection === 'patient' ? (
                      <div className="ml-auto flex items-center gap-1">
                        <button 
                          onClick={() => saveSection('patient')}
                          disabled={savingSection === 'patient'}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
                        >
                          {savingSection === 'patient' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEdit('patient')}
                        className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Patient info fields - Edit Mode */}
                  {editSection === 'patient' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Name</label>
                        <input 
                          type="text" 
                          value={editPatientData.name}
                          onChange={(e) => setEditPatientData({...editPatientData, name: e.target.value})}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Age</label>
                          <input 
                            type="number" 
                            value={editPatientData.age}
                            onChange={(e) => setEditPatientData({...editPatientData, age: e.target.value})}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Gender</label>
                          <select 
                            value={editPatientData.gender}
                            onChange={(e) => setEditPatientData({...editPatientData, gender: e.target.value})}
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                          >
                            <option value="">Select</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Phone</label>
                        <input 
                          type="text" 
                          value={editPatientData.phone}
                          onChange={(e) => setEditPatientData({...editPatientData, phone: e.target.value})}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Address</label>
                        <textarea 
                          value={editPatientData.address}
                          onChange={(e) => setEditPatientData({...editPatientData, address: e.target.value})}
                          rows={2}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Diagnosis</label>
                        <textarea 
                          value={editPatientData.diagnosis}
                          onChange={(e) => setEditPatientData({...editPatientData, diagnosis: e.target.value})}
                          rows={2}
                          className="w-full mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Patient info fields - View Mode */
                    <div className="space-y-3">
                      {patient?.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Phone</p>
                            <p className="text-sm font-medium text-slate-700">{patient.phone}</p>
                          </div>
                        </div>
                      )}
                      {(patient as any)?.address && (
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Address</p>
                            <p className="text-sm text-slate-700 leading-snug">{(patient as any).address}</p>
                          </div>
                        </div>
                      )}
                      {patient?.diagnosis && (
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Activity className="h-3.5 w-3.5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Diagnosis</p>
                            <p className="text-sm text-slate-700 leading-snug">{patient.diagnosis}</p>
                          </div>
                        </div>
                      )}
                      {(patient as any)?.medical_history && (
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Shield className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Medical History</p>
                            <p className="text-sm text-slate-700 leading-snug line-clamp-3">{(patient as any).medical_history}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Attending doctor */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Attending Doctor</p>
                  {editSection === 'doctor' ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => saveSection('doctor')}
                        disabled={savingSection === 'doctor'}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
                      >
                        {savingSection === 'doctor' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit('doctor')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                {editSection === 'doctor' ? (
                  <div className="space-y-2">
                    <select 
                      value={editDoctorId}
                      onChange={(e) => setEditDoctorId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          Dr. {doc.user?.name || 'Unknown'} {doc.license_number ? `(Lic: ${doc.license_number})` : ''}
                        </option>
                      ))}
                    </select>
                    {doctors.length === 0 && (
                      <p className="text-xs text-amber-600">Loading doctors...</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0">
                      <Stethoscope className="h-5 w-5 text-sky-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Dr. {doctorName}</p>
                      {allocation.doctor?.license_number && (
                        <p className="text-xs text-slate-400 mt-0.5">License: {allocation.doctor.license_number}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admitted by staff */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Admitted By</p>
                  {editSection === 'staff' ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => saveSection('staff')}
                        disabled={savingSection === 'staff'}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
                      >
                        {savingSection === 'staff' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit('staff')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                {editSection === 'staff' ? (
                  <div className="space-y-2">
                    <select 
                      value={editStaffId}
                      onChange={(e) => setEditStaffId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                    >
                      <option value="">Select Staff</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name} {staff.employee_id ? `(EMP: ${staff.employee_id})` : ''}
                        </option>
                      ))}
                    </select>
                    {staffList.length === 0 && (
                      <p className="text-xs text-amber-600">Loading staff...</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {allocation.staff?.first_name} {allocation.staff?.last_name}
                      </p>
                      {allocation.staff?.employee_id && (
                        <p className="text-xs text-slate-400 mt-0.5">EMP: {allocation.staff.employee_id}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right column — Admission + Bed + Stats */}
            <div className="col-span-12 lg:col-span-8 space-y-4">

              {/* Admission stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: 'IP Number', value: allocation.ip_number || 'N/A',
                    icon: Hash, color: 'bg-indigo-600', mono: true
                  },
                  {
                    label: 'Days Admitted', value: `${totalDays} day${totalDays !== 1 ? 's' : ''}`,
                    icon: Clock, color: 'bg-violet-600'
                  },
                  {
                    label: 'Admitted On', value: fmtDate(allocation.admission_date),
                    icon: Calendar, color: 'bg-sky-600', small: true
                  },
                  {
                    label: allocation.discharge_date ? 'Discharged' : 'Status',
                    value: allocation.discharge_date ? fmtDate(allocation.discharge_date) : (isActive ? 'Active' : allocation.status),
                    icon: allocation.discharge_date ? LogOut : HeartPulse,
                    color: allocation.discharge_date ? 'bg-slate-500' : isActive ? 'bg-emerald-500' : 'bg-slate-400',
                    small: true
                  },
                ].map(({ label, value, icon: Icon, color, mono, small }) => (
                  <div key={label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3.5 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                      <p className={`font-bold text-slate-800 mt-0.5 truncate ${small ? 'text-xs' : 'text-sm'} ${mono ? 'font-mono' : ''}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bed details */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Bed Assignment</span>
                  <div className="flex items-center gap-1.5">
                    {editSection === 'bed' ? (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => saveSection('bed')}
                          disabled={savingSection === 'bed'}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
                        >
                          {savingSection === 'bed' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEdit('bed')}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${bed?.status === 'occupied' ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                      {bed?.status || 'occupied'}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {editSection === 'bed' ? (
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Select Bed</label>
                      <select 
                        value={editBedId}
                        onChange={(e) => setEditBedId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-white"
                      >
                        <option value="">Select a bed</option>
                        {availableBeds.map((bedItem) => (
                          <option key={bedItem.id} value={bedItem.id}>
                            {bedItem.bed_number} - Room {bedItem.room_number} ({bedItem.bed_type}) - Floor {bedItem.floor_number || 0}
                            {bedItem.status === 'occupied' ? ' (Current)' : ' (Available)'}
                          </option>
                        ))}
                      </select>
                      {availableBeds.length === 0 && (
                        <p className="text-xs text-amber-600">Loading available beds...</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Current: {bed?.bed_number} - Room {bed?.room_number}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {[
                        { label: 'Bed Number', value: bed?.bed_number || '—', highlight: true },
                        { label: 'Bed Type', value: bed?.bed_type || '—', capitalize: true },
                        { label: 'Room', value: bed?.room_number ? `Room ${bed.room_number}` : '—' },
                        { label: 'Floor', value: bed?.floor_number ? `Floor ${bed.floor_number}` : '—' },
                        { label: 'Daily Rate', value: bed?.daily_rate ? `₹ ${bed.daily_rate.toLocaleString()}` : '—' },
                        { label: 'Features', value: bed?.features?.join(', ') || '—' },
                      ].map(({ label, value, highlight, capitalize }) => (
                        <div key={label} className="bg-slate-50 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
                          <p className={`text-sm font-semibold mt-0.5 ${highlight ? 'text-indigo-600' : 'text-slate-700'} ${capitalize ? 'capitalize' : ''}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Admission reason */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Reason for Admission</p>
                  {editSection === 'reason' ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => saveSection('reason')}
                        disabled={savingSection === 'reason'}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
                      >
                        {savingSection === 'reason' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      </button>
                      <button 
                        onClick={cancelEdit}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => startEdit('reason')}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                
                {editSection === 'reason' ? (
                  <textarea 
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none resize-none"
                    placeholder="Enter reason for admission..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">{allocation.reason || 'No reason specified'}</p>
                )}
              </div>

              {/* Quick links */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Clinical Records', desc: 'Case sheet, doctor orders, nurse notes',
                    icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100',
                    onClick: () => setActiveTab('clinical')
                  },
                  {
                    label: 'View Bill', desc: 'Charges, payments & receipts',
                    icon: Receipt, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100',
                    href: `/inpatient/billing/${allocationId}`
                  },
                  {
                    label: 'Billing Breakdown', desc: 'Department-wise cost breakdown',
                    icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100',
                    href: `/inpatient/billing-breakdown/${allocationId}`
                  },
                  ...(isActive ? [{
                    label: 'Discharge Patient', desc: 'Create discharge summary',
                    icon: LogOut, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100',
                    href: `/inpatient/discharge/${allocationId}`
                  }] : []),
                  {
                    label: 'Patient Profile', desc: 'Full patient record & history',
                    icon: User, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100',
                    href: `/patients/${allocation.patient_id}`
                  },
                ].map(({ label, desc, icon: Icon, color, bg, href, onClick }) => {
                  const inner = (
                    <div className={`flex items-start gap-3 p-4 bg-white rounded-xl border ${bg.split(' ')[1]} hover:bg-slate-50 transition-all cursor-pointer group`}>
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4.5 w-4.5 ${color} h-4 w-4`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800">{label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-all mt-0.5 shrink-0" />
                    </div>
                  );
                  if (href) return <Link key={label} href={href}>{inner}</Link>;
                  return <div key={label} onClick={onClick}>{inner}</div>;
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CLINICAL RECORDS TAB ── */}
        {activeTab === 'clinical' && (
          <div>
            <IPClinicalRecords
              allocations={[allocation]}
              patient={{ id: allocation.patient_id, ...patient }}
              defaultTab="case_sheet"
            />
          </div>
        )}

        {/* ── MEDICATIONS TAB ── */}
        {activeTab === 'medications' && (
          <div className="space-y-4">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">Prescriptions</h2>
                <p className="text-xs text-slate-400 mt-0.5">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} for this admission</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadPrescriptions}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                  <RefreshCw className={`h-4 w-4 ${loadingPrescriptions ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowPrescribeForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> New Prescription
                </button>
              </div>
            </div>

            {/* Prescription form (inline) */}
            {showPrescribeForm && (
              <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
                <IPPrescriptionForm
                  patientId={allocation.patient_id}
                  patientName={(allocation.patient?.name || '').trim() || 'Unknown'}
                  bedAllocationId={allocationId}
                  currentUser={currentUser}
                  onClose={() => setShowPrescribeForm(false)}
                  onPrescriptionCreated={() => {
                    setShowPrescribeForm(false);
                    loadPrescriptions();
                  }}
                />
              </div>
            )}

            {/* Prescriptions list */}
            {loadingPrescriptions ? (
              <div className="bg-white rounded-xl border border-slate-100 py-14 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : prescriptions.length === 0 && !showPrescribeForm ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <Pill className="h-7 w-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">No prescriptions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Create a prescription for this patient</p>
                </div>
                <button
                  onClick={() => setShowPrescribeForm(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <Plus className="h-4 w-4" /> Write Prescription
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((rx, idx) => {
                  const doctorRaw = rx.doctor?.name;
                  const drName = (typeof doctorRaw === 'string' ? doctorRaw : (doctorRaw as any)?.name || '').trim() || 'Unknown';
                  const rxDate = new Date(rx.prescription_date || rx.created_at);
                  const totalAmt = (rx.items || []).reduce((s: number, i: any) => s + (i.total_price || 0), 0);

                  return (
                    <div key={rx.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Rx header */}
                      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Pill className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">
                                Prescription #{prescriptions.length - idx}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                                rx.status === 'dispensed'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                rx.status === 'partial'    ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                rx.status === 'active'     ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                rx.status === 'completed'  ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                rx.status === 'cancelled'  ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-sky-50 text-sky-700 border-sky-200'
                              }`}>{rx.status || 'active'}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {rxDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              {drName !== 'Unknown' && (
                                <span className="flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" />
                                  Dr. {drName}
                                </span>
                              )}
                              {(rx.items || []).length > 0 && (
                                <span>{(rx.items || []).length} item{(rx.items || []).length !== 1 ? 's' : ''}</span>
                              )}
                              {totalAmt > 0 && (
                                <span className="text-indigo-600 font-semibold">₹{totalAmt.toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Medication items */}
                      {(rx.items || []).length > 0 && (
                        <div className="divide-y divide-slate-50">
                          {/* Table header */}
                          <div className="px-5 py-2 grid grid-cols-12 gap-3 bg-slate-50/60">
                            <p className="col-span-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Medicine</p>
                            <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Dosage</p>
                            <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Frequency</p>
                            <p className="col-span-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Duration</p>
                            <p className="col-span-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Qty</p>
                            <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">History</p>
                            <p className="col-span-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">Amount</p>
                          </div>
                          {(rx.items || []).map((item: any, i: number) => (
                            <div key={item.id || i} className="px-5 py-3 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/50 transition-colors">
                              <div className="col-span-3 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-md bg-violet-50 flex items-center justify-center shrink-0">
                                  <Pill className="h-3 w-3 text-violet-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 truncate">{item.medication_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full border ${
                                      item.status === 'dispensed' || item.status === 'complete'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : item.status === 'partial'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                    }`}>
                                      {item.status === 'complete' ? 'dispensed' : (item.status || 'pending')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="col-span-2 text-xs font-medium text-slate-700">{item.dosage || '—'}</p>
                              <p className="col-span-2 text-xs text-slate-600">{item.frequency || '—'}</p>
                              <p className="col-span-1 text-xs text-slate-600">{item.duration || '—'}</p>
                              <p className="col-span-1 text-xs font-medium text-slate-700">{item.quantity ?? '—'}</p>
                              <div className="col-span-2">
                                {item.dispensed_at ? (
                                  <div className="text-[11px] text-slate-500 leading-relaxed">
                                    <p className="font-medium text-emerald-700">Dispensed {item.dispensed_quantity ? `(${item.dispensed_quantity})` : ''}</p>
                                    <p>{new Date(item.dispensed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    {item.dispensed_by && <p>By {item.dispensed_by}</p>}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-400">Not dispensed yet</p>
                                )}
                              </div>
                              <p className="col-span-1 text-xs font-semibold text-slate-800 text-right">
                                {item.total_price ? `₹${item.total_price.toLocaleString()}` : '—'}
                              </p>
                            </div>
                          ))}
                          {/* Total row */}
                          {totalAmt > 0 && (
                            <div className="px-5 py-2.5 flex justify-end bg-slate-50/60">
                              <span className="text-xs text-slate-500 mr-3">Total</span>
                              <span className="text-sm font-bold text-indigo-600">₹{totalAmt.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {rx.notes && (
                        <div className="px-5 py-3 border-t border-slate-50 flex items-start gap-2">
                          <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-500 italic">{rx.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LAB / SCAN / X-RAY TAB ── */}
        {activeTab === 'lab' && (
          <div className="space-y-4">

            {/* Toast */}
            {labToast && (
              <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border ${
                labToast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {labToast.type === 'success' ? <CheckSquare className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {labToast.msg}
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-slate-800">Lab / Scan / X-Ray Orders</h2>
                <p className="text-xs text-slate-400 mt-0.5">{labOrders.length} order{labOrders.length !== 1 ? 's' : ''} for this admission</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={loadLabOrders}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                  <RefreshCw className={`h-4 w-4 ${loadingLabOrders ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => { setShowLabForm(true); loadCatalogs(); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> New Order
                </button>
              </div>
            </div>

            {/* Order form */}
            {showLabForm && (
              <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-sky-500" />
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">New Lab / Scan / X-Ray Order</h3>
                    <button onClick={() => { setShowLabForm(false); setSelectedTests([]); setLabSearch(''); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-all">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sub-tab: Lab / Radiology */}
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                    {([
                      { id: 'lab', label: 'Lab Tests', icon: Microscope },
                      { id: 'radiology', label: 'Radiology / Scan / X-Ray', icon: ScanLine },
                    ] as const).map(({ id, label, icon: Icon }) => (
                      <button key={id} onClick={() => { setLabSubTab(id); setLabSearch(''); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          labSubTab === id
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        <Icon className="h-3.5 w-3.5" />{label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={`Search ${labSubTab === 'lab' ? 'lab tests' : 'radiology/scan/xray'}…`}
                      value={labSearch}
                      onChange={e => setLabSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none bg-slate-50"
                    />
                  </div>

                  {/* Test catalog list */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    {(labSubTab === 'lab' ? labCatalog : radiologyCatalog)
                      .filter(t => {
                        const q = labSearch.toLowerCase();
                        return !q || t.test_name.toLowerCase().includes(q) || (t as any).category?.toLowerCase().includes(q) || (t as any).modality?.toLowerCase().includes(q);
                      })
                      .slice(0, 40)
                      .map(t => {
                        const isSelected = !!selectedTests.find(s => s.id === t.id);
                        return (
                          <button key={t.id} onClick={() => toggleTest(t.id, t.test_name, labSubTab, t.test_cost)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                              isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414L9 14.414l-3.707-3.707a1 1 0 011.414-1.414L9 11.586l6.293-6.293a1 1 0 011.414 0z"/></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{t.test_name}</p>
                              <p className="text-[10px] text-slate-400">{(t as any).category || (t as any).modality || ''}{(t as any).modality && (t as any).category ? ` · ${(t as any).modality}` : ''}{(t as any).sample_type ? ` · ${(t as any).sample_type}` : ''}</p>
                            </div>
                            <span className="text-xs font-semibold text-indigo-600 shrink-0">₹{t.test_cost?.toLocaleString()}</span>
                          </button>
                        );
                      })
                    }
                    {(labSubTab === 'lab' ? labCatalog : radiologyCatalog).length === 0 && (
                      <div className="py-10 text-center text-sm text-slate-400">Loading catalog…</div>
                    )}
                  </div>

                  {/* Selected tests summary */}
                  {selectedTests.length > 0 && (
                    <div className="bg-indigo-50 rounded-xl p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-indigo-700 mb-2">Selected ({selectedTests.length})</p>
                      {selectedTests.map(t => (
                        <div key={t.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                              t.type === 'lab' ? 'bg-indigo-100' : 'bg-sky-100'
                            }`}>
                              {t.type === 'lab'
                                ? <Microscope className="h-3 w-3 text-indigo-500" />
                                : <ScanLine className="h-3 w-3 text-sky-500" />}
                            </div>
                            <span className="text-xs font-medium text-slate-700 truncate">{t.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-indigo-600 font-semibold">₹{t.cost?.toLocaleString()}</span>
                            <button onClick={() => setSelectedTests(p => p.filter(x => x.id !== t.id))}
                              className="text-slate-400 hover:text-red-500 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-1.5 border-t border-indigo-100 flex justify-between text-xs font-bold text-indigo-700">
                        <span>Total</span>
                        <span>₹{selectedTests.reduce((s, t) => s + (t.cost || 0), 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Clinical indication + urgency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Clinical Indication <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Fever workup, pre-op screening…"
                        value={labIndication}
                        onChange={e => setLabIndication(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Urgency</label>
                      <div className="flex gap-1.5">
                        {(['routine', 'urgent', 'stat'] as const).map(u => (
                          <button key={u} onClick={() => setLabUrgency(u)}
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg capitalize border transition-all ${
                              labUrgency === u
                                ? u === 'stat' ? 'bg-red-600 text-white border-red-600'
                                  : u === 'urgent' ? 'bg-orange-500 text-white border-orange-500'
                                    : 'bg-indigo-600 text-white border-indigo-600'
                                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}>{u}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => { setShowLabForm(false); setSelectedTests([]); setLabSearch(''); }}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      Cancel
                    </button>
                    <button
                      onClick={handleLabSubmit}
                      disabled={!selectedTests.length || !labIndication.trim() || submittingLab}
                      className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      {submittingLab ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                      Place Order
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Orders list */}
            {loadingLabOrders ? (
              <div className="bg-white rounded-xl border border-slate-100 py-14 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : labOrders.length === 0 && !showLabForm ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <FlaskConical className="h-7 w-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">No lab orders yet</p>
                  <p className="text-sm text-slate-400 mt-1">Order lab tests, scans, or x-rays for this patient</p>
                </div>
                <button
                  onClick={() => { setShowLabForm(true); loadCatalogs(); }}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  <Plus className="h-4 w-4" /> New Order
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {labOrders.map((order, idx) => {
                  const oDate = new Date(order.created_at);
                  const items = (order as any).items || [];
                  const labItems = items.filter((i: any) => i.service_type === 'lab');
                  const radItems = items.filter((i: any) => ['radiology', 'scan', 'xray'].includes(i.service_type));
                  const urgencyColor =
                    order.urgency === 'stat' ? 'bg-red-100 text-red-700 border-red-200'
                    : order.urgency === 'urgent' ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200';
                  const statusColor =
                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : order.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200';

                  return (
                    <div key={order.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                      {/* Order header */}
                      <div className="px-5 py-3.5 border-b border-slate-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <FlaskConical className="h-4 w-4 text-indigo-500" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800">
                                Order #{labOrders.length - idx}
                              </span>
                              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                                {order.status || 'pending'}
                              </span>
                              {order.urgency && order.urgency !== 'routine' && (
                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${urgencyColor}`}>
                                  {order.urgency}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {oDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              {items.length > 0 && (
                                <span>{items.length} test{items.length !== 1 ? 's' : ''}</span>
                              )}
                              {labItems.length > 0 && (
                                <span className="flex items-center gap-0.5 text-indigo-500">
                                  <Microscope className="h-3 w-3" /> {labItems.length} Lab
                                </span>
                              )}
                              {radItems.length > 0 && (
                                <span className="flex items-center gap-0.5 text-sky-500">
                                  <ScanLine className="h-3 w-3" /> {radItems.length} Rad
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Clinical indication */}
                      {order.clinical_indication && (
                        <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-50 flex items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <p className="text-xs text-slate-500 italic">{order.clinical_indication}</p>
                        </div>
                      )}

                      {/* Test items */}
                      {items.length > 0 && (
                        <div className="divide-y divide-slate-50">
                          <div className="px-5 py-2 grid grid-cols-12 gap-2 bg-slate-50/50">
                            <p className="col-span-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Type</p>
                            <p className="col-span-9 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Test Name</p>
                            <p className="col-span-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide text-right">Status</p>
                          </div>
                          {items.map((item: any, i: number) => {
                            const isLab = item.service_type === 'lab';
                            const isRad = ['radiology', 'scan', 'xray'].includes(item.service_type);
                            const itemStatusColor =
                              item.status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                              : item.status === 'cancelled' ? 'bg-red-100 text-red-600'
                              : 'bg-slate-100 text-slate-500';
                            return (
                              <div key={item.id || i} className="px-5 py-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50 transition-colors">
                                <div className="col-span-1">
                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                    isLab ? 'bg-indigo-50' : isRad ? 'bg-sky-50' : 'bg-amber-50'
                                  }`}>
                                    {isLab
                                      ? <Microscope className="h-3 w-3 text-indigo-500" />
                                      : isRad ? <ScanLine className="h-3 w-3 text-sky-500" />
                                        : <FlaskConical className="h-3 w-3 text-amber-500" />}
                                  </div>
                                </div>
                                <p className="col-span-9 text-sm font-medium text-slate-800">{item.item_name_snapshot}</p>
                                <div className="col-span-2 flex justify-end">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${itemStatusColor}`}>
                                    {item.status || 'pending'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {activeTab === 'billing' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
                <Receipt className="h-7 w-7 text-sky-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-slate-800">Billing Details</p>
                <p className="text-sm text-slate-400 mt-1">View detailed billing, itemized charges and payment history</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/inpatient/billing/${allocationId}`}>
                  <button className="flex items-center gap-1.5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md">
                    <Receipt className="h-4 w-4" /> View Full Bill
                  </button>
                </Link>
                <Link href={`/inpatient/billing-breakdown/${allocationId}`}>
                  <button className="flex items-center gap-1.5 px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md">
                    <FileText className="h-4 w-4" /> Breakdown Bill
                  </button>
                </Link>
                <Link href={`/inpatient/billing/${allocationId}/create`}>
                  <button className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md">
                    <Plus className="h-4 w-4" /> IP Create Bill
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
