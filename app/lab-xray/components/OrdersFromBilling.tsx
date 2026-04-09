'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Paperclip, Printer, RefreshCw, Search, Trash2, Upload, X, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import LabOrderFileUpload from './LabOrderFileUpload';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import type { PaymentRecord } from '../../../src/lib/universalPaymentService';

interface OrdersFromBillingProps {
  items: any[];
  onRefresh?: () => void;
  searchTerm?: string;
  statusFilter?: string;
  completionFilter?: 'all' | 'pending' | 'completed';
}

type PaymentStatus = 'pending' | 'partial' | 'paid';

type AttachmentMap = Record<string, any[]>;

export default function OrdersFromBilling({ items, onRefresh, searchTerm: globalSearchTerm, statusFilter: globalStatusFilter, completionFilter }: OrdersFromBillingProps) {
  console.log('OrdersFromBilling component - items received:', items);
  console.log('OrdersFromBilling component - items length:', items?.length);
  
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<'all' | PaymentStatus>('all');

  const searchTerm = globalSearchTerm !== undefined ? globalSearchTerm : localSearchTerm;
  const statusFilter = globalStatusFilter !== undefined ? (globalStatusFilter as any) : localStatusFilter;
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [attachmentsByBillId, setAttachmentsByBillId] = useState<AttachmentMap>({});
  const [uploadingBillId, setUploadingBillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [dragOverBillId, setDragOverBillId] = useState<string | null>(null);
  const [lastDeletedAttachmentId, setLastDeletedAttachmentId] = useState<string | null>(null);

  const getBillingStatus = (bill: any): PaymentStatus => {
    const status = String(bill?.payment_status || '').toLowerCase();
    if (status === 'paid' || status === 'partial' || status === 'pending') return status;
    return 'pending';
  };

  const toPaymentRecord = (bill: any): PaymentRecord => {
    const billTotal = Number(bill.total ?? bill.subtotal ?? 0);
    const tax = Number(bill.tax ?? 0);
    const discount = Number(bill.discount ?? 0);
    const subtotal = Number(bill.subtotal ?? 0);
    const itemsForModal = (bill.items || []).map((it: any) => ({
      service_name: it.description,
      quantity: Number(it.qty) || 1,
      unit_rate: Number(it.unit_amount) || 0,
      total_amount: Number(it.total_amount) || 0,
      item_type: 'service' as const,
      reference_id: it.ref_id || null,
    }));

    const amount_paid = Number(bill.amount_paid || bill.paid_amount || 0);
    const balance_due = Number(bill.balance_due ?? (billTotal - amount_paid));

    return {
      id: bill.id,
      bill_id: bill.bill_no ?? bill.bill_number ?? bill.id,
      patient_id: bill.patient_id,
      bill_date: bill.issued_at ? String(bill.issued_at).split('T')[0] : new Date().toISOString().split('T')[0],
      items: itemsForModal,
      subtotal,
      tax_amount: tax,
      discount_amount: discount,
      total_amount: billTotal,
      amount_paid: amount_paid,
      balance_due: balance_due,
      payment_status: bill.payment_status || 'pending',
      payment_method: bill.payment_method || undefined,
      payment_date: bill.issued_at || undefined,
      created_at: bill.created_at || new Date().toISOString(),
      updated_at: bill.updated_at || new Date().toISOString(),
    };
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBillTypeColor = (billType: string) => {
    switch (billType?.toLowerCase()) {
      case 'lab':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'radiology':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'scan':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBillTypeIcon = (billType: string) => {
    switch (billType?.toLowerCase()) {
      case 'lab':
        return '🧪';
      case 'radiology':
        return '📷';
      case 'scan':
        return '📡';
      default:
        return '📄';
    }
  };
 
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent, bill: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragOverBillId(null);

    const files = e.dataTransfer.files;
    if (files && files.length) {
      void handleUpload(bill, files);
    }
  };

  const getAppUserId = async (): Promise<string> => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error('User not authenticated');
    }

    const { data: appUser, error: appUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', authData.user.id)
      .maybeSingle();

    if (appUserError) throw appUserError;
    if (!appUser?.id) throw new Error('No user profile found');
    return appUser.id;
  };

  const fetchAttachments = async (billIds: string[]) => {
    if (!billIds.length) {
      console.log('fetchAttachments: No bill IDs provided');
      setAttachmentsByBillId({});
      return;
    }

    console.log('fetchAttachments: Querying for bill IDs:', billIds);
    const { data, error: fetchError } = await supabase
      .from('lab_xray_attachments')
      .select('*')
      .in('billing_id', billIds)
      .order('uploaded_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching attachments:', fetchError);
      setAttachmentsByBillId({});
      return;
    }

    console.log('fetchAttachments: Raw data from Supabase:', data);
    const byBill: AttachmentMap = {};
    (data || []).forEach((row: any) => {
      const id = row.billing_id;
      if (!id) return;
      byBill[id] = byBill[id] || [];
      byBill[id].push(row);
    });
    console.log('fetchAttachments: Processed byBill map:', byBill);
    setAttachmentsByBillId(byBill);
  };

  const handleDeleteAttachment = async (attachment: any) => {
    console.log('Attempting to delete attachment:', attachment);
    
    if (!window.confirm(`Are you sure you want to delete "${attachment.file_name}"?`)) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting deletion process for attachment:', attachment.id);
      
      // Delete from Supabase Storage first
      if (attachment.file_path) {
        console.log('Deleting from storage:', attachment.file_path);
        const { error: storageError } = await supabase.storage
          .from('lab-xray-attachments')
          .remove([attachment.file_path]);
        
        if (storageError) {
          console.warn('Failed to delete from storage:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('Successfully deleted from storage');
        }
      }

      // Delete from database
      console.log('Deleting from database:', attachment.id);
      const { error: dbError, data } = await supabase
        .from('lab_xray_attachments')
        .delete()
        .eq('id', attachment.id)
        .select();

      if (dbError) {
        console.error('Database deletion error:', dbError);
        throw dbError;
      }

      if (!data || data.length === 0) {
        throw new Error('Not permitted to delete this attachment (permission policy)');
      }

      console.log('Successfully deleted from database:', data);

      // Immediately update local state to remove the deleted attachment
      setAttachmentsByBillId(prev => {
        const newAttachments = { ...prev };
        if (newAttachments[attachment.billing_id]) {
          newAttachments[attachment.billing_id] = newAttachments[attachment.billing_id].filter(
            (att: any) => att.id !== attachment.id
          );
          // If no attachments left for this bill, remove the entry
          if (newAttachments[attachment.billing_id].length === 0) {
            delete newAttachments[attachment.billing_id];
          }
        }
        console.log('Updated local attachments state:', newAttachments);
        return newAttachments;
      });
      
      // Track this attachment as recently deleted
      setLastDeletedAttachmentId(attachment.id);
      
      // Show success message immediately
      alert('Attachment deleted successfully!');

      // Refetch from DB to ensure refresh shows correct data
      const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
      await fetchAttachments(billIds);
    } catch (e: any) {
      console.error('Delete attachment error:', e);
      setError(e?.message || 'Failed to delete attachment');
      alert(`Failed to delete attachment: ${e?.message || 'Unknown error'}`);
    }
  };

  const filteredBills = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (items || []).filter((bill: any) => {
      const billNo = String(bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8)).toLowerCase();
      const patientName = String(bill.patient?.name || '').toLowerCase();
      const patientId = String(bill.patient?.patient_id || '').toLowerCase();

      const matchesSearch = !term || billNo.includes(term) || patientName.includes(term) || patientId.includes(term);
      const matchesStatus = statusFilter === 'all' || getBillingStatus(bill) === statusFilter;
      
      let matchesCompletion = true;
      if (completionFilter && completionFilter !== 'all') {
        const paymentStatus = String(bill.payment_status || 'pending').toLowerCase();
        if (completionFilter === 'completed') {
          matchesCompletion = paymentStatus === 'paid';
        } else if (completionFilter === 'pending') {
          matchesCompletion = paymentStatus === 'pending' || paymentStatus === 'partial';
        }
      }
      
      return matchesSearch && matchesStatus && matchesCompletion;
    });
  }, [items, searchTerm, statusFilter, completionFilter]);

  useEffect(() => {
    const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
    console.log('Loading attachments for bill IDs:', billIds);
    console.log('Items received:', items);
    
    if (!billIds.length) {
      console.log('No bill IDs found, clearing attachments');
      setAttachmentsByBillId({});
      return;
    }

    void fetchAttachments(billIds);
  }, [items]);

  const openViewBill = async (bill: any) => {
    setSelectedBill(bill);
    setShowViewModal(true);
    setViewLoading(true);
    setError(null);

    try {
      if (!Array.isArray(bill.items) || bill.items.length === 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('billing_item')
          .select('*')
          .eq('billing_id', bill.id)
          .order('created_at', { ascending: true });

        if (itemsError) throw itemsError;
        setSelectedBill({ ...bill, items: itemsData || [] });
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load bill items');
    } finally {
      setViewLoading(false);
    }
  };

  const handleUpload = async (bill: any, files: FileList) => {
    if (!files?.length) return;
    setUploadingBillId(bill.id);
    setError(null);

    try {
      const uploadedBy = await getAppUserId();
      const patientId: string | undefined = bill.patient?.id;
      if (!patientId) throw new Error('Missing patient on bill');

      const billNo = String(bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8));
      const testName = (bill.items || []).map((it: any) => it.description).filter(Boolean).join(', ') || `Bill ${billNo}`;
      const testType = String(bill.bill_type || 'lab');

      // Extract lab order IDs from billing items (ref_id field)
      const labOrderIds: string[] = [];
      if (bill.items && Array.isArray(bill.items)) {
        for (const item of bill.items) {
          if (item.ref_id) {
            labOrderIds.push(item.ref_id);
          }
        }
      }

      console.log('OrdersFromBilling: Found lab order IDs from billing items:', labOrderIds);

      // Use the first lab order ID if available, or try to find one
      let primaryLabOrderId: string | null = labOrderIds.length > 0 ? labOrderIds[0] : null;

      if (!primaryLabOrderId) {
        // Fallback: try to find associated lab orders for this billing
        try {
          const { data: labOrders } = await supabase
            .from('lab_test_orders')
            .select('id')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (labOrders && labOrders.length > 0) {
            primaryLabOrderId = labOrders[0].id;
          }
        } catch (err) {
          console.warn('Could not fetch lab order ID:', err);
        }
      }

      console.log('OrdersFromBilling: Using primary lab order ID:', primaryLabOrderId);

      for (const file of Array.from(files)) {
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const ts = Date.now();
        const rand = Math.random().toString(36).slice(2);
        const filePath = `billing/${bill.id}/${ts}-${rand}.${ext}`;

        console.log('OrdersFromBilling: Uploading file to storage:', filePath);

        const { error: uploadError } = await supabase.storage
          .from('lab-xray-attachments')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        
        if (uploadError) {
          console.error('OrdersFromBilling: Storage upload error:', uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from('lab-xray-attachments')
          .getPublicUrl(filePath);

        console.log('OrdersFromBilling: File uploaded, public URL:', urlData?.publicUrl);

        const attachmentData = {
          patient_id: patientId,
          billing_id: bill.id,
          lab_order_id: primaryLabOrderId,
          test_name: testName,
          test_type: testType as 'lab' | 'radiology',
          file_name: file.name,
          file_path: filePath,
          file_type: file.type || 'application/pdf',
          file_size: file.size,
          file_url: urlData?.publicUrl || null,
          uploaded_by: uploadedBy,
        };

        console.log('OrdersFromBilling: Inserting attachment record:', attachmentData);

        const { error: insertError } = await supabase
          .from('lab_xray_attachments')
          .insert(attachmentData);
        
        if (insertError) {
          console.error('OrdersFromBilling: Database insert error:', insertError);
          throw insertError;
        }

        console.log('OrdersFromBilling: Attachment record inserted successfully');
      }

      console.log('OrdersFromBilling: All files uploaded, refreshing attachments...');
      
      // Add a small delay to ensure database processing is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // First refresh attachments for all bills
      const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
      await fetchAttachments(billIds);
      
      // Then do a second refresh specifically for this bill to ensure it's updated
      console.log('OrdersFromBilling: Doing second refresh for specific bill:', bill.id);
      await fetchAttachments([bill.id]);
      
      if (onRefresh) onRefresh();
      
      console.log('OrdersFromBilling: Upload complete!');
    } catch (e: any) {
      console.error('OrdersFromBilling: Upload failed:', e);
      setError(e?.message || 'Upload failed');
    } finally {
      setUploadingBillId(null);
    }
  };

  const escapeHtml = (value: any) => {
    const str = String(value ?? '');
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const formatPrintedDateTime = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${mi}:${ss}`;
  };

  const formatBillDateTime = (date: Date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[date.getMonth()];
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${dd}-${mon}-${yyyy} ${hh}:${mi}`;
  };

  const handleThermalPrint = (bill: any) => {
    const now = new Date();
    const printedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const printedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const billDate = bill.created_at ? new Date(bill.created_at) : now;
    const billDateStr = formatBillDateTime(billDate);

    const billNumber = bill.bill_no || bill.bill_number || String(bill.id || '').slice(0, 8).toUpperCase();
    const patientUhid = bill.patient?.patient_id || bill.patient?.uhid || bill.patient_id || 'WALK-IN';
    const patientName = bill.patient?.name || 'Unknown Patient';
    const currentStatus = getBillingStatus(bill);
    const displayPaymentMethod = bill.payment_method;
    const salesType = currentStatus === 'paid' ? String(displayPaymentMethod || 'cash').toUpperCase() : 'CREDIT';

    const patientDob = bill.patient?.date_of_birth;
    let patientAge = 'N/A';
    if (patientDob) {
      try {
        const birthDate = new Date(patientDob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        patientAge = age.toString();
      } catch (e) {
        console.warn('Error calculating age:', e);
      }
    }
    const patientGender = bill.patient?.gender || 'N/A';

    const amount = Number(bill.total ?? bill.subtotal ?? 0);
    const discountAmount = Number(bill.discount ?? 0);
    const taxableAmount = amount - discountAmount;

    // Use bill.items for line items
    const lineItems = Array.isArray(bill.items) ? bill.items : [];
    let itemsHtml = lineItems
      .map((it: any, idx: number) => {
        const qty = Number(it.qty) || 1;
        const total = Number(it.total_amount) || Number(it.amount) || Number(it.rate) || 0;
        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-left font-bold uppercase">${escapeHtml(it.description || it.test_name || it.service_name || it.item_name || 'Service')}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">₹${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');
    
    // Add spacer row
    itemsHtml += '<tr><td style="height: 10mm;"></td><td></td><td></td><td></td></tr>';

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${escapeHtml(billNumber)}</title>
          <style>
            @page { margin: 0; size: 72mm auto; }
            body { 
              margin: 0; padding: 2mm; 
              font-family: 'Verdana', sans-serif; 
              width: 72mm; 
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .container { border: 1px solid #000; padding: 1mm; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
            .logo { width: 50mm; height: auto; margin-bottom: 1mm; }
            .hospital-name { font-size: 15px; font-weight: bold; display: block; }
            .hospital-addr { font-size: 10px; display: block; }
            .hospital-contact { font-size: 10px; display: block; }
            .gst-no { font-size: 10px; font-weight: bold; margin-top: 1mm; display: block; }
            
            .invoice-title { 
                text-align: center; 
                font-size: 12px; 
                font-weight: bold; 
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 1mm 0;
                margin-bottom: 1mm;
                letter-spacing: 2px;
            }
            
            .info-table { width: 100%; font-size: 8px; border-collapse: collapse; margin-bottom: 2mm; }
            .info-table td { padding: 0.5mm 0; vertical-align: top; }
            .label { font-weight: bold; width: 25mm; }
            .value { font-weight: normal; }
            
            .items-table { width: 100%; font-size: 9px; border-collapse: collapse; border: 1px solid #000; }
            .items-table th { border: 1px solid #000; padding: 1mm 0.5mm; text-align: left; font-weight: bold; background: #eee; }
            .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 1mm 0.5mm; vertical-align: top; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .totals-section { border-top: 1px solid #000; margin-top: 0; padding-top: 1mm; }
            .total-row { display: flex; justify-content: flex-end; font-size: 10px; margin-bottom: 0.5mm; }
            .total-label { width: 40mm; text-align: right; padding-right: 2mm; font-weight: bold; }
            .total-value { width: 20mm; text-align: right; font-weight: bold; }
            .grand-total { font-size: 13px; font-weight: bold; margin-top: 1mm; border-top: 1px solid #000; padding-top: 1mm; }
            
            .footer { margin-top: 5mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; font-weight: bold; }
            .footer-left { text-align: left; }
            .footer-right { text-align: right; }
            .sig-space { margin-top: 8mm; border-top: 1px solid #000; width: 35mm; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="/logo/annamHospital-bk.png" class="logo" />
              <span class="hospital-name">ANNAM HOSPITAL</span>
              <span class="hospital-addr">2/301, Raj Kanna Nagar, Veerapandian Patanam</span>
              <span class="hospital-addr">Tiruchendur – 628216</span>
              <span class="hospital-contact">Phone: 04639 252592, 94420 25259</span>
              <span class="gst-no">GST No: 33AAFCA5252P1Z5</span>
            </div>
            
            <div class="invoice-title">LAB & RADIOLOGY BILL</div>
            
            <table class="info-table">
              <tr>
                <td class="label">UHID</td><td class="value">: ${escapeHtml(patientUhid)}</td>
              </tr>
              <tr>
                <td class="label">Patient Name</td><td class="value">: ${escapeHtml(patientName)}</td>
              </tr>
              <tr>
                <td class="label">Age / Gender</td><td class="value">: ${escapeHtml(patientAge)} Y / ${escapeHtml(patientGender)}</td>
              </tr>
              <tr>
                <td class="label">Bill No</td><td class="value">: ${escapeHtml(billNumber)}</td>
              </tr>
              <tr>
                <td class="label">Date</td><td class="value">: ${escapeHtml(billDateStr)}</td>
              </tr>
              <tr>
                <td class="label">Sales Type</td><td class="value">: ${escapeHtml(salesType)}</td>
              </tr>
            </table>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th width="10%" class="text-center">.No</th>
                  <th width="50%">SERVICE NAME</th>
                  <th width="15%" class="text-center">Qty</th>
                  <th width="25%" class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Taxable Amount :</span>
                <span class="total-value">₹${taxableAmount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Disc Amt :</span>
                <span class="total-value">₹${discountAmount.toFixed(2)}</span>
              </div>
              <div class="total-row grand-total">
                <span class="total-label">Tot.Net.Amt :</span>
                <span class="total-value">₹${amount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-left">
                PRINTED ON: ${printedDate}<br/>
                TIME: ${printedTime}
              </div>
              <div class="footer-right">
                <div class="sig-space"></div><br/>
                BILLING SIGNATURE
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;
    printWindow.document.write(thermalContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Orders & Billing</h2>
          <p className="text-gray-600 mt-1">Manage orders, upload results, and process payments</p>
        </div>
        <button
          onClick={() => onRefresh && onRefresh()}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-800 text-sm">{error}</span>
            <button className="text-red-700" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Bill No, Patient Name, or UHID"
            value={searchTerm}
            onChange={(e) => globalSearchTerm === undefined ? setLocalSearchTerm(e.target.value) : null}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
            readOnly={globalSearchTerm !== undefined}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => globalStatusFilter === undefined ? setLocalStatusFilter(e.target.value as any) : null}
            className={`px-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer ${globalStatusFilter !== undefined ? 'opacity-50 pointer-events-none' : ''}`}
            disabled={globalStatusFilter !== undefined}
          >
            <option value="all">Any Status</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredBills.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="text-gray-300" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No Orders Found</h3>
            <p className="text-gray-500 mt-1">Adjust your filters or create a new order.</p>
          </div>
        ) : (
          filteredBills.map((bill: any) => {
            const status = getBillingStatus(bill);
            const total = Number(bill.total ?? bill.subtotal ?? 0);
            const billNo = bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8).toUpperCase();
            const attCount = (attachmentsByBillId[bill.id] || []).length;

            return (
              <div
                key={bill.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-gray-900 truncate">Order #{billNo}</div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(bill.bill_type)}`}>
                      {getBillTypeIcon(bill.bill_type)} {String(bill.bill_type || 'lab').toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusColor(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {bill.patient?.name} • {bill.patient?.patient_id}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Services: {(bill.items || []).length} • Total: ₹{total.toFixed(0)}
                  </div>
                  {attCount > 0 && (
                    <div className="text-xs text-gray-500 truncate inline-flex items-center gap-1">
                      <Paperclip size={14} />
                      Files: {attCount}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setSelectedBill(bill);
                      setShowPaymentModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-black hover:bg-black inline-flex items-center gap-2"
                    title="Pay"
                  >
                    <CreditCard size={16} />
                    Pay
                  </button>
                  <button
                    onClick={() => openViewBill(bill)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="View"
                  >
                    <Eye size={16} />
                    View
                  </button>

                  <button
                    onClick={() => handleThermalPrint(bill)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="Print"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showPaymentModal && selectedBill && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
          }}
          bill={toPaymentRecord(selectedBill)}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedBill(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div
              className="p-6"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={(e) => handleDrop(e, selectedBill)}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Order #{selectedBill.bill_no || selectedBill.bill_number || String(selectedBill.id).slice(0, 8).toUpperCase()}
                  </h3>
                  <div className="text-sm text-gray-600 mt-1">
                    {selectedBill.patient?.name} ({selectedBill.patient?.patient_id})
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {viewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <>
                  {/* Debug: Log current attachments for this bill */}
                  {(() => {
                    const currentAttachments = attachmentsByBillId[selectedBill.id] || [];
                    console.log('OrdersFromBilling: Modal opened, current attachments for bill', selectedBill.id, ':', currentAttachments);
                    console.log('OrdersFromBilling: Attachment count:', currentAttachments.length);
                    return null;
                  })()}
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Services</h4>
                    <div className="space-y-3">
                      {(selectedBill.items || []).map((it: any) => (
                        <div
                          key={it.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{it.description}</p>
                            <p className="text-sm text-gray-600">Qty: {it.qty} • Unit: ₹{Number(it.unit_amount || 0).toFixed(0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">₹{Number(it.total_amount || 0).toFixed(0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* New Dedicated File Upload Component */}
                  <div className="mb-6">
                    <LabOrderFileUpload
                      billId={selectedBill.id}
                      patientId={selectedBill.patient?.id}
                      labOrderIds={(selectedBill.items || []).map((it: any) => it.ref_id).filter(Boolean)}
                      billNumber={selectedBill.bill_no || selectedBill.bill_number || String(selectedBill.id).slice(0, 8).toUpperCase()}
                      onUploadComplete={() => {
                        // Refresh attachments after upload
                        const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
                        fetchAttachments(billIds);
                        if (onRefresh) onRefresh();
                      }}
                    />
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Paperclip className="w-5 h-5 text-blue-600" />
                      Documents & Attachments
                      <span className="text-sm font-normal text-gray-500">
                        ({(attachmentsByBillId[selectedBill.id] || []).length} files)
                      </span>
                    </h4>

                    {/* Upload Status Indicator */}
                    {uploadingBillId === selectedBill.id && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-sm text-blue-700 font-medium">Uploading documents...</span>
                        </div>
                      </div>
                    )}

                    <div className="mb-4 flex items-center gap-3">
                      <button
                        onClick={() => {
                          console.log('Force refreshing attachments...');
                          setLastDeletedAttachmentId(null);
                          const billIds = (items || []).map((b: any) => b.id).filter(Boolean);
                          if (billIds.length && selectedBill) {
                            (async () => {
                              const { data, error: fetchError } = await supabase
                                .from('lab_xray_attachments')
                                .select('*')
                                .in('billing_id', billIds)
                                .order('uploaded_at', { ascending: false });

                              if (!fetchError) {
                                console.log('Fetched attachments data:', data);
                                console.log('Selected bill ID:', selectedBill.id);
                                const byBill: AttachmentMap = {};
                                (data || []).forEach((row: any) => {
                                  const id = row.billing_id;
                                  if (!id) return;
                                  byBill[id] = byBill[id] || [];
                                  byBill[id].push(row);
                                });
                                setAttachmentsByBillId(byBill);
                                console.log('Force refreshed attachments:', byBill);
                              }
                            })();
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-100 text-indigo-700 text-xs font-bold hover:bg-indigo-200 inline-flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw size={14} />
                        Refresh Files
                      </button>

                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>Files uploaded: {(attachmentsByBillId[selectedBill.id] || []).length}</span>
                        {lastDeletedAttachmentId && (
                          <span className="text-green-600 font-medium">✓ Last file deleted</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(attachmentsByBillId[selectedBill.id] || []).length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <div className="text-sm text-gray-500 font-medium">No documents uploaded yet</div>
                          <div className="text-xs text-gray-400 mt-1">Use the upload area above to add files</div>
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {(attachmentsByBillId[selectedBill.id] || [])
                            .sort((a: any, b: any) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
                            .map((att: any) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate text-sm">
                                    {att.file_name}
                                  </div>
                                  <div className="text-xs text-gray-500 flex items-center gap-3 mt-1">
                                    <span>{(Number(att.file_size || 0) / 1024).toFixed(1)} KB</span>
                                    <span>•</span>
                                    <span>{att.file_type || 'Unknown type'}</span>
                                    <span>•</span>
                                    <span>Uploaded {new Date(att.uploaded_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 font-mono">
                                    ID: {att.id?.slice(0, 8)}...{att.id?.slice(-4)}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                {att.file_url ? (
                                  <a
                                    href={att.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 inline-flex items-center gap-2 transition-colors"
                                    title="Open document in new tab"
                                  >
                                    <Eye size={14} />
                                    View
                                  </a>
                                ) : (
                                  <span className="px-3 py-2 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium">
                                    No URL
                                  </span>
                                )}

                                <button
                                  onClick={() => void handleDeleteAttachment(att)}
                                  className="px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 inline-flex items-center gap-2 transition-colors"
                                  title="Delete this document"
                                  disabled={uploadingBillId === selectedBill.id}
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
