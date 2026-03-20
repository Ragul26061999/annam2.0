'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Printer,
  AlertTriangle,
  RefreshCw,
  User,
  MapPin,
  Phone,
  Stethoscope,
  IndianRupee,
  Hash,
  Calendar,
  Clock,
  CreditCard
} from 'lucide-react';
import { addToQueue } from '../../../src/lib/outpatientQueueService';
import { createAppointment, type AppointmentData } from '../../../src/lib/appointmentService';
import { createOPConsultationBill, type PaymentRecord } from '../../../src/lib/universalPaymentService';
import StaffSelect from '../../../src/components/StaffSelect';
import BarcodeModal from '../../../src/components/BarcodeModal';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import { supabase } from '../../../src/lib/supabase';
import { generateUHID } from '../../../src/lib/patientService';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand',
  'Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur',
  'Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const COMMON_PLACES = [
  'T. Nagar','Anna Nagar','Adyar','Mylapore','Velachery','Tambaram',
  'Chromepet','Pallavaram','Guindy','Nungambakkam','Kodambakkam',
  'Teynampet','Alwarpet','Royapettah','Triplicane','Chepauk',
  'Egmore','Park Town','George Town','Parrys','Saidapet',
  'Mambalam','Ashok Nagar','K.K. Nagar','Vadapalani','Saligramam',
  'Porur','Poonamallee','Avadi','Ambattur','Madhavaram',
  'Red Hills','Thiruvanmiyur','Besant Nagar','Sholinganallur',
  'Medavakkam','Keelkattalai','Kovilambakkam','Pallikaranai',
  'Thoraipakkam','Karapakkam','Navalur','Kelambakkam','Siruseri',
  'OMR','ECR','GST Road','Arcot Road','Poonamallee High Road',
];

// Every interactive field in exact visual order — used for Enter-key focus chain
const FIELDS: string[] = [
  'registrationDate','registrationTime',
  'firstName','lastName','gender','age','dob','contactNo',
  'alternateNo','relationship',
  'address','city','state','pincode','place',
  'primaryComplaint','priority',
  'consultingDoctorId','diagnosis',
  'consultationFee','opCardAmount','paymentMode',
];

export default function QuickRegisterPage() {
  const router = useRouter();

  const [loading,           setLoading]           = useState(false);
  const [isSuccess,         setIsSuccess]          = useState(false);
  const [error,             setError]              = useState<string|null>(null);
  const [queueNumber,       setQueueNumber]        = useState<number|null>(null);
  const [showBarcodeModal,  setShowBarcodeModal]   = useState(false);
  const [registeredPatient, setRegisteredPatient]  = useState<any>(null);
  const [contactExists,     setContactExists]      = useState(false);
  const [checkingContact,   setCheckingContact]    = useState(false);
  const [placeSuggestions,  setPlaceSuggestions]   = useState<string[]>([]);
  const [showPlaceSug,      setShowPlaceSug]       = useState(false);
  const [existingPlaces,    setExistingPlaces]     = useState<string[]>([]);
  const [selectedSugIdx,    setSelectedSugIdx]     = useState(-1);
  const [duplicatePatient,  setDuplicatePatient]   = useState<any|null>(null);
  const [checkingDuplicate, setCheckingDuplicate]  = useState(false);
  const [showDupAlert,      setShowDupAlert]       = useState(false);
  const [doctors,           setDoctors]            = useState<any[]>([]);
  const [contactErr,        setContactErr]         = useState('');
  const [sidebarOpen,       setSidebarOpen]        = useState(true);
  const [currentBill,       setCurrentBill]        = useState<PaymentRecord | null>(null);
  const [showPaymentModal,  setShowPaymentModal]   = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [refreshBillTrigger, setRefreshBillTrigger] = useState(0);

  // One ref map for every field — keyed by FIELDS array values
  const refs = useRef<Record<string, HTMLElement|null>>({});
  const reg  = useCallback(
    (id: string) => (el: HTMLElement|null) => { refs.current[id] = el; },
    [],
  );

  const [form, setForm] = useState({
    registrationDate: new Date().toISOString().split('T')[0],
    registrationTime: new Date().toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit'}),
    uhid: '',
    firstName:'', lastName:'', age:'', dob:'', gender:'',
    contactNo:'', alternateNo:'', relationship:'',
    address:'', city:'', state:'Tamil Nadu', pincode:'', place:'',
    primaryComplaint:'', priority:'0',
    consultingDoctorId:'', consultingDoctorName:'', diagnosis:'',
    consultationFee:'', opCardAmount:'', totalAmount:'', paymentMode:'Cash',
    staffId:'',
  });

  const submitRef = useRef<HTMLButtonElement>(null);

  // ── Enter / Esc global key handler ───────────────────────────────────────
  const handleFormKey = useCallback((e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      router.push('/outpatient');
      return;
    }
    if (e.key !== 'Enter') return;
    // Allow Enter inside <textarea> normally
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    // Place dropdown: let handlePlaceKey manage it
    if (showPlaceSug) return;
    e.preventDefault();

    const activeId = (e.target as HTMLElement).dataset.fieldid;

    // If focused on submit button itself, submit
    if ((e.target as HTMLElement) === submitRef.current) {
      submitRef.current?.click();
      return;
    }

    // Auto-calc DOB when leaving the age field
    if (activeId === 'age') {
      const age = parseInt(form.age.replace?.(/\D/g,'') ?? form.age);
      if (!isNaN(age) && age >= 0 && age <= 150) {
        const y = new Date().getFullYear() - age;
        setForm(p => ({...p, dob:`${y}-04-14`}));
      }
    }

    if (!activeId) return;
    const idx = FIELDS.indexOf(activeId);
    if (idx === -1) return;

    // Walk forward to next focusable field
    for (let i = idx + 1; i < FIELDS.length; i++) {
      const el = refs.current[FIELDS[i]];
      if (el && !(el as any).disabled && !(el as any).readOnly) {
        el.focus();
        return;
      }
    }

    // No more fields — submit
    submitRef.current?.click();
  }, [showPlaceSug, router, form.age]);

  // ── Data loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    generateUHID().then(uhid => setForm(p => ({...p, uhid}))).catch(() => {});
  }, []);

  useEffect(() => {
    supabase.from('patients').select('place')
      .not('place','is',null).not('place','eq','').limit(100)
      .then(({data}: {data: {place:string}[]|null}) => setExistingPlaces((data||[]).map(r=>r.place).filter(Boolean)));
  }, []);

  useEffect(() => {
    supabase.from('doctors')
      .select('id,users(name),specialization,consultation_fee,department')
      .eq('status','active')
      .then(({data}: {data: any[]|null}) => setDoctors(data||[]));
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.place-wrap')) setShowPlaceSug(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Age from DOB
  useEffect(() => {
    if (!form.dob) return;
    const d = new Date(form.dob), today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    setForm(p => ({...p, age: String(age)}));
  }, [form.dob]);

  // Total
  useEffect(() => {
    const t = (parseFloat(form.consultationFee)||0) + (parseFloat(form.opCardAmount)||0);
    setForm(p => ({...p, totalAmount: String(t)}));
  }, [form.consultationFee, form.opCardAmount]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const {name, value} = e.target;

    if (name === 'contactNo') {
      const v = value.replace(/\D/g,'').slice(0,10);
      setForm(p => ({...p, contactNo:v}));
      setContactErr(v.length > 0 && v.length < 10 ? 'Must be exactly 10 digits' : '');
      if (v.length === 10) checkContact(v); else setContactExists(false);
      return;
    }
    if (name === 'dob') { setForm(p => ({...p, dob:value, age:''})); return; }
    setForm(p => ({...p, [name]:value}));

    if (name === 'place') {
      if (value.length >= 2) {
        const all = [...new Set([...COMMON_PLACES, ...existingPlaces])];
        const filtered = all
          .filter(pl => pl.toLowerCase().includes(value.toLowerCase()))
          .sort((a,b) => {
            const aL=a.toLowerCase(), bL=b.toLowerCase(), sL=value.toLowerCase();
            if (aL===sL) return -1; if (bL===sL) return 1;
            if (aL.startsWith(sL)&&!bL.startsWith(sL)) return -1;
            if (bL.startsWith(sL)&&!aL.startsWith(sL)) return 1;
            return a.localeCompare(b);
          }).slice(0,8);
        setPlaceSuggestions(filtered);
        setShowPlaceSug(true);
        setSelectedSugIdx(-1);
      } else {
        setShowPlaceSug(false);
        setPlaceSuggestions([]);
      }
    }
  };

  const selectPlace = (place: string) => {
    setForm(p => ({...p, place}));
    setShowPlaceSug(false);
    setPlaceSuggestions([]);
    setSelectedSugIdx(-1);
    // Move to next field after place
    const idx = FIELDS.indexOf('place');
    for (let i = idx+1; i < FIELDS.length; i++) {
      const el = refs.current[FIELDS[i]];
      if (el && !(el as any).disabled && !(el as any).readOnly) { el.focus(); return; }
    }
  };

  const handlePlaceKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { e.preventDefault(); setShowPlaceSug(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showPlaceSug && placeSuggestions.length)
        setSelectedSugIdx(p => p < placeSuggestions.length-1 ? p+1 : 0);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showPlaceSug && placeSuggestions.length)
        setSelectedSugIdx(p => p > 0 ? p-1 : placeSuggestions.length-1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSugIdx >= 0 && placeSuggestions[selectedSugIdx]) {
        selectPlace(placeSuggestions[selectedSugIdx]);
      } else {
        setShowPlaceSug(false);
        setSelectedSugIdx(-1);
        // move forward
        const idx = FIELDS.indexOf('place');
        for (let i = idx+1; i < FIELDS.length; i++) {
          const el = refs.current[FIELDS[i]];
          if (el && !(el as any).disabled && !(el as any).readOnly) { el.focus(); return; }
        }
      }
    }
  };

  const checkContact = async (v: string) => {
    setCheckingContact(true);
    try {
      const {data} = await supabase.from('patients').select('patient_id').eq('phone',v).limit(1);
      setContactExists(!!(data&&data.length>0));
    } finally { setCheckingContact(false); }
  };

  const checkDuplicate = async (name: string, gender: string, dob: string) => {
    if (!name||!gender||!dob) return;
    setCheckingDuplicate(true);
    try {
      const {data} = await supabase.from('patients').select('*')
        .eq('name',name.trim()).eq('gender',gender.toLowerCase()).eq('date_of_birth',dob).limit(1);
      if (data&&data.length>0) { setDuplicatePatient(data[0]); setShowDupAlert(true); }
      else { setDuplicatePatient(null); setShowDupAlert(false); }
    } finally { setCheckingDuplicate(false); }
  };

  const handleDoctorSelect = (id: string) => {
    const doc = doctors.find(d=>d.id===id);
    setForm(p => ({
      ...p,
      consultingDoctorId: id,
      consultingDoctorName: doc?.users?.name||'',
      consultationFee: doc?.consultation_fee ? String(doc.consultation_fee) : p.consultationFee,
    }));
  };

  const getImmediateApptTime = () => {
    const now = new Date();
    const base = new Date(now);
    base.setMinutes(base.getMinutes() + 2);
    base.setSeconds(0, 0);
    const finalDate = base.toISOString().split('T')[0];
    const appointmentTime = `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}:00`;
    return { appointmentDate: finalDate, appointmentTime };
  };

  const handlePrintThermalBill = async () => {
    if (!currentBill || !registeredPatient) return;

    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const patientUhid = registeredPatient.patient_id || 'WALK-IN';

    let paymentTypeText = 'CASH'; 
    try {
      const { data: payments } = await supabase
        .from('billing_payments')
        .select('method, amount')
        .eq('billing_id', currentBill.id);
      
      if (payments && payments.length > 0) {
        if (payments.length === 1) {
          paymentTypeText = payments[0].method.toUpperCase();
        } else {
          paymentTypeText = payments
            .map((p: any) => `${p.method.toUpperCase()} (₹${p.amount})`)
            .join(' + ');
        }
      } else {
        paymentTypeText = currentBill.payment_method?.toUpperCase() || 'CASH';
      }
    } catch (error) {
      paymentTypeText = currentBill.payment_method?.toUpperCase() || 'CASH';
    }

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${currentBill.bill_id || (currentBill as any).bill_no || (currentBill as any).bill_number || 'N/A'}</title>
          <style>
            @page { margin: 1mm; size: 77mm 297mm; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0; 
              padding: 2px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            html, body { background: #fff; }
            .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
            .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .logo { width: 350px; height: auto; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div style="margin-top: 5px; font-weight: bold;">OUTPATIENT BILL</div>
          </div>
          
          <div style="margin-top: 10px;">
            <table class="table">
              <tr>
                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${currentBill.bill_id || (currentBill as any).bill_no || (currentBill as any).bill_number || 'N/A'}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patientUhid}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${registeredPatient.name || 'Unknown Patient'}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${(() => {
                  const raw = currentBill.bill_date || (currentBill as any).issued_at || (currentBill as any).created_at || new Date().toISOString();
                  const d = new Date(raw);
                  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-IN') + ' ' + new Date().toLocaleTimeString('en-IN');
                  return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN');
                })()}</td>
              </tr>
              <tr>
                <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${paymentTypeText}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Consulting Dr&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">Dr. ${form.consultingDoctorName || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="30%" class="items-8cm">S.No</td>
                <td width="40%" class="items-8cm">Service</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              <tr>
                <td class="items-8cm">1.</td>
                <td class="items-8cm">Consultation Fee</td>
                <td class="items-8cm text-center">1</td>
                <td class="items-8cm text-right">${(Number(currentBill.total_amount) || Number(currentBill.subtotal) || Number((currentBill as any).total) || 0).toFixed(0)}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${((Number(currentBill.total_amount) || Number(currentBill.subtotal) || Number((currentBill as any).total) || 0) - (Number(currentBill.discount_amount) || Number((currentBill as any).discount) || 0)).toFixed(0)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${printedDateTime}</span>
              <span>Authorized Sign</span>
            </div>
          </div>

          <script>
            (function() {
              function triggerPrint() {
                try {
                  window.focus();
                } catch (e) {}
                setTimeout(function() {
                  window.print();
                }, 250);
              }
              window.onafterprint = function() {
                try {
                  window.close();
                } catch (e) {}
              };
              if (document.readyState === 'complete' || document.readyState === 'interactive') {
                triggerPrint();
              } else {
                document.addEventListener('DOMContentLoaded', triggerPrint);
              }
            })();
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      if (duplicatePatient && showDupAlert)
        throw new Error('Duplicate patient detected. Dismiss the alert to continue or cancel.');
      if (!form.firstName.trim()) throw new Error('First name is required');
      if (!form.gender) throw new Error('Gender is required');
      if (!['male','female','other'].includes(form.gender.toLowerCase()))
        throw new Error('Invalid gender');
      if (!form.uhid.trim()) throw new Error('Patient ID is required');

      const {data:patient, error:pe} = await supabase.from('patients').insert({
        patient_id:          form.uhid,
        name:                `${form.firstName} ${form.lastName}`.trim(),
        date_of_birth:       form.dob||null,
        age:                 form.age ? parseInt(form.age) : null,
        gender:              form.gender.toLowerCase(),
        phone:               form.contactNo||null,
        email:               null,
        address:             form.address||null,
        city:                form.city||null,
        state:               form.state||null,
        pincode:             form.pincode||null,
        place:               form.place||null,
        emergency_contact_name:         null,
        emergency_contact_phone:        null,
        emergency_contact_relationship: form.relationship||null,
        blood_group:null, allergies:null, medical_history:null,
        admission_type:      'outpatient',
        primary_complaint:   form.primaryComplaint||null,
        admission_date:      form.registrationDate,
        admission_time:      form.registrationTime,
        staff_id:            null,
        registration_status: 'pending_vitals',
        status:              'active',
        consulting_doctor_id:   form.consultingDoctorId||null,
        consulting_doctor_name: form.consultingDoctorName||null,
        diagnosis:              form.diagnosis||null,
        consultation_fee:  form.consultationFee ? parseFloat(form.consultationFee) : null,
        op_card_amount:    form.opCardAmount    ? parseFloat(form.opCardAmount)    : null,
        total_amount:      form.totalAmount     ? parseFloat(form.totalAmount)     : null,
        payment_mode:      form.paymentMode||null,
      }).select().single();

      if (pe) throw new Error(`Database error: ${pe.message}`);

      const qr = await addToQueue(
        patient.id, form.registrationDate, parseInt(form.priority),
        form.primaryComplaint, undefined,
      );
      if (!qr.success||!qr.queueEntry) throw new Error('Failed to add to queue');

      setQueueNumber(qr.queueEntry.queue_number);
      setRegisteredPatient(patient);

      // ── Create Appointment & Bill if doctor is selected ──
      if (form.consultingDoctorId) {
        try {
          const { appointmentDate, appointmentTime } = getImmediateApptTime();
          const appointmentData: AppointmentData = {
            patientId: patient.id,
            doctorId: form.consultingDoctorId,
            appointmentDate,
            appointmentTime,
            durationMinutes: 30,
            type: 'consultation',
            isEmergency: false,
            chiefComplaint: form.primaryComplaint || 'OP Registration',
            bookingMethod: 'walk_in'
          };
          const appointment = await createAppointment(appointmentData, form.staffId || undefined, true);
          setCreatedAppointmentId(appointment.id);

          if (appointment.encounter?.id) {
            const bill = await createOPConsultationBill(
              patient.id,
              appointment.encounter.id,
              parseFloat(form.consultationFee || '0'),
              form.consultingDoctorName,
              form.staffId
            );
            setCurrentBill(bill);
            if (bill.total_amount > 0) setShowPaymentModal(true);
          }
        } catch (e) {
          console.error('Failed to create appointment/bill:', e);
          // Don't fail the whole registration if this fails
        }
      }

      setIsSuccess(true);
    } catch(err) {
      setError(`Registration failed: ${(err as Error).message}`);
    } finally { setLoading(false); }
  };

  // ── Blur check for duplicates ─────────────────────────────────────────────
  const onNameBlur = () => {
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (name && form.gender && form.dob) checkDuplicate(name, form.gender, form.dob);
  };

  // ── Shared class builders ─────────────────────────────────────────────────
  const field = (extra='') =>
    `w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white
     placeholder:text-slate-400 text-slate-800
     focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400
     transition-all duration-150 ${extra}`;
  const label = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

  // ── Attach data-fieldid to every registered element ───────────────────────
  // We use a wrapper so we can attach data-fieldid correctly
  const fieldRef = (id: string) => (el: HTMLElement|null) => {
    refs.current[id] = el;
    if (el) el.dataset.fieldid = id;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-100">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
            <CheckCircle className="h-11 w-11 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Patient Registered!</h2>
          <p className="text-slate-500 text-sm mb-5">Added to the vitals queue successfully.</p>
          {queueNumber && (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5 mb-5">
              <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide mb-1">Queue Token</p>
              <p className="text-5xl font-black text-orange-500">{queueNumber}</p>
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            {currentBill && (
              <>
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full py-2.5 px-4 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-100"
                >
                  <CreditCard className="h-4 w-4" /> Make Payment
                </button>
                <button
                  onClick={handlePrintThermalBill}
                  className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Printer className="h-4 w-4" /> Print Bill
                </button>
              </>
            )}
            <button onClick={() => setShowBarcodeModal(true)}
              className="w-full py-2.5 px-4 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
              <Printer className="h-4 w-4" /> Print Barcode
            </button>
            <button onClick={() => router.push('/outpatient?tab=queue')}
              className="w-full py-2.5 px-4 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
              Go to Queue
            </button>
            <button onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 text-orange-500 font-semibold hover:bg-orange-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4" /> Register Another Patient
            </button>
          </div>
        </div>
        {showBarcodeModal && registeredPatient && (
          <BarcodeModal patient={registeredPatient} onClose={() => setShowBarcodeModal(false)} />
        )}
        {showPaymentModal && currentBill && (
          <UniversalPaymentModal
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            bill={currentBill}
            onSuccess={() => {
              setShowPaymentModal(false);
              setRefreshBillTrigger(prev => prev + 1);
            }}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN FORM
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">

      {/* ════════ Collapsible Sidebar ════════ */}
      <aside className={`
        flex-shrink-0 bg-white border-r border-slate-200 shadow-sm
        flex flex-col transition-all duration-200
        ${sidebarOpen ? 'w-48' : 'w-12'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 bg-gradient-to-r from-orange-500 to-orange-600">
          {sidebarOpen && (
            <span className="text-white text-xs font-bold tracking-wide truncate">OP Registration</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white/80 hover:text-white ml-auto flex-shrink-0"
          >
            {sidebarOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 mt-1">
          {[
            {href:'/outpatient',          label:'Outpatient'},
            {href:'/outpatient?tab=queue',label:'Queue'},
            {href:'/outpatient/revisit',  label:'Revisit'},
            {href:'/dashboard',           label:'Dashboard'},
            {href:'/patients',            label:'Patients'},
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium truncate">
              {sidebarOpen ? item.label : '›'}
            </Link>
          ))}
        </nav>

        {!sidebarOpen || (
          <div className="p-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 text-center">Press <kbd className="bg-slate-100 px-1 rounded text-slate-500">Esc</kbd> to go back</p>
          </div>
        )}
      </aside>

      {/* ════════ Main area ════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* ── Top bar ── */}
        <header className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 shadow-lg">
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <User size={16} className="text-white"/>
              </div>
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">Quick Patient Registration</h1>
                <p className="text-orange-100 text-[11px]">Register now — vitals entered later</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-xs text-orange-100">
              <span className="flex items-center gap-1.5">
                <Hash size={12}/>
                <span className="font-mono font-bold text-white text-sm">{form.uhid||'—'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12}/>
                <strong className="text-white">{new Date(form.registrationDate).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={12}/>
                <strong className="text-white">{form.registrationTime}</strong>
              </span>
            </div>
          </div>
        </header>

        {/* ── Scrollable form ── */}
        <div className="flex-1 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            onKeyDown={handleFormKey}
            className="p-4 space-y-3 max-w-screen-2xl mx-auto"
          >

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
                <AlertCircle size={14} className="flex-shrink-0"/>
                <span>{error}</span>
              </div>
            )}

            {/* Duplicate alert */}
            {showDupAlert && duplicatePatient && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-500"/>
                <div className="flex-1">
                  <p className="font-semibold mb-1">
                    Duplicate detected — <span className="font-mono">{duplicatePatient.patient_id}</span> · {duplicatePatient.name}
                  </p>
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => { setShowDupAlert(false); setDuplicatePatient(null); }}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold">
                      Continue Anyway
                    </button>
                    <Link href="/outpatient"
                      className="px-2.5 py-1 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-semibold">
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════
                SECTION 1 — Registration Details
            ══════════════════════════════════════ */}
            <Card icon={<User size={14}/>} title="Registration Details">
              {/* Row 1 */}
              <div className="grid grid-cols-12 gap-3">
                {/* Reg Date */}
                <div className="col-span-2">
                  <label className={label}>Reg Date</label>
                  <input
                    ref={fieldRef('registrationDate') as any}
                    data-fieldid="registrationDate"
                    type="date"
                    name="registrationDate"
                    value={form.registrationDate}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* Reg Time */}
                <div className="col-span-1">
                  <label className={label}>Time</label>
                  <input
                    ref={fieldRef('registrationTime') as any}
                    data-fieldid="registrationTime"
                    type="time"
                    name="registrationTime"
                    value={form.registrationTime}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* UHID (read-only) */}
                <div className="col-span-2">
                  <label className={label}>UH ID</label>
                  <input
                    type="text"
                    value={form.uhid}
                    readOnly
                    className={field('bg-orange-50 border-orange-200 text-orange-700 font-mono font-bold cursor-default')}
                  />
                </div>
                {/* First Name */}
                <div className="col-span-2">
                  <label className={label}>First Name <span className="text-red-400">*</span></label>
                  <input
                    ref={fieldRef('firstName') as any}
                    data-fieldid="firstName"
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={form.firstName}
                    onChange={handleChange}
                    onBlur={onNameBlur}
                    className={field()}
                    required
                  />
                </div>
                {/* Last Name */}
                <div className="col-span-2">
                  <label className={label}>Last Name</label>
                  <input
                    ref={fieldRef('lastName') as any}
                    data-fieldid="lastName"
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={form.lastName}
                    onChange={handleChange}
                    onBlur={onNameBlur}
                    className={field()}
                  />
                </div>
                {/* Gender select */}
                <div className="col-span-2">
                  <label className={label}>Gender <span className="text-red-400">*</span></label>
                  <select
                    ref={fieldRef('gender') as any}
                    data-fieldid="gender"
                    name="gender"
                    value={form.gender}
                    onChange={handleChange}
                    className={field()}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                {/* Gender radio (visual aid) */}
                <div className="col-span-1 flex items-end pb-2 gap-3">
                  {['Male','Female'].map(g => (
                    <label key={g} className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                      <input type="radio" name="gender" value={g}
                        checked={form.gender===g} onChange={handleChange}
                        className="accent-orange-500"/>
                      {g[0]}
                    </label>
                  ))}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-12 gap-3 mt-3">
                {/* Age */}
                <div className="col-span-1">
                  <label className={label}>Age <span className="text-slate-400 font-normal normal-case">(Enter→auto DOB)</span></label>
                  <input
                    ref={fieldRef('age') as any}
                    data-fieldid="age"
                    type="number"
                    name="age"
                    placeholder="Yrs"
                    value={form.age}
                    onChange={handleChange}
                    min={0} max={150}
                    className={field()}
                  />
                </div>
                {/* DOB */}
                <div className="col-span-2">
                  <label className={label}>Date of Birth</label>
                  <input
                    ref={fieldRef('dob') as any}
                    data-fieldid="dob"
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* Contact */}
                <div className="col-span-2">
                  <label className={label}>Contact No</label>
                  <div className="relative">
                    <input
                      ref={fieldRef('contactNo') as any}
                      data-fieldid="contactNo"
                      type="tel"
                      name="contactNo"
                      placeholder="10-digit mobile"
                      value={form.contactNo}
                      onChange={handleChange}
                      className={field(contactExists ? 'border-red-300 bg-red-50' : '')}
                    />
                    {checkingContact && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400"/>}
                    {contactExists && !checkingContact && <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-400"/>}
                  </div>
                  {contactErr    && <p className="mt-1 text-[10px] text-red-500">{contactErr}</p>}
                  {contactExists && <p className="mt-1 text-[10px] text-red-500">Number already registered</p>}
                </div>
                {/* Alternate No */}
                <div className="col-span-2">
                  <label className={label}>Alternate No</label>
                  <input
                    ref={fieldRef('alternateNo') as any}
                    data-fieldid="alternateNo"
                    type="tel"
                    name="alternateNo"
                    placeholder="Alternate number"
                    value={form.alternateNo}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* Relationship */}
                <div className="col-span-2">
                  <label className={label}>Relationship</label>
                  <input
                    ref={fieldRef('relationship') as any}
                    data-fieldid="relationship"
                    type="text"
                    name="relationship"
                    placeholder="e.g. Father, Spouse"
                    value={form.relationship}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* Duplicate check indicator */}
                {checkingDuplicate && (
                  <div className="col-span-3 flex items-end pb-2">
                    <span className="text-[10px] text-amber-500 flex items-center gap-1">
                      <Loader2 size={11} className="animate-spin"/> Checking for duplicates…
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* ══════════════════════════════════════
                SECTION 2 — Address Details
            ══════════════════════════════════════ */}
            <Card icon={<MapPin size={14}/>} title="Address Details">
              <div className="grid grid-cols-12 gap-3">
                {/* Address textarea */}
                <div className="col-span-3">
                  <label className={label}>Address</label>
                  <textarea
                    ref={fieldRef('address') as any}
                    data-fieldid="address"
                    name="address"
                    rows={3}
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Street, locality, area…"
                    className={`${field()} resize-none`}
                  />
                </div>
                {/* City */}
                <div className="col-span-2">
                  <label className={label}>City</label>
                  <input
                    ref={fieldRef('city') as any}
                    data-fieldid="city"
                    type="text"
                    name="city"
                    placeholder="City"
                    value={form.city}
                    onChange={handleChange}
                    className={field()}
                  />
                </div>
                {/* State */}
                <div className="col-span-2">
                  <label className={label}>State</label>
                  <select
                    ref={fieldRef('state') as any}
                    data-fieldid="state"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className={field()}
                  >
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Pincode */}
                <div className="col-span-1">
                  <label className={label}>Pincode</label>
                  <input
                    ref={fieldRef('pincode') as any}
                    data-fieldid="pincode"
                    type="text"
                    name="pincode"
                    placeholder="6-digit"
                    value={form.pincode}
                    onChange={handleChange}
                    maxLength={6}
                    className={field()}
                  />
                </div>
                {/* Place with autocomplete */}
                <div className="col-span-2">
                  <label className={label}>Place / Area</label>
                  <div className="relative place-wrap">
                    <MapPin size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    <input
                      ref={fieldRef('place') as any}
                      data-fieldid="place"
                      type="text"
                      name="place"
                      placeholder="Place / Area"
                      value={form.place}
                      onChange={handleChange}
                      onKeyDown={handlePlaceKey}
                      onBlur={() => setTimeout(() => setShowPlaceSug(false), 200)}
                      onFocus={() => placeSuggestions.length > 0 && setShowPlaceSug(true)}
                      className={`${field('pl-8')} ${checkingDuplicate ? 'border-amber-300' : ''}`}
                    />
                    {showPlaceSug && placeSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-44 overflow-y-auto z-50">
                        {placeSuggestions.map((pl,i) => (
                          <button key={i} type="button"
                            onMouseDown={e => { e.preventDefault(); selectPlace(pl); }}
                            onMouseEnter={() => setSelectedSugIdx(i)}
                            className={`w-full px-3 py-2 text-left text-xs hover:bg-orange-50 border-b border-slate-100 last:border-0 flex items-center justify-between
                              ${i===selectedSugIdx?'bg-orange-50':''}`}>
                            <span>{pl}</span>
                            {existingPlaces.includes(pl) && (
                              <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">used</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Phone (display only) */}
                <div className="col-span-2">
                  <label className={label}>Phone</label>
                  <div className="relative">
                    <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="text" value={form.contactNo} readOnly
                      className={field('pl-8 bg-slate-50 text-slate-500 cursor-default')}/>
                  </div>
                </div>
              </div>
            </Card>

            {/* ══════════════════════════════════════
                SECTION 3 — Clinical + Billing (side by side)
            ══════════════════════════════════════ */}
            <div className="grid grid-cols-12 gap-3">

              {/* Clinical card */}
              <div className="col-span-5">
                <Card icon={<Stethoscope size={14}/>} title="Clinical Details">
                  <div className="space-y-3">
                    {/* Primary Complaint */}
                    <div>
                      <label className={label}>Primary Complaint / Reason for Visit</label>
                      <textarea
                        ref={fieldRef('primaryComplaint') as any}
                        data-fieldid="primaryComplaint"
                        name="primaryComplaint"
                        rows={3}
                        value={form.primaryComplaint}
                        onChange={handleChange}
                        placeholder="Symptoms or reason for visit…"
                        className={`${field()} resize-none`}
                      />
                    </div>
                    {/* Priority */}
                    <div>
                      <label className={label}>Priority Level</label>
                      <select
                        ref={fieldRef('priority') as any}
                        data-fieldid="priority"
                        name="priority"
                        value={form.priority}
                        onChange={handleChange}
                        className={field()}
                      >
                        <option value="0">Normal</option>
                        <option value="1">High Priority</option>
                        <option value="2">Urgent</option>
                      </select>
                    </div>
                    {/* Consulting Doctor */}
                    <div>
                      <label className={label}>Consulting Doctor</label>
                      <select
                        ref={fieldRef('consultingDoctorId') as any}
                        data-fieldid="consultingDoctorId"
                        value={form.consultingDoctorId}
                        onChange={e => handleDoctorSelect(e.target.value)}
                        className={field()}
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map(doc => (
                          <option key={doc.id} value={doc.id}>
                            Dr. {doc.users?.name||'Unknown'}
                            {doc.specialization ? ` · ${doc.specialization}` : ''}
                            {doc.consultation_fee ? ` (₹${doc.consultation_fee})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {/* Diagnosis */}
                    <div>
                      <label className={label}>Diagnosis / Complaint</label>
                      <input
                        ref={fieldRef('diagnosis') as any}
                        data-fieldid="diagnosis"
                        type="text"
                        name="diagnosis"
                        value={form.diagnosis}
                        onChange={handleChange}
                        placeholder="Brief diagnosis"
                        className={field()}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Billing card */}
              <div className="col-span-7">
                <Card icon={<IndianRupee size={14}/>} title="Billing Information">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Consultation Fee */}
                    <div>
                      <label className={label}>Consultation Fee</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          ref={fieldRef('consultationFee') as any}
                          data-fieldid="consultationFee"
                          type="number"
                          name="consultationFee"
                          value={form.consultationFee}
                          onChange={handleChange}
                          placeholder="0"
                          className={field('pl-6')}
                        />
                      </div>
                    </div>
                    {/* OP Card */}
                    <div>
                      <label className={label}>OP Card Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                        <input
                          ref={fieldRef('opCardAmount') as any}
                          data-fieldid="opCardAmount"
                          type="number"
                          name="opCardAmount"
                          value={form.opCardAmount}
                          onChange={handleChange}
                          placeholder="0"
                          className={field('pl-6')}
                        />
                      </div>
                    </div>
                    {/* Total (readonly) */}
                    <div>
                      <label className={label}>Total Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 text-xs font-bold">₹</span>
                        <input
                          type="text"
                          value={form.totalAmount||'0'}
                          readOnly
                          className={field('pl-6 bg-green-50 border-green-200 text-green-700 font-bold cursor-default')}
                        />
                      </div>
                    </div>
                    {/* Payment Mode */}
                    <div>
                      <label className={label}>Payment Mode</label>
                      <select
                        ref={fieldRef('paymentMode') as any}
                        data-fieldid="paymentMode"
                        name="paymentMode"
                        value={form.paymentMode}
                        onChange={handleChange}
                        className={field()}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Fee">Fee</option>
                        <option value="Camp">Camp</option>
                      </select>
                    </div>
                  </div>

                  {/* Staff */}
                  <div className="mt-3">
                    <label className={label}>Registered By (Optional)</label>
                    <StaffSelect
                      value={form.staffId||''}
                      onChange={staffId => setForm(p => ({...p, staffId}))}
                      label=""
                    />
                  </div>
                </Card>
              </div>
            </div>

            {/* ── Action bar ── */}
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
              <span className="text-[11px] text-slate-400">
                <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono text-[10px]">Esc</kbd>
                {' '}to go back &nbsp;·&nbsp;
                <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono text-[10px]">Enter</kbd>
                {' '}to advance · auto-submits on last field
              </span>
              <button
                ref={submitRef}
                type="submit"
                data-fieldid="submitBtn"
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white px-7 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-orange-200 disabled:shadow-none">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin"/><span>Registering…</span></>
                  : <><Save className="h-4 w-4"/><span>Register &amp; Add to Queue</span></>
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

// ── Reusable card component ───────────────────────────────────────────────
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <span className="text-orange-500">{icon}</span>
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{title}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
