import React, { useState, useEffect, useRef } from 'react';
import { Save, Loader2, FileText, CheckCircle, Lock, Printer, Plus, Trash2, User, Calendar, Home, Activity, ChevronDown } from 'lucide-react';
import { 
  getIPDischargeSummary, 
  createOrUpdateIPDischargeSummary, 
  getIPCaseSheet, 
  getIPDoctorOrders,
  IPDischargeSummary,
  PrescriptionItem
} from '../../lib/ipClinicalService';
import { getAllDoctorsSimple, Doctor } from '../../lib/doctorService';
import { updatePatientRecord } from '../../lib/patientService';
import { DischargePrintTemplate } from './DischargePrintTemplate';

// Doctor Dropdown Component with Manual Entry
interface DoctorDropdownProps {
  value: string;
  onChange: (value: string) => void;
  doctors: Doctor[];
  placeholder: string;
  disabled?: boolean;
}

function DoctorDropdown({ value, onChange, doctors, placeholder, disabled }: DoctorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDoctors = (doctors || []).filter(doctor => {
    const doctorName = doctor.user?.name || '';
    const specialization = doctor.specialization || '';
    const searchValue = (typeof inputValue === 'string' ? inputValue : String(inputValue || '')).toLowerCase();
    
    return doctorName.toLowerCase().includes(searchValue) || 
           specialization.toLowerCase().includes(searchValue);
  });

  const handleSelect = (doctorName: string) => {
    onChange(doctorName);
    setInputValue(doctorName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <input
          type="text"
          disabled={disabled}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500 pr-10"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredDoctors.length > 0 ? (
            filteredDoctors.map((doctor) => (
              <button
                key={doctor.id}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                onClick={() => handleSelect(doctor.user?.name || '')}
              >
                <div className="font-medium text-sm">{doctor.user?.name || 'Unknown Doctor'}</div>
                <div className="text-xs text-gray-500">{doctor.specialization || 'General Practice'} • {doctor.license_number || 'N/A'}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {(typeof inputValue === 'string' && inputValue.trim()) ? 'No doctors found' : (doctors?.length === 0 ? 'No doctors available' : 'Type to search doctors...')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ComprehensiveDischargeSummaryProps {
  bedAllocationId: string;
  patient: any;
  bedAllocation: any;
}

export default function ComprehensiveDischargeSummary({ bedAllocationId, patient, bedAllocation }: ComprehensiveDischargeSummaryProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Partial<IPDischargeSummary>>({
    status: 'draft',
    discharge_status: bedAllocation?.discharge_date ? 'Discharged' : 'Active'
  });
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Auto-fill source data
  const [caseSheetData, setCaseSheetData] = useState<any>(null);
  const [doctorOrdersData, setDoctorOrdersData] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [bedAllocationId]);

  // Helper function to safely extract doctor name
  const extractDoctorName = (doctor: any): string => {
    if (!doctor) return '';
    if (typeof doctor === 'string') return doctor;
    
    // Debug logging
    console.log('Doctor object structure:', doctor);
    
    // Try different possible name fields
    return doctor.name || 
           doctor.user?.name || 
           doctor.doctor_name || 
           doctor.staff_name || 
           String(doctor) || '';
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, sheet, orders, doctorsData] = await Promise.all([
        getIPDischargeSummary(bedAllocationId),
        getIPCaseSheet(bedAllocationId),
        getIPDoctorOrders(bedAllocationId),
        getAllDoctorsSimple()
      ]);
      
      setSummary(summaryData || { 
        status: 'draft',
        discharge_status: (summaryData as any)?.discharge_status || (bedAllocation?.discharge_date ? 'Discharged' : 'Active'),
        uhid: patient?.uhid || '',
        patient_name: patient?.name || '',
        age: patient?.age || 0,
        gender: patient?.gender || '',
        address: patient?.address || '',
        ip_number: bedAllocation?.ip_number || '',
        room_no: bedAllocation?.bed?.room_number || '', // Auto-populate room number
        admission_date: bedAllocation?.admission_date || '', // Auto-populate admission date
        consult_doctor_name: extractDoctorName(bedAllocation?.doctor), // Auto-populate consulting doctor
        discharge_date: new Date().toISOString().split('T')[0]
      });
      setCaseSheetData(sheet);
      setDoctorOrdersData(orders || []);
      setDoctors(doctorsData || []);
      
      // Load prescription table if exists
      if (summaryData?.prescription_table) {
        setPrescriptionItems(summaryData.prescription_table);
      }
    } catch (err) {
      console.error('Failed to load discharge summary', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (finalize = false) => {
    if (!bedAllocationId) return;
    setSaving(true);
    try {
      const updates = {
        ...summary,
        prescription_table: prescriptionItems.length > 0 ? prescriptionItems : null,
        status: finalize ? 'final' : summary.status,
        finalized_at: finalize ? new Date().toISOString() : summary.finalized_at,
        discharge_date: summary.discharge_date || new Date().toISOString().split('T')[0],
      };

      console.log('Saving discharge summary with updates:', updates);
      const saved = await createOrUpdateIPDischargeSummary(bedAllocationId, updates);
      console.log('Successfully saved discharge summary:', saved);

      // Also update patient record if address, name, age or gender changed
      if (patient?.id && (
        summary.address !== patient.address || 
        summary.patient_name !== patient.name || 
        summary.age !== patient.age || 
        summary.gender !== patient.gender
      )) {
        console.log('Updating patient record with new basic info...');
        await updatePatientRecord(patient.id, {
          address: summary.address,
          name: summary.patient_name,
          age: summary.age,
          gender: summary.gender?.toLowerCase()
        });
      }

      setSummary(saved);
    } catch (err) {
      console.error('Failed to save summary', err);
      // Show more detailed error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      alert(`Failed to save discharge summary: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const addPrescriptionItem = () => {
    const newItem: PrescriptionItem = {
      id: Date.now().toString(),
      drug_details: '',
      per_day_time: '1-0-1',
      nos: '5 DAYS'
    };
    setPrescriptionItems([...prescriptionItems, newItem]);
  };

  const updatePrescriptionItem = (id: string, field: keyof PrescriptionItem, value: string) => {
    setPrescriptionItems(items => 
      items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removePrescriptionItem = (id: string) => {
    setPrescriptionItems(items => items.filter(item => item.id !== id));
  };

  const autoFill = (field: keyof IPDischargeSummary) => {
    let text = '';
    
    if (field === 'final_diagnosis' || field === 'diagnosis') {
      text = caseSheetData?.provisional_diagnosis || '';
    } else if (field === 'investigations') {
      const uniqueTests = new Set(doctorOrdersData.map(o => o.investigation_instructions).filter(Boolean));
      text = Array.from(uniqueTests).join('\n\n');
      if (!text && caseSheetData?.investigation_summary) {
        text = caseSheetData.investigation_summary;
      }
    } else if (field === 'treatment_given' || field === 'course_in_hospital') {
      const uniqueTreatments = new Set(doctorOrdersData.map(o => o.treatment_instructions).filter(Boolean));
      text = Array.from(uniqueTreatments).join('\n\n');
      if (!text && caseSheetData?.treatment_plan) {
        text = caseSheetData.treatment_plan;
      }
    } else if (field === 'presenting_complaint' || field === 'complaints') {
      text = caseSheetData?.present_complaints || '';
    } else if (field === 'physical_findings') {
      text = caseSheetData?.examination_notes || '';
    } else if (field === 'past_history') {
      text = caseSheetData?.past_history || '';
    } else if (field === 'on_examination' || field === 'systemic_examination') {
      text = caseSheetData?.examination_notes || '';
    }

    if (text) {
      setSummary(prev => ({ ...prev, [field]: text }));
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
  }

  const isFinal = summary.status === 'final';

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 print:hidden">
        {/* Header with Status */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Discharge Summary</h2>
              <p className="text-sm text-gray-500 mt-1">
                {isFinal ? <span className="flex items-center gap-1 text-green-600"><Lock className="h-3 w-3" /> Finalized</span> : <span className="text-amber-600">Draft Mode</span>}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                summary.reconnect_status 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-yellow-50 border-yellow-200 text-yellow-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  summary.reconnect_status ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                }`} />
                <span className="text-sm font-medium">
                  {summary.reconnect_status ? 'Connected' : 'RE CONNECT'}
                </span>
              </div>
              
              {/* Status Toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discharge_status"
                    value="Active"
                    checked={summary.discharge_status === 'Active' || (!summary.discharge_status && !bedAllocation?.discharge_date)}
                    onChange={(e) => setSummary({...summary, discharge_status: e.target.value})}
                    disabled={isFinal}
                    className="text-green-600"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discharge_status"
                    value="Discharged"
                    checked={summary.discharge_status === 'Discharged'}
                    onChange={(e) => setSummary({...summary, discharge_status: e.target.value})}
                    disabled={isFinal}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Discharge</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="discharge_status"
                    value="Death"
                    checked={summary.discharge_status === 'Death'}
                    onChange={(e) => setSummary({...summary, discharge_status: e.target.value})}
                    disabled={isFinal}
                    className="text-red-600"
                  />
                  <span className="text-sm">Death</span>
                </label>
              </div>
            </div>
          </div>

          {/* Patient & Administrative Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">UH ID / IP NO</p>
              <input
                type="text"
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={`${summary.uhid || ''} / ${summary.ip_number || ''}`}
                onChange={(e) => {
                  const [uhid, ip] = e.target.value.split(' / ');
                  setSummary({...summary, uhid: uhid?.trim(), ip_number: ip?.trim()});
                }}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">NAME</p>
              <input
                type="text"
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={summary.patient_name || ''}
                onChange={(e) => setSummary({...summary, patient_name: e.target.value})}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">AGE</p>
              <input
                type="number"
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={summary.age || ''}
                onChange={(e) => setSummary({...summary, age: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">GENDER</p>
              <select
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={summary.gender || ''}
                onChange={(e) => setSummary({...summary, gender: e.target.value})}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">ROOM NO</p>
              <input
                type="text"
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={summary.room_no || ''}
                onChange={(e) => setSummary({...summary, room_no: e.target.value})}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase">ADDRESS</p>
              <input
                type="text"
                disabled={isFinal}
                className="font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full"
                value={summary.address || ''}
                onChange={(e) => setSummary({...summary, address: e.target.value})}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ADMISSION DATE</label>
              <input
                type="date"
                disabled={isFinal}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={summary.admission_date || ''}
                onChange={(e) => setSummary({...summary, admission_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DISCHARGE DATE</label>
              <input
                type="date"
                disabled={isFinal}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={summary.discharge_date || ''}
                onChange={(e) => setSummary({...summary, discharge_date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SURGERY DATE</label>
              <input
                type="date"
                disabled={isFinal}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={summary.surgery_date || ''}
                onChange={(e) => setSummary({...summary, surgery_date: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Clinical Vitals & Narratives */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinical Vitals */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-red-600" />
                Clinical Vitals
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BP (mmHg)</label>
                  <input
                    type="text"
                    disabled={isFinal}
                    placeholder="120/80"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.bp || ''}
                    onChange={(e) => setSummary({...summary, bp: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pulse</label>
                  <input
                    type="number"
                    disabled={isFinal}
                    placeholder="72"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.pulse || ''}
                    onChange={(e) => setSummary({...summary, pulse: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BS (mg/dL)</label>
                  <input
                    type="number"
                    disabled={isFinal}
                    placeholder="100"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.bs || ''}
                    onChange={(e) => setSummary({...summary, bs: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RR</label>
                  <input
                    type="number"
                    disabled={isFinal}
                    placeholder="16"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.rr || ''}
                    onChange={(e) => setSummary({...summary, rr: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SPO2 (%)</label>
                  <input
                    type="number"
                    disabled={isFinal}
                    placeholder="98"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.spo2 || ''}
                    onChange={(e) => setSummary({...summary, spo2: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temp (°F)</label>
                  <input
                    type="number"
                    step="0.1"
                    disabled={isFinal}
                    placeholder="98.6"
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={summary.temp || ''}
                    onChange={(e) => setSummary({...summary, temp: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            {/* Clinical Narratives */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Clinical Notes
              </h3>
              
              {[
                { key: 'complaints', label: 'Complaints / H/O', rows: 3 },
                { key: 'past_history', label: 'Past History', rows: 3 },
                { key: 'on_examination', label: 'O/E (On Examination)', rows: 4 },
                { key: 'systemic_examination', label: 'S/E (Systemic Examination)', rows: 4 },
                { key: 'investigations', label: 'Investigations', rows: 3 },
                { key: 'diagnosis', label: 'Diagnosis', rows: 2 },
                { key: 'procedure_details', label: 'Procedure', rows: 3 },
                { key: 'treatment_given', label: 'Treatment Given', rows: 4 },
                { key: 'course_in_hospital', label: 'Course in Hospital', rows: 4 },
                { key: 'surgery_notes', label: 'Surgery Notes', rows: 3 },
                { key: 'discharge_advice', label: 'Discharge Advice', rows: 3 },
                { key: 'condition_at_discharge', label: 'Condition at Discharge', rows: 2 },
              ].map((section) => (
                <div key={section.key} className="relative group">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">{section.label}</label>
                    {!isFinal && (
                      <button 
                        onClick={() => autoFill(section.key as keyof IPDischargeSummary)}
                        className="text-xs text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                        title="Auto-fill from Case Sheet / Doctor Orders"
                      >
                        <FileText className="h-3 w-3" /> Auto-fill
                      </button>
                    )}
                  </div>
                  <textarea
                    disabled={isFinal}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    rows={section.rows}
                    value={(summary[section.key as keyof IPDischargeSummary] as string) || ''}
                    onChange={(e) => setSummary({...summary, [section.key]: e.target.value})}
                  />
                </div>
              ))}
            </div>

            {/* Doctor Information */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" />
                Doctor Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Consulting Doctor</label>
                  <DoctorDropdown
                    value={summary.consult_doctor_name || ''}
                    onChange={(value) => setSummary({...summary, consult_doctor_name: value})}
                    doctors={doctors}
                    placeholder="Select or enter consulting doctor name"
                    disabled={isFinal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Surgeon</label>
                  <DoctorDropdown
                    value={summary.surgeon_doctor_name || ''}
                    onChange={(value) => setSummary({...summary, surgeon_doctor_name: value})}
                    doctors={doctors}
                    placeholder="Select or enter surgeon name"
                    disabled={isFinal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Anesthesiologist</label>
                  <DoctorDropdown
                    value={summary.anesthesiologist_doctor || ''}
                    onChange={(value) => setSummary({...summary, anesthesiologist_doctor: value})}
                    doctors={doctors}
                    placeholder="Select or enter anesthesiologist name"
                    disabled={isFinal}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Review On</label>
                  <input
                    type="date"
                    disabled={isFinal}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    value={summary.review_date || ''}
                    onChange={(e) => setSummary({...summary, review_date: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Prescription Table */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Prescription
                </h3>
                {!isFinal && (
                  <button
                    onClick={addPrescriptionItem}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {prescriptionItems.length === 0 ? (
                  <p className="text-center text-gray-500 py-4 text-sm">No prescription items added.</p>
                ) : (
                  prescriptionItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <input
                          type="text"
                          disabled={isFinal}
                          placeholder="Drug details (e.g., AZITHRAL 100)"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={item.drug_details}
                          onChange={(e) => updatePrescriptionItem(item.id, 'drug_details', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          disabled={isFinal}
                          placeholder="1-0-1"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={item.per_day_time}
                          onChange={(e) => updatePrescriptionItem(item.id, 'per_day_time', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          disabled={isFinal}
                          placeholder="5 DAYS"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          value={item.nos}
                          onChange={(e) => updatePrescriptionItem(item.id, 'nos', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        {!isFinal && (
                          <button
                            onClick={() => removePrescriptionItem(item.id)}
                            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-4 text-xs text-gray-500">
                <p>• Drug Details: Searchable medication name</p>
                <p>• PerDayTime: Format: Morning-Afternoon-Night (e.g., 1-0-1)</p>
                <p>• Nos: Duration (e.g., 10 DAYS)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {!isFinal && (
                <button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              )}
              {!isFinal && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to finalize? The summary will become read-only.')) {
                      handleSave(true);
                    }
                  }}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <CheckCircle className="h-4 w-4" />
                  Finalize
                </button>
              )}
              <button 
                onClick={() => {
                  // Ensure the print template has the latest data before printing
                  if (printRef.current) {
                    window.print();
                  }
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
            
            {/* Quick Links */}
            <div className="flex gap-2">
              <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="ICU">
                <Activity className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Pharmacy">
                <FileText className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Lab">
                <FileText className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="X-Ray">
                <FileText className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Print Template */}
      <DischargePrintTemplate ref={printRef} summary={summary} patient={patient} bedAllocation={bedAllocation} />
    </>
  );
}
