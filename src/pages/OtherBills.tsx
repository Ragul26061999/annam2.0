'use client';

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, Download, TrendingUp, DollarSign, FileText, AlertCircle, Printer, CreditCard, X, ChevronDown, Eye } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import OtherBillsForm from '../components/OtherBillsForm';
import OtherBillsList from '../components/OtherBillsList';
import OtherBillPrintTemplate from '../components/OtherBillPrintTemplate';
import OtherBillsPaymentModal from '../components/OtherBillsPaymentModal';
import { 
  getOtherBills, 
  getOtherBillsStats,
  CHARGE_CATEGORIES,
  getOtherBillChargeCategories,
  type OtherBillWithPatient 
} from '../lib/otherBillsService';

export default function OtherBills() {
  const searchParams = useSearchParams();
  const [bills, setBills] = useState<OtherBillWithPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<OtherBillWithPatient | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [billForPayment, setBillForPayment] = useState<OtherBillWithPatient | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showPrintDropdown, setShowPrintDropdown] = useState(false);
  const [chargeCategories, setChargeCategories] = useState(CHARGE_CATEGORIES);

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setShowPrintView(false);
    }, 100);
  };
  const [stats, setStats] = useState({
    total_bills: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
  });

  const fetchBills = async () => {
    try {
      setLoading(true);
      console.log('Fetching other bills...');
      const data = await getOtherBills({ status: 'active' });
      console.log('Fetched bills:', data);
      setBills(data);
    } catch (error) {
      console.error('Error fetching bills:', error);
      // Set empty array to prevent UI from breaking
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      console.log('Fetching other bills stats...');
      const statsData = await getOtherBillsStats();
      console.log('Fetched stats:', statsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default stats to prevent UI from breaking
      setStats({
        total_bills: 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
      });
    }
  };

  useEffect(() => {
    fetchBills();
    fetchStats();
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cats = await getOtherBillChargeCategories();
        if (!mounted) return;
        setChargeCategories(cats);
      } catch (err) {
        console.warn('Failed to load other bill charge categories:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const billId = searchParams?.get('bill');
    if (billId && bills.length > 0) {
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        setSelectedBill(bill);
      }
    }
  }, [searchParams, bills]);

  const handleRefresh = () => {
    fetchBills();
    fetchStats();
  };

  const handleBillClick = (bill: OtherBillWithPatient) => {
    setSelectedBill(bill);
  };

  const handlePaymentClick = (bill: OtherBillWithPatient) => {
    setBillForPayment(bill);
    setShowPaymentModal(true);
  };

  const getCategoryLabel = (category: string) => {
    const cat = chargeCategories.find(c => c.value === category);
    return cat?.label || category;
  };

  
  const showRoughBill = (billToPrint: any = null) => {
    const bill = billToPrint || selectedBill;
    if (!bill) return;

    const now = new Date();
    const printedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const printedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Get patient UHID
    const patientUhid = bill.patient?.patient_id || 'WALK-IN';
    const patientName = bill.patient?.name || 'Unknown Patient';
    const billNumber = bill.bill_number || 'N/A';

    // Get payment status
    let paymentType = bill.payment_status?.toUpperCase() || 'CASH';
    if (bill.payment_status === 'paid') {
      paymentType = 'PAID';
    } else if (bill.payment_status === 'pending') {
      paymentType = 'PENDING';
    }

    const billDateRaw = bill.created_at || new Date().toISOString();
    const bDate = new Date(billDateRaw);
    const billDateStr = bDate.toLocaleDateString('en-IN') + ' ' + bDate.toLocaleTimeString('en-IN');

    const amount = Number(bill.total_amount || 0);
    const subtotal = Number(bill.subtotal || amount);
    const discountAmount = Number(bill.discount_amount || 0);
    const taxAmount = Number(bill.tax_amount || 0);
    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    
    // items
    let itemsHtml = '';
    if (bill.items && bill.items.length > 0) {
      itemsHtml = bill.items.map((item: any, idx: number) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-left font-bold uppercase">${getCategoryLabel(item.charge_category)}<br/><small>${item.charge_description || ''}</small></td>
          <td class="text-center">${item.quantity || 1}</td>
          <td class="text-right">₹${Number((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}</td>
        </tr>
      `).join('');
    } else {
      itemsHtml = `
        <tr>
          <td class="text-center">1</td>
          <td class="text-left font-bold uppercase">${getCategoryLabel(bill.charge_category)}<br/><small>${bill.charge_description || ''}</small></td>
          <td class="text-center">${bill.quantity || 1}</td>
          <td class="text-right">₹${amount.toFixed(2)}</td>
        </tr>
      `;
    }
    itemsHtml += '<tr><td style="height: 10mm;"></td><td></td><td></td><td></td></tr>';

    const thermalContent = `
      <html>
        <head>
          <title>RUF BILL - ${billNumber}</title>
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
            .container { border: 1px solid #000; padding: 1mm; position: relative; overflow: hidden; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
            .logo { width: 50mm; height: auto; margin-bottom: 1mm; }
            .hospital-name { font-size: 15px; font-weight: bold; display: block; }
            .hospital-addr { font-size: 10px; display: block; }
            .hospital-contact { font-size: 10px; display: block; }
            .gst-no { font-size: 10px; font-weight: bold; margin-top: 1mm; display: block; }
            
            .invoice-title { 
                text-align: center; 
                font-size: 14px; 
                font-weight: bold; 
                border-top: 1px solid #000;
                border-bottom: 1px solid #000;
                padding: 1mm 0;
                margin-bottom: 1mm;
                letter-spacing: 2px;
                background: #eee;
            }
            
            .ruf-watermark {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 40px;
                color: rgba(0, 0, 0, 0.1);
                font-weight: bold;
                z-index: 0;
                pointer-events: none;
                white-space: nowrap;
            }

            .info-table { width: 100%; font-size: 8px; border-collapse: collapse; margin-bottom: 2mm; position: relative; z-index: 1; }
            .info-table td { padding: 0.5mm 0; vertical-align: top; }
            .label { font-weight: bold; width: 25mm; }
            .value { font-weight: normal; }
            
            .items-table { width: 100%; font-size: 9px; border-collapse: collapse; border: 1px solid #000; position: relative; z-index: 1; }
            .items-table th { border: 1px solid #000; padding: 1mm 0.5mm; text-align: left; font-weight: bold; background: #eee; }
            .items-table td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 1mm 0.5mm; vertical-align: top; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            
            .totals-section { border-top: 1px solid #000; margin-top: 0; padding-top: 1mm; position: relative; z-index: 1; }
            .total-row { display: flex; justify-content: flex-end; font-size: 10px; margin-bottom: 0.5mm; }
            .total-label { width: 40mm; text-align: right; padding-right: 2mm; font-weight: bold; }
            .total-value { width: 20mm; text-align: right; font-weight: bold; }
            .grand-total { font-size: 13px; font-weight: bold; margin-top: 1mm; border-top: 1px solid #000; padding-top: 1mm; }
            
            .footer { margin-top: 5mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; font-weight: bold; position: relative; z-index: 1; }
            .footer-left { text-align: left; }
            .footer-right { text-align: right; }
            .sig-space { margin-top: 8mm; border-top: 1px solid #000; width: 35mm; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="ruf-watermark">RUF BILL</div>
            <div class="header">
              <img src="/logo/annamHospital-bk.png" class="logo" />
              <span class="hospital-name">ANNAM HOSPITAL</span>
              <span class="hospital-addr">2/301, Raj Kanna Nagar, Veerapandian Patanam</span>
              <span class="hospital-addr">Tiruchendur – 628216</span>
              <span class="hospital-contact">Phone: 04639 252592, 94420 25259</span>
              <span class="gst-no">GST No: 33AAFCA5252P1Z5</span>
            </div>
            
            <div class="invoice-title">RUF BILL</div>
            
            <table class="info-table">
              <tr>
                <td class="label">UHID</td><td class="value">: ${patientUhid}</td>
              </tr>
              <tr>
                <td class="label">Patient Name</td><td class="value">: ${patientName}</td>
              </tr>
              <tr>
                <td class="label">Bill No</td><td class="value">: ${billNumber}</td>
              </tr>
              <tr>
                <td class="label">Date</td><td class="value">: ${billDateStr}</td>
              </tr>
              <tr>
                <td class="label">Sales Type</td><td class="value">: ${paymentType}</td>
              </tr>
            </table>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th width="10%" class="text-center">.No</th>
                  <th width="50%">CHARGE NAME</th>
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
                <span class="total-value">₹${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Disc Amt :</span>
                <span class="total-value">₹${discountAmount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">CGST Amt :</span>
                <span class="total-value">₹${cgstAmount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">SGST Amt :</span>
                <span class="total-value">₹${sgstAmount.toFixed(2)}</span>
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
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

const showThermalPreviewWithLogo = () => {
    if (!selectedBill) return;

    const now = new Date();
    const printedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const printedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Get patient UHID
    const patientUhid = selectedBill.patient?.patient_id || 'WALK-IN';
    const patientName = selectedBill.patient?.name || 'Unknown Patient';
    const billNumber = selectedBill.bill_number || 'N/A';

    // Get payment status
    let paymentType = selectedBill.payment_status?.toUpperCase() || 'CASH';
    if (selectedBill.payment_status === 'paid') {
      paymentType = 'PAID';
    } else if (selectedBill.payment_status === 'pending') {
      paymentType = 'PENDING';
    }

    const billDateRaw = selectedBill.created_at || new Date().toISOString();
    const bDate = new Date(billDateRaw);
    const billDateStr = bDate.toLocaleDateString('en-IN') + ' ' + bDate.toLocaleTimeString('en-IN');

    const amount = Number(selectedBill.total_amount || 0);
    const subtotal = Number(selectedBill.subtotal || amount);
    const discountAmount = Number(selectedBill.discount_amount || 0);
    const taxAmount = Number(selectedBill.tax_amount || 0);
    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    
    // items
    let itemsHtml = '';
    if (selectedBill.items && selectedBill.items.length > 0) {
      itemsHtml = selectedBill.items.map((item: any, idx: number) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-left font-bold uppercase">${getCategoryLabel(item.charge_category)}<br/><small>${item.charge_description || ''}</small></td>
          <td class="text-center">${item.quantity || 1}</td>
          <td class="text-right">₹${Number((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}</td>
        </tr>
      `).join('');
    } else {
      itemsHtml = `
        <tr>
          <td class="text-center">1</td>
          <td class="text-left font-bold uppercase">${getCategoryLabel(selectedBill.charge_category)}<br/><small>${selectedBill.charge_description || ''}</small></td>
          <td class="text-center">${selectedBill.quantity || 1}</td>
          <td class="text-right">₹${amount.toFixed(2)}</td>
        </tr>
      `;
    }
    itemsHtml += '<tr><td style="height: 10mm;"></td><td></td><td></td><td></td></tr>';

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${billNumber}</title>
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
            
            <div class="invoice-title">INVOICE</div>
            
            <table class="info-table">
              <tr>
                <td class="label">UHID</td><td class="value">: ${patientUhid}</td>
              </tr>
              <tr>
                <td class="label">Patient Name</td><td class="value">: ${patientName}</td>
              </tr>
              <tr>
                <td class="label">Bill No</td><td class="value">: ${billNumber}</td>
              </tr>
              <tr>
                <td class="label">Date</td><td class="value">: ${billDateStr}</td>
              </tr>
              <tr>
                <td class="label">Sales Type</td><td class="value">: ${paymentType}</td>
              </tr>
            </table>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th width="10%" class="text-center">.No</th>
                  <th width="50%">CHARGE NAME</th>
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
                <span class="total-value">₹${subtotal.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Disc Amt :</span>
                <span class="total-value">₹${discountAmount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">CGST Amt :</span>
                <span class="total-value">₹${cgstAmount.toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span class="total-label">SGST Amt :</span>
                <span class="total-value">₹${sgstAmount.toFixed(2)}</span>
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
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Other Bills</h1>
            <p className="text-gray-600 mt-1">
              Manage miscellaneous hospital charges for IP, OP, and general patients
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Bill
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total_bills}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ₹{stats.total_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₹{stats.paid_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  ₹{stats.pending_amount.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Bills List</h2>
          </div>
          <div className="p-4 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <OtherBillsList 
                bills={bills} 
                onBillClick={handleBillClick}
                onRoughBill={(bill) => {
                  setSelectedBill(bill);
                  showRoughBill(bill);
                }}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </div>

        {selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Bill Details</h2>
                  <div className="flex items-center gap-2">
                    {selectedBill.payment_status !== 'paid' && selectedBill.payment_status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          handlePaymentClick(selectedBill);
                          setSelectedBill(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Payment
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setShowPrintDropdown(!showPrintDropdown)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      {showPrintDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              // Direct print functionality using exact thermal format
                              const now = new Date();
                              const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                              const items = (selectedBill as any).items && (selectedBill as any).items.length > 0
                                ? (selectedBill as any).items
                                : [
                                    {
                                      charge_description: selectedBill.charge_description,
                                      quantity: selectedBill.quantity,
                                      total_amount: selectedBill.total_amount,
                                    },
                                  ];

                              const itemsRows = items
                                .map((it: any, idx: number) => {
                                  const qty = Number(it.quantity || 0);
                                  const amt = typeof it.total_amount === 'number'
                                    ? it.total_amount
                                    : (Number(it.unit_price || 0) * qty);
                                  return `
                                    <tr>
                                      <td class="items-8cm">${idx + 1}.</td>
                                      <td class="items-8cm">${it.charge_description || ''}</td>
                                      <td class="items-8cm text-center">${qty || 0}</td>
                                      <td class="items-8cm text-right">${Number(amt || 0).toFixed(0)}</td>
                                    </tr>
                                  `;
                                })
                                .join('');
                              
                              const thermalContent = `
                                <html>
                                <head>
                                  <title>Thermal Receipt - ${selectedBill.bill_number}</title>
                                  <style>
                                    @page { margin: 5mm; size: 77mm 297mm; }
                                    body { 
                                      font-family: 'Times New Roman', Times, serif; 
                                      margin: 0; 
                                      padding: 10px;
                                      font-size: 12px;
                                      line-height: 1.2;
                                      width: 77mm;
                                    }
                                    .header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman, Times, serif; }
                                    .bill-info-bold { font-weight: bold; font-family: 'Times New Roman, Times, serif; }
                                    .footer-7cm { font-size: 7pt; font-family: 'Times New Roman, Times, serif; }
                                    .center { text-align: center; font-family: 'Times New Roman, Times, serif; }
                                    .right { text-align: right; font-family: 'Times New Roman, Times, serif; }
                                    .table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman, Times, serif; }
                                    .table td { padding: 2px; font-family: 'Times New Roman, Times, serif; }
                                    .totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman, Times, serif; }
                                    .footer { margin-top: 20px; font-family: 'Times New Roman, Times, serif; }
                                  </style>
                                </head>
                                <body>
                                  <!-- Header Section -->
                                  <div class="center">
                                    <div class="header-14cm">ANNAM HOSPITAL</div>
                                    <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
                                    <div class="header-9cm">Phone- 04639 252592</div>
                                    <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
                                    <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
                                  </div>
                                  
                                  <!-- Bill Information Section -->
                                  <div style="margin-top: 10px;">
                                    <table class="table">
                                      <tr>
                                        <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                        <td class="bill-info-10cm bill-info-bold">${selectedBill.bill_number}</td>
                                      </tr>
                                      <tr>
                                        <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                                        <td class="bill-info-10cm bill-info-bold">${selectedBill.patient_name}</td>
                                      </tr>
                                      <tr>
                                        <td class="bill-info-10cm">Patient Type&nbsp;:&nbsp;&nbsp;</td>
                                        <td class="bill-info-10cm bill-info-bold">${selectedBill.patient_type}</td>
                                      </tr>
                                      <tr>
                                        <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                                        <td class="bill-info-10cm bill-info-bold">${new Date(selectedBill.bill_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date(selectedBill.bill_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</td>
                                      </tr>
                                      <tr>
                                        <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
                                        <td class="header-10cm bill-info-bold">${selectedBill.payment_status === 'paid' ? 'PAID' : 'CASH'}</td>
                                      </tr>
                                    </table>
                                  </div>

                                  <!-- Items Table Section -->
                                  <div style="margin-top: 10px;">
                                    <table class="table">
                                      <tr style="border-bottom: 1px dashed #000;">
                                        <td width="30%" class="items-8cm">S.No</td>
                                        <td width="40%" class="items-8cm">Description</td>
                                        <td width="15%" class="items-8cm text-center">Qty</td>
                                        <td width="15%" class="items-8cm text-right">Amt</td>
                                      </tr>
                                      ${itemsRows}
                                    </table>
                                  </div>

                                  <!-- Totals Section -->
                                  <div style="margin-top: 10px;">
                                    <div class="totals-line items-8cm">
                                      <span>Taxable Amount</span>
                                      <span>${selectedBill.subtotal.toFixed(0)}</span>
                                    </div>
                                    <div class="totals-line items-8cm">
                                      <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
                                      <span>${selectedBill.discount_amount.toFixed(0)}</span>
                                    </div>
                                    <div class="totals-line items-8cm">
                                      <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
                                      <span>${(selectedBill.tax_amount / 2).toFixed(0)}</span>
                                    </div>
                                    <div class="totals-line header-8cm">
                                      <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
                                      <span>${(selectedBill.tax_amount / 2).toFixed(0)}</span>
                                    </div>
                                    <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
                                      <span>Total Amount</span>
                                      <span>${selectedBill.total_amount.toFixed(0)}</span>
                                    </div>
                                  </div>

                                  <!-- Footer Section -->
                                  <div class="footer">
                                    <div class="totals-line footer-7cm">
                                      <span>Printed on ${printedDateTime}</span>
                                      <span>Billing Sign</span>
                                    </div>
                                  </div>

                                  <script>
                                    window.onload = function() {
                                      window.print();
                                    }
                                  </script>
                                </body>
                                </html>
                              `;
                              
                              const printWindow = window.open('', '_blank', 'width=400,height=600');
                              if (printWindow) {
                                printWindow.document.write(thermalContent);
                                printWindow.document.close();
                              }
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-t-lg"
                          >
                            <Printer className="w-4 h-4 text-blue-600" />
                            <span>Thermal Print</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              showRoughBill();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors"
                          >
                            <Printer className="w-4 h-4 text-orange-600" />
                            <span>RUF BILL</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              showThermalPreviewWithLogo();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors"
                          >
                            <Printer className="w-4 h-4 text-indigo-600" />
                            <span>Thermal 2</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowPrintDropdown(false);
                              handlePrint();
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 transition-colors rounded-b-lg"
                          >
                            <FileText className="w-4 h-4 text-gray-600" />
                            <span>Normal Print</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedBill(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Bill Number</p>
                      <p className="text-2xl font-bold text-blue-900">{selectedBill.bill_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-600 font-medium">Payment Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                        selectedBill.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedBill.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        selectedBill.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedBill.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Date & Time</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(selectedBill.bill_date).toLocaleDateString('en-IN')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedBill.bill_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Charge Category</p>
                    <p className="text-lg font-semibold text-gray-900">{getCategoryLabel(selectedBill.charge_category)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Name</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Patient Type</p>
                    <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_type}</p>
                  </div>
                  {selectedBill.patient_phone && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Phone</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBill.patient_phone}</p>
                    </div>
                  )}
                  {selectedBill.reference_number && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">Reference Number</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedBill.reference_number}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Charge Description</p>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-900">{selectedBill.charge_description}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium">{selectedBill.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unit Price:</span>
                    <span className="font-medium">₹{selectedBill.unit_price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{selectedBill.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {selectedBill.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount ({selectedBill.discount_percent}%):</span>
                      <span className="font-medium text-red-600">-₹{selectedBill.discount_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selectedBill.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax ({selectedBill.tax_percent}%):</span>
                      <span className="font-medium">₹{selectedBill.tax_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="font-bold text-xl text-blue-600">₹{selectedBill.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">₹{selectedBill.paid_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance:</span>
                    <span className="font-medium text-orange-600">₹{selectedBill.balance_amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {selectedBill.remarks && (
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Remarks</p>
                    <p className="text-gray-900">{selectedBill.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <OtherBillsForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showPaymentModal && billForPayment && (
        <OtherBillsPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setBillForPayment(null);
          }}
          bill={{
            id: billForPayment.id,
            bill_number: billForPayment.bill_number,
            total_amount: billForPayment.total_amount,
            balance_amount: billForPayment.balance_amount,
            payment_status: billForPayment.payment_status,
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setBillForPayment(null);
            handleRefresh();
          }}
        />
      )}

      {showPrintView && selectedBill && (
        <div className="hidden print:block">
          <OtherBillPrintTemplate bill={selectedBill} />
        </div>
      )}
    </div>
  );
}
