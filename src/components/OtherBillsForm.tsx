'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search, Trash2 } from 'lucide-react';
import { 
  createOtherBill, 
  CHARGE_CATEGORIES,
  getOtherBillChargeCategories,
  createOtherBillChargeCategory,
  type OtherBillFormData,
  type OtherBillItem,
  type OtherBillChargeCategory,
  type ChargeCategory,
  type PatientType 
} from '../lib/otherBillsService';
import { supabase } from '../lib/supabase';
import { getAllDoctorsSimple, type Doctor } from '../lib/doctorService';
import { getStaffMembers, type StaffMember } from '../lib/staffService';

interface OtherBillsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Partial<OtherBillFormData>;
}

interface PatientSearchResult {
  id: string;
  patient_id: string;
  name: string;
  phone: string;
}

export default function OtherBillsForm({ isOpen, onClose, onSuccess, initialData }: OtherBillsFormProps) {
  const [formData, setFormData] = useState<OtherBillFormData>({
    patient_type: 'General',
    patient_name: '',
    patient_phone: '',
    items: [],
    reference_number: '',
    remarks: '',
    ...initialData,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientSearchResult[]>([]);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [chargeCategories, setChargeCategories] = useState<any[]>(CHARGE_CATEGORIES);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  const [calculatedAmounts, setCalculatedAmounts] = useState({
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    (formData.items || []).forEach((item) => {
      const quantity = item.quantity || 1;
      const unitPrice = item.unit_price || 0;
      const discountPercent = item.discount_percent || 0;
      const taxPercent = item.tax_percent || 0;

      const itemSubtotal = quantity * unitPrice;
      const itemDiscountAmount = (itemSubtotal * discountPercent) / 100;
      const afterDiscount = itemSubtotal - itemDiscountAmount;
      const itemTaxAmount = (afterDiscount * taxPercent) / 100;
      const itemTotalAmount = afterDiscount + itemTaxAmount;

      subtotal += itemSubtotal;
      discountAmount += itemDiscountAmount;
      taxAmount += itemTaxAmount;
      totalAmount += itemTotalAmount;
    });

    setCalculatedAmounts({ subtotal, discountAmount, taxAmount, totalAmount });
  }, [formData.items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [cats, docs, staff] = await Promise.all([
          getOtherBillChargeCategories(),
          getAllDoctorsSimple(),
          getStaffMembers({ is_active: true })
        ]);
        if (!mounted) return;
        setChargeCategories(cats);
        setDoctors(docs);
        setStaffMembers(staff);
      } catch (err) {
        console.warn('Failed to load initial data for bill form:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, patient_id, name, phone')
        .or(`name.ilike.%${query}%,patient_id.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setPatientResults(data || []);
    } catch (err) {
      console.error('Error searching patients:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (patientSearch) {
        searchPatients(patientSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  const selectPatient = (patient: PatientSearchResult) => {
    setFormData({
      ...formData,
      patient_id: patient.id,
      patient_name: patient.name,
      patient_phone: patient.phone,
    });
    setPatientSearch('');
    setShowPatientSearch(false);
    setPatientResults([]);
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          charge_category: 'nursing_charges',
          charge_description: '',
          quantity: 1,
          unit_price: 0,
          discount_percent: 0,
          tax_percent: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => {
      if (!prev.items || prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  };

  const updateItem = (index: number, updates: Partial<OtherBillItem>) => {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).map((item, i) => (i === index ? { ...item, ...updates } : item)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await createOtherBill(formData, user?.id);
      
      onSuccess?.();
      onClose();
      
      setFormData({
        patient_type: 'General',
        patient_name: '',
        patient_phone: '',
        items: [],
        reference_number: '',
        remarks: '',
      });
    } catch (err: any) {
      console.error('Error creating other bill:', err);
      setError(err.message || 'Failed to create bill');
    } finally {
      setLoading(false);
    }
  };

  const [serviceSearch, setServiceSearch] = useState('');
  const serviceSearchRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const unitPriceRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const taxRef = useRef<HTMLInputElement>(null);

  const [pendingItem, setPendingItem] = useState<OtherBillItem>({
    charge_category: '',
    charge_description: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    tax_percent: 0,
  });

  const handleAddNewCategory = async () => {
    if (!serviceSearch.trim()) return;
    setLoading(true);
    try {
      const newCat = await createOtherBillChargeCategory(serviceSearch.trim());
      setChargeCategories(prev => [...prev, newCat]);
      handleCategorySelect(newCat);
      setServiceSearch('');
    } catch (err: any) {
      console.error('Error adding category:', err);
      setError(err.message || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = chargeCategories.filter(cat => 
    cat.label.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    cat.description.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  const hasExactMatch = chargeCategories.some(cat => 
    cat.label.toLowerCase() === serviceSearch.toLowerCase()
  );

  const handleCategorySelect = (category: any) => {
    setPendingItem({
      ...pendingItem,
      charge_category: category.value as ChargeCategory,
      charge_description: category.label,
    });
    setTimeout(() => descriptionRef.current?.focus(), 100);
  };

  const handleAddToBill = () => {
    if (!pendingItem.charge_category || !pendingItem.charge_description) {
      setError('Please select a service and provide a description');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), { ...pendingItem }]
    }));
    // Reset pending item for next entry
    setPendingItem({
      charge_category: '',
      charge_description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_percent: 0,
    });
    setError(null);
    setTimeout(() => serviceSearchRef.current?.focus(), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRef && nextRef.current) {
        nextRef.current.focus();
        nextRef.current.select(); // Highlight text for easier editing
      } else {
        handleAddToBill();
      }
    }
  };

  const pendingItemTotal = (() => {
    const itemSubtotal = (pendingItem.quantity || 0) * (pendingItem.unit_price || 0);
    const discount = (itemSubtotal * (pendingItem.discount_percent || 0)) / 100;
    const afterDiscount = itemSubtotal - discount;
    const tax = (afterDiscount * (pendingItem.tax_percent || 0)) / 100;
    return afterDiscount + tax;
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-blue-600 pl-4">Create Other Bill</h2>
              <p className="text-gray-500 text-sm mt-1 ml-4">Fill in the details to generate a new service bill</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
            >
              <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
                <div className="p-1 bg-red-100 rounded-full">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {/* Patient Info Section - Compact Grid */}
            <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-4">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Patient Type *
                  </label>
                  <select
                    value={formData.patient_type}
                    onChange={(e) => setFormData({ ...formData, patient_type: e.target.value as PatientType })}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    required
                  >
                    <option value="IP">Inpatient (IP)</option>
                    <option value="OP">Outpatient (OP)</option>
                    <option value="Emergency">Emergency</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Search Patient
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setShowPatientSearch(true);
                      }}
                      onFocus={() => setShowPatientSearch(true)}
                      placeholder="Name, ID, or Phone"
                      className="w-full px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    />
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {showPatientSearch && patientResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto py-2">
                      {patientResults.map((patient) => (
                        <button
                          key={patient.id}
                          type="button"
                          onClick={() => selectPatient(patient)}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0 transition-colors"
                        >
                          <div className="font-semibold text-gray-900">{patient.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            ID: {patient.patient_id} • {patient.phone}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    placeholder="Enter Name"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Patient Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.patient_phone}
                    onChange={(e) => setFormData({ ...formData, patient_phone: e.target.value })}
                    placeholder="Enter Phone"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Doctor Name
                  </label>
                  <select
                    value={formData.doctor_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedDoc = doctors.find(d => d.id === selectedId);
                      setFormData({ 
                        ...formData, 
                        doctor_id: selectedId, 
                        doctor_name: selectedDoc?.user?.name || '' 
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  >
                    <option value="">Select Doctor</option>
                    <option value="self">Self</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.user?.name || 'Unnamed Doctor'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
                    Staff Name
                  </label>
                  <select
                    value={formData.staff_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedStaff = staffMembers.find(s => s.id === selectedId);
                      setFormData({ 
                        ...formData, 
                        staff_id: selectedId, 
                        staff_name: selectedStaff?.name || '' 
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  >
                    <option value="">Select Staff</option>
                    {staffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Items Section - Split Layout */}
            <div className="flex flex-col lg:flex-row gap-6 h-[550px]">
              {/* Left Column: Available Services & Detail Entry */}
              <div className="w-full lg:w-1/3 border border-gray-200 rounded-2xl flex flex-col bg-gray-50 shadow-inner overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-white">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Available Services</h3>
                  <div className="relative">
                    <input
                      ref={serviceSearchRef}
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      placeholder="Search or add new services..."
                      className="w-full px-4 py-2 pl-9 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                {/* Service Selection List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 border-b border-gray-200">
                  {serviceSearch && !hasExactMatch && (
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="w-full group text-left p-3 rounded-xl border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-sm text-blue-700">Add New: "{serviceSearch}"</div>
                        <div className="text-[10px] text-blue-500 mt-0.5">Create this as a new billing category</div>
                      </div>
                      <Plus className="w-4 h-4 text-blue-600" />
                    </button>
                  )}

                  {filteredCategories.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleCategorySelect(category)}
                      className={`w-full group text-left p-3 rounded-xl border transition-all duration-200 shadow-sm flex items-center justify-between ${
                        pendingItem.charge_category === category.value 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md transform scale-[1.02]' 
                        : 'bg-white border-transparent hover:bg-gray-100 hover:border-gray-200 text-gray-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm transition-colors">{category.label}</div>
                        <div className={`text-[10px] mt-0.5 line-clamp-1 transition-colors ${
                          pendingItem.charge_category === category.value ? 'text-blue-100' : 'text-gray-500'
                        }`}>{category.description}</div>
                      </div>
                      <Plus className={`w-4 h-4 transition-colors ${
                        pendingItem.charge_category === category.value ? 'text-white' : 'text-blue-500'
                      }`} />
                    </button>
                  ))}
                </div>

                {/* Detail Entry Section */}
                <div className="p-5 bg-white space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                      <input
                        ref={descriptionRef}
                        type="text"
                        value={pendingItem.charge_description}
                        onChange={(e) => setPendingItem({...pendingItem, charge_description: e.target.value})}
                        onKeyDown={(e) => handleKeyDown(e, qtyRef)}
                        placeholder="Detail description..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Qty</label>
                      <input
                        ref={qtyRef}
                        type="number"
                        value={pendingItem.quantity}
                        onChange={(e) => setPendingItem({...pendingItem, quantity: parseFloat(e.target.value) || 0})}
                        onKeyDown={(e) => handleKeyDown(e, unitPriceRef)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unit Price</label>
                      <input
                        ref={unitPriceRef}
                        type="number"
                        value={pendingItem.unit_price}
                        onChange={(e) => setPendingItem({...pendingItem, unit_price: parseFloat(e.target.value) || 0})}
                        onKeyDown={(e) => handleKeyDown(e, discountRef)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Disc%</label>
                      <input
                        ref={discountRef}
                        type="number"
                        value={pendingItem.discount_percent}
                        onChange={(e) => setPendingItem({...pendingItem, discount_percent: parseFloat(e.target.value) || 0})}
                        onKeyDown={(e) => handleKeyDown(e, taxRef)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tax%</label>
                      <input
                        ref={taxRef}
                        type="number"
                        value={pendingItem.tax_percent}
                        onChange={(e) => setPendingItem({...pendingItem, tax_percent: parseFloat(e.target.value) || 0})}
                        onKeyDown={(e) => handleKeyDown(e)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimated Total</span>
                      <div className="text-lg font-bold text-blue-600">₹{pendingItemTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddToBill}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-sm shadow-md"
                    >
                      Add (Enter)
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Bill Items (Selected items display) */}
              <div className="w-full lg:w-2/3 border border-gray-200 rounded-2xl flex flex-col bg-white overflow-hidden shadow-inner">
                <div className="bg-gray-800 text-white px-4 py-3 border-b border-gray-700">
                  <div className="grid grid-cols-[1fr_1.5fr_0.5fr_0.8fr_0.6fr_0.6fr_0.8fr_0.3fr] gap-4 items-center px-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Category</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80">Description</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-center">Qty</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-right">Unit Price</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-center">Disc%</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-center">Tax%</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-right">Total</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-center"></span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50/30">
                  {(formData.items || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                      <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                        <Plus className="w-8 h-8 text-gray-200" />
                      </div>
                      <p className="font-medium">No items added yet</p>
                      <p className="text-xs mt-1">Select and configure a service on the left</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {(formData.items || []).map((item, index) => {
                        const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
                        const discount = (itemSubtotal * (item.discount_percent || 0)) / 100;
                        const afterDiscount = itemSubtotal - discount;
                        const tax = (afterDiscount * (item.tax_percent || 0)) / 100;
                        const itemTotal = afterDiscount + tax;

                        return (
                          <div key={index} className="grid grid-cols-[1fr_1.5fr_0.5fr_0.8fr_0.6fr_0.6fr_0.8fr_0.3fr] gap-3 items-center bg-white border border-gray-100 p-2.5 rounded-xl shadow-sm hover:border-blue-200 transition-all">
                            {/* Category Label */}
                            <div className="text-xs font-semibold text-gray-700 truncate">
                              {chargeCategories.find(c => c.value === item.charge_category)?.label || item.charge_category}
                            </div>

                            {/* Description Input */}
                            <input
                              type="text"
                              value={item.charge_description}
                              onChange={(e) => updateItem(index, { charge_description: e.target.value })}
                              className="w-full text-xs border-0 focus:ring-0 p-0 text-gray-600 bg-transparent"
                            />

                            {/* Qty Input */}
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                              className="w-full text-xs text-center border-0 focus:ring-0 p-0"
                            />

                            {/* Unit Price Input */}
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                              className="w-full text-xs text-right border-0 focus:ring-0 p-0"
                            />

                            {/* Disc % */}
                            <input
                              type="number"
                              value={item.discount_percent || 0}
                              onChange={(e) => updateItem(index, { discount_percent: parseFloat(e.target.value) || 0 })}
                              className="w-full text-xs text-center border-0 focus:ring-0 p-0 text-red-500"
                            />

                            {/* Tax % */}
                            <input
                              type="number"
                              value={item.tax_percent || 0}
                              onChange={(e) => updateItem(index, { tax_percent: parseFloat(e.target.value) || 0 })}
                              className="w-full text-xs text-center border-0 focus:ring-0 p-0 text-blue-500"
                            />

                            {/* Total (Read-only) */}
                            <div className="text-xs font-bold text-gray-900 text-right pr-2">
                              ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Section: Notes & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pb-4">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Enter Order # or Reference"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">
                    Bill Remarks
                  </label>
                  <textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={2}
                    placeholder="Add any internal notes..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm resize-none"
                  />
                </div>
              </div>

              <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 blur-[80px] opacity-20 -mr-16 -mt-16"></div>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                  Bill Summary
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-gray-400">
                    <span className="text-sm">Items Subtotal</span>
                    <span className="font-medium text-white">₹{calculatedAmounts.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {calculatedAmounts.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-red-400">
                      <span className="text-sm">Total Discount</span>
                      <span className="font-medium">-₹{calculatedAmounts.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  
                  {calculatedAmounts.taxAmount > 0 && (
                    <div className="flex justify-between items-center text-blue-400">
                      <span className="text-sm">Tax Amount</span>
                      <span className="font-medium">₹{calculatedAmounts.taxAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-800 flex justify-between items-end">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-4xl font-extrabold text-blue-400">
                        ₹{calculatedAmounts.totalAmount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-500 italic">Inclusive of all taxes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-white border-t border-gray-100 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-500 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading || (formData.items || []).length === 0}
              className="flex-1 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Generate Bill & Confirm'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
