import React, { useState, useEffect } from 'react';
import { Loader2, Printer, DollarSign, Edit2, Save, X, Wallet, FileText, Pill, List, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { 
  getIPComprehensiveBilling, 
  saveIPBilling,
  saveIPPrescribedMedicines,
  IPComprehensiveBilling,
  IPPrescribedMedicine
} from '../../lib/ipBillingService';
import {
  getBillingSummary
} from '../../lib/ipFlexibleBillingService';
import IPBillingMedicinesEditor from './IPBillingMedicinesEditor';
import IPBillingLabEditor from './IPBillingLabEditor';
import IPPaymentReceiptModal from './IPPaymentReceiptModal';

import IPBillWisePaymentModal from './IPBillWisePaymentModal';
import OtherBillsPaymentModal from '../OtherBillsPaymentModal';
import IPBillPaymentModal from './IPBillPaymentModal';
import { IPBillingMultiPagePrint } from './IPBillingMultiPagePrint';
import IPServiceChargesEditor from './IPServiceChargesEditor';
import IPDoctorConsultationsEditor from './IPDoctorConsultationsEditor';

import { formatDate } from '../../lib/dateUtils';

interface IPBillingViewProps {
  bedAllocationId: string;
  patient: any;
  bedAllocation: any;
}

export default function IPBillingView({ bedAllocationId, patient, bedAllocation }: IPBillingViewProps) {
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<IPComprehensiveBilling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillWisePaymentModal, setShowBillWisePaymentModal] = useState(false);
  const [showOtherBillPaymentModal, setShowOtherBillPaymentModal] = useState(false);
  const [selectedOtherBill, setSelectedOtherBill] = useState<any | null>(null);
  const [flexibleBillingSummary, setFlexibleBillingSummary] = useState<any>(null);
  const [showBillPaymentModal, setShowBillPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any | null>(null);
  const [printWithHeader, setPrintWithHeader] = useState(true);
  const [isLetterheadTemplate, setIsLetterheadTemplate] = useState(false);

  useEffect(() => {
    loadBillingData();
    loadFlexibleBillingData();
  }, [bedAllocationId]);

  const handlePrint = (withHeader: boolean, isLetterhead: boolean) => {
    setPrintWithHeader(withHeader);
    setIsLetterheadTemplate(isLetterhead);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const loadFlexibleBillingData = async () => {
    try {
      const summary = await getBillingSummary(bedAllocationId);
      setFlexibleBillingSummary(summary);
    } catch (err) {
      console.error('Error loading flexible billing data:', err);
    }
  };

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const billingData = await getIPComprehensiveBilling(bedAllocationId);
      setBilling(billingData);
    } catch (err) {
      console.error('Error loading billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBilling = async (updatedBilling: IPComprehensiveBilling) => {
    try {
      await saveIPBilling(bedAllocationId, updatedBilling);
      setBilling(updatedBilling);
      await loadFlexibleBillingData();
    } catch (err) {
      console.error('Failed to save billing:', err);
      throw err;
    }
  };

  const handleSaveMedicines = async (medicines: IPPrescribedMedicine[]) => {
    if (!billing) return;
    try {
      await saveIPPrescribedMedicines(
        bedAllocationId,
        billing.patient.id,
        medicines
      );
      await loadBillingData();
      await loadFlexibleBillingData();
    } catch (err) {
      console.error('Failed to save medicines:', err);
      throw err;
    }
  };

  const handleSaveLabTests = async (updatedLabOrders: any[]) => {
    if (!billing) return;
    try {
      // Update billing with new lab data
      const updatedBilling = {
        ...billing,
        lab_billing: updatedLabOrders,
        summary: {
          ...billing.summary,
          lab_total: updatedLabOrders.reduce((sum: number, order: any) => 
            sum + order.tests.reduce((orderSum: number, test: any) => orderSum + test.test_cost, 0), 0
          )
        }
      };
      
      // Recalculate gross total
      updatedBilling.summary.gross_total = 
        updatedBilling.summary.doctor_services_total +
        updatedBilling.summary.prescribed_medicines_total +
        updatedBilling.summary.pharmacy_total +
        updatedBilling.summary.lab_total +
        updatedBilling.summary.radiology_total +
        updatedBilling.summary.other_charges_total +
        (updatedBilling.summary.other_bills_total || 0);

      // Recalculate net payable
      updatedBilling.summary.net_payable = 
        updatedBilling.summary.gross_total - 
        updatedBilling.summary.advance_paid - 
        updatedBilling.summary.discount;

      // Just update local state - lab data is already in database
      setBilling(updatedBilling);
    } catch (err) {
      console.error('Failed to save lab tests:', err);
      throw err;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
  };

  const recalculateBillingTotals = (b: IPComprehensiveBilling): IPComprehensiveBilling => {
    const bedTotal = Number(b.bed_charges.daily_rate || 0) * Number(b.bed_charges.days || 0);
    const docTotal = Number(b.doctor_consultation.consultation_fee || 0) * Number(b.doctor_consultation.days || 0);

    const bed_charges = { ...b.bed_charges, total_amount: bedTotal };
    const doctor_consultation = { ...b.doctor_consultation, total_amount: docTotal };

    const otherBillsTotal = (b.other_bills || []).reduce(
      (sum: number, ob: any) => sum + Number(ob.total_amount || 0),
      0
    );
    const otherBillsPaidTotal = (b.other_bills || []).reduce(
      (sum: number, ob: any) => sum + Number(ob.paid_amount || 0),
      0
    );
    const receiptsTotal = (b.payment_receipts || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );

    const summary = {
      ...b.summary,
      bed_charges_total: bedTotal,
      doctor_consultation_total: docTotal,
      other_bills_total: otherBillsTotal,
      other_bills_paid_total: otherBillsPaidTotal,
    };

    const grossTotal =
      (summary.doctor_services_total || 0) +
      (summary.prescribed_medicines_total || 0) +
      (summary.pharmacy_total || 0) +
      (summary.lab_total || 0) +
      (summary.radiology_total || 0) +
      (summary.scan_total || 0) +
      (summary.other_charges_total || 0) +
      (summary.other_bills_total || 0);
      // Removed bed_charges_total and doctor_consultation_total from gross sum as they are manually managed in Service Charges


    const paidTotal =
      receiptsTotal +
      (summary.other_bills_paid_total || 0);

    const pendingAmount = Math.max(0, grossTotal - (summary.discount || 0) - paidTotal);
    const netPayable = grossTotal - (summary.discount || 0);

    const updatedSummary = {
      ...summary,
      advance_paid: 0, // Force advance to 0 for this view
      gross_total: grossTotal,
      paid_total: paidTotal,
      net_payable: netPayable,
      pending_amount: pendingAmount,
    };

    const status: IPComprehensiveBilling['status'] =
      pendingAmount <= 0 ? 'paid' : paidTotal > 0 ? 'partial' : 'pending';

    return {
      ...b,
      bed_charges,
      doctor_consultation,
      summary: updatedSummary,
      status,
    };
  };


  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-500" />
        <span className="ml-3 text-gray-600">Loading billing details...</span>
      </div>
    );
  }

  if (error || !billing) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'No billing data available'}</p>
          <button
            onClick={loadBillingData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 print:hidden p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen font-sans">
        {/* Page Header - Card Style */}
        <div className="relative bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="absolute top-0 left-0 w-2 h-full bg-teal-500"></div>
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-60"></div>
          
          <div className="relative z-10 flex items-start gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
            >
              <ChevronLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg shadow-sm">
                  <FileText className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inpatient Billing</h1>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 ml-1">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>{billing.patient.name}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="font-mono text-slate-600 tracking-tight">IP: {billing.admission.ip_number}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <button
              onClick={() => router.push(`/inpatient/billing-breakdown/${bedAllocationId}`)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:border-teal-500 hover:text-teal-700 transition-all font-bold text-sm shadow-sm"
            >
              <FileText className="h-4 w-4 text-slate-400 group-hover:text-teal-500" />
              Breakdown Bill
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <button
              onClick={() => handlePrint(true, true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm text-sm"
            >
              <Printer className="h-4 w-4 text-slate-400" />
              Standard Print
            </button>
            <button
              onClick={() => handlePrint(false, true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm text-sm"
            >
              <FileText className="h-4 w-4 text-teal-500" />
              Letterhead
            </button>
            <button
              onClick={() => handlePrint(true, false)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-semibold shadow-sm text-sm"
            >
              <List className="h-4 w-4 text-slate-400" />
              Detailed Print
            </button>
          </div>
        </div>

        {/* Patient & Admission Info */}
        <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-bl-full -z-10"></div>
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <span className="w-1.5 h-6 bg-teal-500 rounded-full inline-block"></span>
            Patient Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Patient Name</p>
              <p className="text-base font-black text-slate-800">{billing.patient.name}</p>
              <div className="h-0.5 w-8 bg-slate-100 mt-2 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">IP Number</p>
              <p className="text-base font-bold text-slate-700 font-mono">{billing.admission.ip_number}</p>
              <div className="h-0.5 w-8 bg-slate-100 mt-2 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Admission Date</p>
              <p className="text-base font-bold text-slate-700">{formatDate(billing.admission.admission_date)}</p>
              <div className="h-0.5 w-8 bg-slate-100 mt-2 rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Duration of Stay</p>
              <p className="text-base font-bold text-teal-700 bg-teal-50 self-start px-3 py-0.5 rounded-lg border border-teal-100">{billing.admission.total_days} {billing.admission.total_days === 1 ? 'day' : 'days'}</p>
            </div>
          </div>
        </div>

        {/* Service Charges */}
        <IPServiceChargesEditor
          bedAllocationId={bedAllocationId}
          patientId={billing.patient.id}
          billing={billing}
          onUpdate={loadBillingData}
        />


        {/* Other Bills */}
        {billing.other_bills?.length > 0 && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-slate-100/50 transition-colors duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                </div>
                <div>
                  Other Bills
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">External and additional billing records</p>
                </div>
              </h2>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Amount</span>
                <span className="text-xl font-black text-slate-800 font-mono">
                  {formatCurrency(billing.summary.other_bills_total || 0)}
                </span>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Category</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-center">Qty</th>
                    <th className="px-4 py-2 text-right">Unit Price</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Paid</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billing.other_bills.map((b: any) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-4 py-2">{b.charge_category || '-'}</td>
                      <td className="px-4 py-2">{b.charge_description || '-'}</td>
                      <td className="px-4 py-2 text-center">{b.quantity ?? '-'}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.unit_price || 0))}</td>
                      <td className="px-4 py-2 text-right font-semibold">{formatCurrency(Number(b.total_amount || 0))}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.paid_amount || 0))}</td>
                      <td className="px-4 py-2 text-right">{formatCurrency(Number(b.balance_amount ?? (Number(b.total_amount || 0) - Number(b.paid_amount || 0))))}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          b.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          b.payment_status === 'partial' ? 'bg-orange-100 text-orange-800' :
                          b.payment_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {(b.payment_status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        {b.payment_status !== 'paid' && b.payment_status !== 'cancelled' && Math.round(Number(b.balance_amount ?? (Number(b.total_amount || 0) - Number(b.paid_amount || 0)))) > 0 ? (
                          <button
                            onClick={() => {
                              const pendingAmt = Math.round(Number(b.balance_amount ?? (Number(b.total_amount || 0) - Number(b.paid_amount || 0))));
                              setSelectedBillForPayment({
                                id: b.id,
                                bill_type: 'other_bill',
                                bill_number: b.bill_number,
                                description: `${b.charge_category}: ${b.charge_description}`,
                                total_amount: Math.round(Number(b.total_amount || 0)),
                                paid_amount: Math.round(Number(b.paid_amount || 0)),
                                pending_amount: pendingAmt
                              });
                              setShowBillPaymentModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <DollarSign className="h-4 w-4" />
                            Pay
                          </button>
                        ) : (
                          <span className="text-green-600 font-semibold">Paid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={4} className="px-4 py-2 text-right">Total Other Bills:</td>
                    <td className="px-4 py-2 text-right text-blue-600">{formatCurrency(billing.summary.other_bills_total || 0)}</td>
                    <td className="px-4 py-2 text-right text-green-700">{formatCurrency(billing.summary.other_bills_paid_total || 0)}</td>
                    <td className="px-4 py-2 text-right text-orange-700">
                      {formatCurrency(Math.max(0, (billing.summary.other_bills_total || 0) - (billing.summary.other_bills_paid_total || 0)))}
                    </td>
                    <td colSpan={2} className="px-4 py-2" />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prescribed Medicines */}
        <IPBillingMedicinesEditor
          medicines={billing.prescribed_medicines}
          onSave={handleSaveMedicines}
          isEditable={true}
        />

        {/* Pharmacy Bills */}
        <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50/50 rounded-full blur-3xl -z-10 group-hover:bg-teal-100/50 transition-colors duration-700"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-teal-400 to-teal-600 text-white rounded-xl shadow-sm">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                Pharmacy Bills
                <p className="text-[11px] text-slate-400 font-normal mt-0.5">Medications dispensed from inpatient pharmacy</p>
              </div>
            </h2>
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-4 px-3 py-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
                  <span className="text-sm font-black text-green-600 font-mono">
                    {formatCurrency(billing.pharmacy_billing.reduce((sum, pb) => sum + (pb.paid_amount || 0), 0))}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pending</span>
                  <span className="text-sm font-black text-orange-500 font-mono">
                    {formatCurrency(billing.pharmacy_billing.reduce((sum, pb) => sum + (pb.total_amount - (pb.paid_amount || 0)), 0))}
                  </span>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Dept Total</span>
                <span className="text-xl font-black text-teal-700 font-mono">
                  {formatCurrency(billing.summary.pharmacy_total)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {billing.pharmacy_billing.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-100 rounded-xl">
                No pharmacy bills found for this patient stay.
              </div>
            ) : (
              billing.pharmacy_billing.map((pb, idx) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                  {/* Bill Header */}
                  <div className="bg-gray-50/80 px-4 py-3 border-b border-gray-200 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Bill Number</span>
                        <span className="font-bold text-gray-900 tracking-tight">{pb.bill_number}</span>
                      </div>
                      <div className="h-6 w-px bg-gray-200"></div>
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Billing Date</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {formatDate(pb.bill_date)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          pb.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                          pb.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {pb.payment_status || 'pending'}
                        </span>
                      </div>
                      {pb.payment_status !== 'paid' && (
                         <button
                           onClick={() => {
                             const pendingAmt = Math.round((pb.balance_amount || pb.total_amount) - (pb.paid_amount || 0));
                             setSelectedBillForPayment({
                               id: pb.id,
                               bill_type: 'pharmacy',
                               bill_number: pb.bill_number,
                               description: `Pharmacy Bill #${pb.bill_number}`,
                               total_amount: Math.round(pb.total_amount),
                               paid_amount: Math.round(pb.paid_amount || 0),
                               pending_amount: pendingAmt
                             });
                             setShowBillPaymentModal(true);
                           }}
                           className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold text-xs ring-4 ring-green-50 shadow-sm"
                         >
                           <DollarSign className="h-4 w-4" />
                           Pay Now
                         </button>
                      )}
                    </div>
                  </div>

                  {/* Bill Items Table */}
                  <div className="p-0">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-white border-b border-gray-100 text-gray-400 font-bold uppercase tracking-widest text-[9px]">
                          <th className="px-6 py-3">Medicine Name</th>
                          <th className="px-6 py-3 text-center">Qty</th>
                          <th className="px-6 py-3 text-right">Unit Price</th>
                          <th className="px-6 py-3 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pb.items.map((item, itemIdx) => (
                          <tr key={itemIdx} className="hover:bg-purple-50/10 transition-colors">
                            <td className="px-6 py-3 font-bold text-gray-800 uppercase tracking-tight">{item.medicine_name}</td>
                            <td className="px-6 py-3 text-center font-mono font-bold text-purple-700">× {item.quantity}</td>
                            <td className="px-6 py-3 text-right text-gray-500 font-mono italic">{formatCurrency(item.unit_price)}</td>
                            <td className="px-6 py-3 text-right font-black text-gray-900 font-mono">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-purple-50/30 border-t border-purple-100/50">
                          <td colSpan={3} className="px-6 py-3 text-right text-[10px] font-black text-purple-400 uppercase tracking-[.2em]">Total Bill Amount</td>
                          <td className="px-6 py-3 text-right text-base font-black text-purple-700 font-mono tracking-tighter">{formatCurrency(pb.total_amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Laboratory Tests */}
        <IPBillingLabEditor
          labOrders={billing.lab_billing}
          onSave={handleSaveLabTests}
          isEditable={true}
        />

        {/* Radiology/X-Ray */}
        {billing.radiology_billing.length > 0 && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-slate-100/50 transition-colors duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div>
                  Radiology / X-Ray
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">X-Ray and basic imaging services</p>
                </div>
              </h2>
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4 px-3 py-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
                    <span className="text-sm font-black text-green-600 font-mono">
                      {formatCurrency(billing.radiology_billing.reduce((orderSum, rb) => 
                        orderSum + rb.scans.reduce((scanSum, s) => scanSum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pending</span>
                    <span className="text-sm font-black text-orange-500 font-mono">
                      {formatCurrency(billing.radiology_billing.reduce((orderSum, rb) => 
                        orderSum + rb.scans.reduce((scanSum, s) => scanSum + (s.status !== 'paid' ? s.scan_cost : 0), 0), 0)
                      )}
                    </span>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Dept Total</span>
                  <span className="text-xl font-black text-slate-800 font-mono">
                    {formatCurrency(billing.summary.radiology_total)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {billing.radiology_billing.map((rb, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Bill Number */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-indigo-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Bill</p>
                          <p className="font-semibold text-gray-900">{rb.bill_number || `RAD-${idx + 1}`}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(rb.order_date)}
                          </p>
                        </div>
                      </div>

                      {/* Scans */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-500 uppercase mb-1">Scans</p>
                        <div className="flex flex-wrap gap-2">
                          {rb.scans.map((scan, scanIdx) => (
                            <div key={scanIdx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded text-sm">
                              <span className="font-medium text-gray-700 text-xs">{scan.scan_name}</span>
                              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(scan.scan_cost)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                scan.status === 'paid' ? 'bg-green-100 text-green-800' :
                                scan.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {scan.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scan Count */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Count</p>
                        <div className="bg-indigo-100 px-3 py-1 rounded-full inline-block mt-1">
                          <span className="text-sm font-bold text-indigo-800">
                            {rb.scans.length} scan{rb.scans.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(rb.scans.reduce((sum, scan) => sum + scan.scan_cost, 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Imaging Scans */}
        {billing.scan_billing.length > 0 && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-slate-100/50 transition-colors duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  Advanced Imaging Scans
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">CT, MRI, and specialized scanning</p>
                </div>
              </h2>
              <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4 px-3 py-1">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Paid</span>
                    <span className="text-sm font-black text-green-600 font-mono">
                      {formatCurrency(billing.scan_billing.reduce((orderSum, sb) => 
                        orderSum + sb.scans.reduce((scanSum, s) => scanSum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0)
                      )}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pending</span>
                    <span className="text-sm font-black text-orange-500 font-mono">
                      {formatCurrency(billing.scan_billing.reduce((orderSum, sb) => 
                        orderSum + sb.scans.reduce((scanSum, s) => scanSum + (s.status !== 'paid' ? s.scan_cost : 0), 0), 0)
                      )}
                    </span>
                  </div>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Dept Total</span>
                  <span className="text-xl font-black text-slate-800 font-mono">
                    {formatCurrency(billing.summary.scan_total)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {billing.scan_billing.map((sb, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Bill Number */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Bill</p>
                          <p className="font-semibold text-gray-900">{sb.bill_number || `SCAN-${idx + 1}`}</p>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Date</p>
                          <p className="font-medium text-gray-900">
                            {formatDate(sb.order_date)}
                          </p>
                        </div>
                      </div>

                      {/* Scans */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-500 uppercase mb-1">Scans</p>
                        <div className="flex flex-wrap gap-2">
                          {sb.scans.map((scan, scanIdx) => (
                            <div key={scanIdx} className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded text-sm">
                              <span className="font-medium text-gray-700 text-xs">{scan.scan_name}</span>
                              <span className="text-blue-600 font-semibold text-xs">{formatCurrency(scan.scan_cost)}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                scan.status === 'paid' ? 'bg-green-100 text-green-800' :
                                scan.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {scan.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scan Count */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Count</p>
                        <div className="bg-purple-100 px-3 py-1 rounded-full inline-block mt-1">
                          <span className="text-sm font-bold text-purple-800">
                            {sb.scans.length} scan{sb.scans.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Order Total */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(sb.scans.reduce((sum, scan) => sum + scan.scan_cost, 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IP Entered Bill (Other Charges) */}
        {billing.other_charges.length > 0 && (
          <div className="bg-white p-6 lg:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 group-hover:bg-slate-100/50 transition-colors duration-700"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-xl shadow-sm">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                </div>
                <div>
                  IP Entered Bill
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">Miscellaneous inpatient charges</p>
                </div>
              </h2>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Total Charges</span>
                <span className="text-xl font-black text-slate-800 font-mono">
                  {formatCurrency(billing.summary.other_charges_total)}
                </span>
              </div>
            </div>

            {/* Added: Summary of IP Entered Bill limits */}
            <div className="bg-slate-50 p-4 rounded-xl mb-6 flex gap-8 border border-slate-100">
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Total Amount</p>
                <p className="text-lg font-black text-slate-800 font-mono">{formatCurrency(billing.summary.other_charges_total)}</p>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Net Amount</p>
                <p className="text-lg font-black text-teal-700 font-mono">
                  {formatCurrency(Math.max(0, billing.summary.other_charges_total - (billing.summary.discount || 0)))}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {billing.other_charges.map((charge, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Service Name */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-orange-700">$</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Charges Name</p>
                          <p className="font-semibold text-gray-900">{charge.service_name}</p>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Quantity / Days</p>
                          <p className="font-medium text-gray-900">{charge.days || charge.quantity}</p>
                        </div>
                      </div>

                      {/* Rate */}
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Rate</p>
                          <p className="font-medium text-gray-900">{formatCurrency(charge.rate)}</p>
                        </div>
                      </div>

                      {/* Calculation */}
                      <div className="flex-1 max-w-xs">
                        <p className="text-xs text-gray-500 uppercase mb-1">Calculation</p>
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                          <span className="text-sm text-gray-600">{charge.days || charge.quantity}</span>
                          <span className="text-gray-400">×</span>
                          <span className="text-sm text-gray-600">{formatCurrency(charge.rate)}</span>
                          <span className="text-gray-400">=</span>
                          <span className="text-blue-600 font-bold text-sm">{formatCurrency(charge.amount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Amount</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(charge.amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Other Bills */}
        {billing.other_bills.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Other Bills</h2>
              <span className="text-2xl font-bold text-blue-600">{formatCurrency(billing.summary.other_bills_total)}</span>
            </div>
            <div className="space-y-3">
              {billing.other_bills.map((bill, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center p-4 bg-white">
                    <div className="flex items-center gap-6 flex-1">
                      {/* Bill Number */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-amber-700">#</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Bill</p>
                          <p className="font-semibold text-gray-900">{bill.bill_number}</p>
                        </div>
                      </div>

                      {/* Bill Description */}
                      <div className="flex-1 max-w-md">
                        <p className="text-xs text-gray-500 uppercase mb-1">Description</p>
                        <p className="font-medium text-gray-700 text-sm">
                          {bill.charge_category}: {bill.charge_description}
                        </p>
                      </div>

                      {/* Quantity */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Qty</p>
                        <div className="bg-amber-100 px-3 py-1 rounded-full inline-block mt-1">
                          <span className="text-sm font-bold text-amber-800">
                            {bill.quantity}
                          </span>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Rate</p>
                        <p className="font-medium text-gray-900">{formatCurrency(bill.unit_price)}</p>
                      </div>

                      {/* Payment Status */}
                      <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase">Status</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                          bill.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                    </div>

                    {/* Bill Total */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Total</p>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(bill.total_amount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>

      {/* Global Grand Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 print:hidden">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 sm:px-10 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center text-white gap-6 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl"></div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
                <Wallet className="h-8 w-8 text-teal-300" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white">Financial Summary</h2>
                <div className="text-xs text-slate-300 font-medium tracking-widest mt-2 flex items-center gap-2 uppercase">
                  <div className="h-1.5 w-1.5 bg-teal-400 rounded-full"></div>
                  Consolidated Inpatient Account
                </div>
              </div>
            </div>
            <div className="text-left sm:text-right relative z-10 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm min-w-44">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Account Status</span>
              <div className="flex items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ring-2 ring-offset-2 ring-offset-slate-900 ${
                  billing.status === 'paid' ? 'bg-teal-400 ring-teal-400/50' : 
                  billing.status === 'partial' ? 'bg-amber-400 ring-amber-400/50' : 'bg-rose-400 ring-rose-400/50'
                }`}></div>
                <span className={`text-xl font-black uppercase tracking-widest ${
                  billing.status === 'paid' ? 'text-teal-400' : 
                  billing.status === 'partial' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {billing.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 bg-white relative">
            {/* Total Clinical Amount */}
            <div className="relative group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-blue-500 transition-colors">Clinical Department Total</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter drop-shadow-sm">
                    {formatCurrency(
                      (billing.summary.pharmacy_total || 0) + 
                      (billing.summary.lab_total || 0) + 
                      (billing.summary.radiology_total || 0) + 
                      (billing.summary.scan_total || 0) + 
                      (billing.summary.other_charges_total || 0) +
                      (billing.summary.prescribed_medicines_total || 0) +
                      (billing.summary.doctor_services_total || 0) +
                      (billing.summary.other_bills_total || 0)
                    )}
                  </span>
                </div>
                <div className="flex flex-col mt-3 space-y-1">
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Service Charges</span>
                     <span className="text-slate-600 font-bold">{formatCurrency((billing.summary.other_charges_total || 0) + (billing.summary.doctor_services_total || 0))}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Pharmacy & Medicines</span>
                     <span className="text-slate-600 font-bold">{formatCurrency((billing.summary.pharmacy_total || 0) + (billing.summary.prescribed_medicines_total || 0))}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Labs & Diagnostics</span>
                     <span className="text-slate-600 font-bold">{formatCurrency((billing.summary.lab_total || 0) + (billing.summary.radiology_total || 0) + (billing.summary.scan_total || 0))}</span>
                   </div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-all duration-300 group-hover:rotate-12">
                <List className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            {/* Paid Amount (Clinical) */}
            <div className="relative group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-green-500 transition-colors">Clinical Amount Paid</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-green-600 font-mono tracking-tighter drop-shadow-sm">
                    {formatCurrency(
                      (billing.other_bills?.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0) || 0) +
                      (billing.pharmacy_billing?.reduce((sum, pb) => sum + (pb.paid_amount || 0), 0) || 0) +
                      (billing.lab_billing?.reduce((sum, order) => sum + order.tests.reduce((tsum, t) => tsum + (t.status === 'paid' ? t.test_cost : 0), 0), 0) || 0) +
                      (billing.radiology_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0) +
                      (billing.scan_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0)
                    )}
                  </span>
                </div>
                <div className="flex flex-col mt-3 space-y-1">
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Dept. Settlements</span>
                     <span className="text-green-600 font-bold">{(
                       (billing.other_bills?.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0) || 0) +
                       (billing.pharmacy_billing?.reduce((sum, pb) => sum + (pb.paid_amount || 0), 0) || 0) +
                       (billing.lab_billing?.reduce((sum, order) => sum + order.tests.reduce((tsum, t) => tsum + (t.status === 'paid' ? t.test_cost : 0), 0), 0) || 0) +
                       (billing.radiology_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0) +
                       (billing.scan_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0)
                     ).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</span>
                   </div>
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Advance Applied</span>
                     <span className="text-green-600 font-bold">Varies by Stay</span>
                   </div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 p-3 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-all duration-300 group-hover:-rotate-12">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>

            {/* Pending Amount (Clinical) */}
            <div className="relative group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-orange-500 transition-colors">Clinical Outstanding</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-orange-600 font-mono tracking-tighter drop-shadow-sm">
                    {formatCurrency(
                      Math.max(0, 
                        ((billing.summary.pharmacy_total || 0) + (billing.summary.lab_total || 0) + (billing.summary.radiology_total || 0) + (billing.summary.scan_total || 0) + (billing.summary.other_charges_total || 0) + (billing.summary.prescribed_medicines_total || 0) + (billing.summary.doctor_services_total || 0) + (billing.summary.other_bills_total || 0)) - 
                        ((billing.other_bills?.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0) || 0) +
                        (billing.pharmacy_billing?.reduce((sum, pb) => sum + (pb.paid_amount || 0), 0) || 0) +
                        (billing.lab_billing?.reduce((sum, order) => sum + order.tests.reduce((tsum, t) => tsum + (t.status === 'paid' ? t.test_cost : 0), 0), 0) || 0) +
                        (billing.radiology_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0) +
                        (billing.scan_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0))
                      )
                    )}
                  </span>
                </div>
                <div className="flex flex-col mt-3 space-y-1">
                   <div className="flex justify-between text-[11px]">
                     <span className="text-slate-400 font-medium italic">Clinical Dues Only</span>
                     <span className="text-orange-600 font-bold">Action Required</span>
                   </div>
                   <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className="bg-orange-500 h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, (((((billing.summary.pharmacy_total || 0) + (billing.summary.lab_total || 0) + (billing.summary.radiology_total || 0) + (billing.summary.scan_total || 0) + (billing.summary.other_charges_total || 0) + (billing.summary.prescribed_medicines_total || 0) + (billing.summary.doctor_services_total || 0) + (billing.summary.other_bills_total || 0)) - 
                          ((billing.other_bills?.reduce((sum, b) => sum + Number(b.paid_amount || 0), 0) || 0) +
                          (billing.pharmacy_billing?.reduce((sum, pb) => sum + (pb.paid_amount || 0), 0) || 0) +
                          (billing.lab_billing?.reduce((sum, order) => sum + order.tests.reduce((tsum, t) => tsum + (t.status === 'paid' ? t.test_cost : 0), 0), 0) || 0) +
                          (billing.radiology_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0) +
                          (billing.scan_billing?.reduce((sum, order) => sum + order.scans.reduce((ssum, s) => ssum + (s.status === 'paid' ? s.scan_cost : 0), 0), 0) || 0))
                          ) / ((billing.summary.pharmacy_total || 1) + (billing.summary.lab_total || 0) + (billing.summary.radiology_total || 0) + (billing.summary.scan_total || 0) + (billing.summary.other_charges_total || 1) + (billing.summary.prescribed_medicines_total || 0) + (billing.summary.doctor_services_total || 0) + (billing.summary.other_bills_total || 0))) * 100)))}%` 
                        }}
                      ></div>
                   </div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 p-3 bg-orange-50 rounded-2xl group-hover:bg-orange-100 transition-all duration-300 group-hover:scale-110">
                <div className="h-6 w-6 border-2 border-orange-600 rounded-full flex items-center justify-center font-black text-orange-600 text-[10px]">!</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border-t border-slate-100 p-8 sm:p-10 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-10">
            <div className="flex flex-wrap gap-10 justify-center">
              <div className="flex flex-col items-center md:items-start">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">Total Amount Due</span>
                <span className="text-3xl font-black text-slate-800 font-mono tracking-tighter">{formatCurrency(billing.summary.gross_total)}</span>
              </div>
              <div className="hidden md:block w-px h-12 bg-slate-200 self-center"></div>
              <div className="flex flex-col items-center md:items-start">
                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  Remaining Balance
                </span>
                <span className="text-3xl font-black text-teal-700 font-mono tracking-tighter">{formatCurrency(billing.summary.pending_amount)}</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <button
                onClick={() => setShowBillWisePaymentModal(true)}
                className="group w-full md:w-auto px-8 py-3.5 bg-white text-slate-700 border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:text-teal-700 transition-all duration-300 font-black text-sm uppercase tracking-widest shadow-sm flex items-center justify-center gap-3"
              >
                <List className="h-5 w-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                Bill-wise Pay
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="group w-full md:w-auto px-8 py-3.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all duration-300 font-black text-sm uppercase tracking-widest shadow-md flex items-center justify-center gap-3"
              >
                <Wallet className="h-5 w-5 group-hover:scale-110 transition-transform" />
                General Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Page Print Template - Only show if not letterhead template */}
      {!isLetterheadTemplate && <IPBillingMultiPagePrint billing={billing} />}

      {/* Letterhead / Single Page Print Template */}
      {isLetterheadTemplate && (
        <div className="print-only-template hidden print:block">
          <div className="print-container bg-white font-sans text-slate-900">
            {/* Official Letterhead Header Area (Reserved 5.9cm space) */}
            <div className="hospital-header-area">
              {printWithHeader && (
                <div className="text-center">
                  <div className="flex justify-center mb-2">
                    <img src="/images/logo.png" alt="Annam Hospital Logo" className="h-16 w-auto object-contain" />
                  </div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Annam Multispeciality Hospital</h2>
                  <p className="text-[10px] font-bold text-slate-600 mt-1">
                    2/300, Rajkanna Nagar, Veerapandianpatnam, Tiruchendur Taluk, Thoothukudi - 628 216.
                  </p>
                  <p className="text-[10px] font-bold text-slate-600">
                    Cell: 8681850592, 8681950592 | Email: annammultispecialityhospital@gmail.com
                  </p>
                </div>
              )}
            </div>

            <div className="text-center mb-6 mt-2">
              <h3 className="text-lg font-black text-[#2980b9] uppercase tracking-[0.2em] border-y-2 border-[#2980b9] inline-block px-10 py-1">Inpatient Billing</h3>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-[12px] px-2">
              <div className="space-y-3">
                <div className="flex items-baseline">
                  <span className="font-bold w-24 flex-shrink-0">Patient Name</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-extrabold uppercase ml-1 pb-0.5">{billing.patient.name}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-24 flex-shrink-0">Address</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 uppercase ml-1 pb-0.5 text-[11px] truncate">{billing.patient.address || 'N/A'}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-24 flex-shrink-0">Consultant</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-extrabold uppercase ml-1 pb-0.5">{billing.doctor_consultation.doctor_name || 'N/A'}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-24 flex-shrink-0">Room/Bed</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">Room {billing.admission.room_number} / Bed {billing.admission.bed_number}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline">
                  <span className="font-bold w-32 flex-shrink-0">Age & Sex</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">{billing.patient.age} Yrs / {billing.patient.gender}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-32 flex-shrink-0">O.P. No / UHID</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-mono font-bold ml-1 pb-0.5">{billing.patient.patient_id}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-32 flex-shrink-0">I.P. No</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-mono font-bold ml-1 pb-0.5">{billing.admission.ip_number}</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold w-32 flex-shrink-0">Bill Date</span>
                  <span className="font-normal w-4">:</span>
                  <span className="flex-1 border-b border-slate-200 font-bold ml-1 pb-0.5">{formatDate(new Date())}</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-800 text-[9px] font-black uppercase tracking-widest border-y border-slate-800">
                    <th className="px-3 py-1.5 text-left w-10">S.No</th>
                    <th className="px-3 py-1.5 text-left">Description of Services</th>
                    <th className="px-3 py-1.5 text-center w-20">Qty/Days</th>
                    <th className="px-3 py-1.5 text-right w-28">Rate (₹)</th>
                    <th className="px-3 py-1.5 text-right w-28">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Redundant Bed and Consultation charges removed as they are now handled in Service Charges */}

                  {/* Other Charges (Surgical/Procedural) */}
                  {billing.other_charges.map((item: any, idx: number) => (
                    <tr key={`oc-${idx}`} className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">{idx + 1}</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">{item.service_name}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{item.days || item.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{Number(item.rate).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{Number(item.amount).toFixed(2)}</td>
                    </tr>
                  ))}
                  
                  {/* Consolidated Departmental Charges */}
                  {billing.summary.pharmacy_total > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Pharmacy Charges (Consolidated)</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{billing.summary.pharmacy_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{billing.summary.pharmacy_total.toFixed(2)}</td>
                    </tr>
                  )}
                  {billing.summary.lab_total > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Laboratory Charges (Consolidated)</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{billing.summary.lab_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{billing.summary.lab_total.toFixed(2)}</td>
                    </tr>
                  )}
                  {billing.summary.radiology_total > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Radiology / X-Ray Charges (Consolidated)</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{billing.summary.radiology_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{billing.summary.radiology_total.toFixed(2)}</td>
                    </tr>
                  )}
                  {billing.summary.scan_total > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Imaging / Scan Charges (Consolidated)</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{billing.summary.scan_total.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{billing.summary.scan_total.toFixed(2)}</td>
                    </tr>
                  )}
                  {(billing.summary.prescribed_medicines_total || 0) > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Prescribed Medicines Total</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{(billing.summary.prescribed_medicines_total || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{(billing.summary.prescribed_medicines_total || 0).toFixed(2)}</td>
                    </tr>
                  )}
                  {(billing.summary.doctor_services_total || 0) > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Doctor Services Total</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{(billing.summary.doctor_services_total || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{(billing.summary.doctor_services_total || 0).toFixed(2)}</td>
                    </tr>
                  )}
                  {(billing.summary.other_bills_total || 0) > 0 && (
                    <tr className="text-[12px]">
                      <td className="px-3 py-2 text-slate-500 font-bold text-center">•</td>
                      <td className="px-3 py-2 font-bold text-slate-800 uppercase">Other Misc. Bills</td>
                      <td className="px-3 py-2 text-center text-slate-600">1</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">{(billing.summary.other_bills_total || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">{(billing.summary.other_bills_total || 0).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="border-t border-slate-800 font-bold">
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-[10px] uppercase tracking-widest font-black">Gross Total Charges</td>
                    <td className="px-3 py-2 text-right text-[14px] font-mono font-black">₹{billing.summary.gross_total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="flex justify-end mb-10 px-2">
              <div className="w-64 space-y-2 py-3 border-t border-slate-200">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>Advance Adjusted</span>
                  <span className="font-mono text-slate-800">- ₹{(billing.summary.advance_paid || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-slate-500 uppercase">
                  <span>Discount / Concession</span>
                  <span className="font-mono text-slate-800">- ₹{(billing.summary.discount || 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-400 flex justify-between items-center text-slate-900">
                  <span className="text-[12px] font-black uppercase tracking-tight">Net Payable</span>
                  <span className="text-[20px] font-black font-mono tracking-tighter text-slate-900 leading-none">₹{billing.summary.net_payable.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-24 mt-16 px-6">
              <div className="text-center flex flex-col items-center">
                <div className="w-full border-t border-slate-300 mb-2"></div>
                <p className="text-[11px] font-black text-slate-800 uppercase">Authorized Signatory</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Annam Hospital Office)</p>
              </div>
              <div className="text-center flex flex-col items-center">
                <div className="w-full border-t border-slate-300 mb-2"></div>
                <p className="text-[11px] font-black text-slate-800 uppercase">Patient / Attender</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">(Verification of Charges)</p>
              </div>
            </div>

            <div className="mt-auto pt-8 text-center">
               <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-wider">Computer generated provisional bill • This is not an official receipt • Subject to Hospital Terms</p>
            </div>
          </div>

          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .print-only-template, .print-only-template * {
                visibility: visible;
              }
              .print-only-template {
                position: absolute;
                left: 0;
                top: 0;
                width: 20.6cm;
                height: 28.5cm;
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 9999;
              }
              @page {
                size: 20.6cm 28.5cm;
                margin: 0;
              }
              .print-container {
                width: 20.6cm;
                height: 28.5cm;
                padding-left: 1.2cm;
                padding-right: 1.2cm;
                padding-bottom: 1.5cm;
                position: relative;
                box-sizing: border-box;
                background: white !important;
                display: flex;
                flex-direction: column;
              }
              .hospital-header-area {
                height: 5.9cm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                overflow: hidden;
                border-bottom: 1px dashed #eee;
              }
              .hospital-header-area:empty {
                border-bottom: none;
              }
              table { width: 100%; border-collapse: collapse; }
              th, td { border-bottom: 1px solid #f0f0f0; }
            }
          `}</style>
        </div>
      )}

      {/* Payment Receipt Modal */}
      <IPPaymentReceiptModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        totalAmount={billing.summary.gross_total}
        pendingAmount={billing.summary.pending_amount}
        onPaymentSuccess={() => {
          loadBillingData();
          loadFlexibleBillingData();
        }}
      />


      {/* Bill-wise Payment Modal */}
      <IPBillWisePaymentModal
        isOpen={showBillWisePaymentModal}
        onClose={() => setShowBillWisePaymentModal(false)}
        bedAllocationId={bedAllocationId}
        patientId={billing.patient.id}
        patientName={billing.patient.name}
        onPaymentSuccess={() => {
          loadBillingData();
          loadFlexibleBillingData();
        }}
      />

      {showOtherBillPaymentModal && selectedOtherBill && (
        <OtherBillsPaymentModal
          isOpen={showOtherBillPaymentModal}
          onClose={() => {
            setShowOtherBillPaymentModal(false);
            setSelectedOtherBill(null);
          }}
          bill={{
            id: selectedOtherBill.id,
            bill_number: selectedOtherBill.bill_number,
            total_amount: Math.round(Number(selectedOtherBill.total_amount || 0)),
            balance_amount: Math.round(Number(selectedOtherBill.balance_amount ?? (Number(selectedOtherBill.total_amount || 0) - Number(selectedOtherBill.paid_amount || 0)))),
            payment_status: selectedOtherBill.payment_status,
          }}
          onSuccess={() => {
            setShowOtherBillPaymentModal(false);
            setSelectedOtherBill(null);
            loadBillingData();
          }}
        />
      )}

      {/* Individual Bill Payment Modal */}
      {showBillPaymentModal && selectedBillForPayment && (
        <IPBillPaymentModal
          isOpen={showBillPaymentModal}
          onClose={() => {
            setShowBillPaymentModal(false);
            setSelectedBillForPayment(null);
          }}
          bedAllocationId={bedAllocationId}
          patientId={billing.patient.id}
          patientName={billing.patient.name}
          bill={selectedBillForPayment}
          onPaymentSuccess={() => {
            setShowBillPaymentModal(false);
            setSelectedBillForPayment(null);
            loadBillingData();
            loadFlexibleBillingData();
          }}
        />
      )}
    </>
  );
}
