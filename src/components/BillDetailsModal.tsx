'use client';

import React, { useState, useEffect } from 'react';
import { X, Receipt, IndianRupee, Clock, User, Calendar, CreditCard, ChevronRight } from 'lucide-react';
import { getBillPaymentHistory } from '../lib/universalPaymentService';

interface BillDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: any | null;
}

export default function BillDetailsModal({ isOpen, onClose, bill }: BillDetailsModalProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bill?.id) {
      loadPaymentHistory();
    }
  }, [isOpen, bill]);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const history = await getBillPaymentHistory(bill.id);
      setPayments(history);
    } catch (error: any) {
      console.error('Failed to load payment history:', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !bill) return null;

  const remainingBalance = (bill.total_amount || 0) - (bill.amount_paid || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold uppercase tracking-tight">Bill Details</h2>
              <p className="text-gray-400 text-xs">Viewing financial history for {bill.bill_id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wider shadow-sm border ${
              bill.payment_status === 'paid' 
                ? 'bg-green-50 text-green-700 border-green-200' 
                : bill.payment_status === 'partial'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {bill.payment_status === 'paid' ? 'Fully Paid' : bill.payment_status === 'partial' ? 'Partially Paid' : 'Pending Payment'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Patient & Bill Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-2">Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500 w-20">Patient:</span>
                  <span className="font-semibold text-gray-900">{bill.patient?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-4 h-4" />
                  <span className="text-gray-500 w-20">UHID:</span>
                  <span className="font-mono text-gray-700">{bill.patient?.patient_id || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500 w-20">Date:</span>
                  <span className="font-semibold text-gray-900">{new Date(bill.bill_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-2">Financial Summary</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-bold text-gray-900">₹{bill.total_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Already Paid:</span>
                  <span className="font-bold text-green-600">₹{bill.amount_paid?.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-700">Balance Due:</span>
                  <span className={`text-lg font-black ${remainingBalance <= 0 ? 'text-gray-400' : 'text-blue-600'}`}>
                    ₹{remainingBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History Listing */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
              Transaction History
              {loading && <div className="text-[10px] animate-pulse">Loading history...</div>}
            </h3>
            
            <div className="space-y-3">
              {payments.length === 0 && !loading ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No payment transactions recorded yet.</p>
                </div>
              ) : (
                payments.map((payment, idx) => (
                  <div 
                    key={payment.id} 
                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${payment.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {payment.amount < 0 ? 'Refund processed' : `Payment via ${payment.method.toUpperCase()}`}
                          </span>
                          {payment.reference && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-[10px] font-mono font-medium rounded text-gray-500 capitalize">
                              Ref: {payment.reference}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(payment.paid_at).toLocaleString()}</span>
                          <span>•</span>
                          <span>Received by: {payment.users?.name || 'Admin'}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-black ${payment.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {payment.amount < 0 ? '-' : '+'}₹{Math.abs(payment.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-200"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
