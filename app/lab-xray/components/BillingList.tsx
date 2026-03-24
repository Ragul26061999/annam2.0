import { useMemo, useState } from 'react';
import { 
  Search, 
  FileText, 
  CreditCard, 
  CheckCircle, 
  Printer, 
  Eye, 
  X,
  Calendar
} from 'lucide-react';
import UniversalPaymentModal from '../../../src/components/UniversalPaymentModal';
import type { PaymentRecord } from '../../../src/lib/universalPaymentService';
import { supabase } from '../../../src/lib/supabase';

interface BillingListProps {
  items: any[];
  onRefresh: () => void;
  searchTerm?: string;
  statusFilter?: string;
  completionFilter?: 'all' | 'pending' | 'completed';
}

export default function BillingList({ items, onRefresh, searchTerm: globalSearchTerm, statusFilter: globalStatusFilter, completionFilter }: BillingListProps) {
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState('all');

  const searchTerm = globalSearchTerm !== undefined ? globalSearchTerm : localSearchTerm;
  const statusFilter = globalStatusFilter !== undefined ? globalStatusFilter : localStatusFilter;
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const getBillingStatus = (bill: any): 'pending' | 'partial' | 'paid' => {
    const status = String(bill?.payment_status || '').toLowerCase();
    if (status === 'paid' || status === 'partial' || status === 'pending') return status;
    return 'pending';
  };

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return (items || []).filter((bill: any) => {
      const billNo = String(bill.bill_no || bill.bill_number || '').toLowerCase();
      const patientName = String(bill.patient?.name || '').toLowerCase();
      const patientId = String(bill.patient?.patient_id || '').toLowerCase();

      const matchesSearch = !term || billNo.includes(term) || patientName.includes(term) || patientId.includes(term);
      const matchesStatus = statusFilter === 'all' || getBillingStatus(bill) === statusFilter;
      
      // Completion filter: maps to payment_status for billing
      let matchesCompletion = true;
      if (completionFilter && completionFilter !== 'all') {
        const paymentStatus = String(bill.payment_status || 'pending').toLowerCase();
        if (completionFilter === 'completed') {
          // 'Paid' toggle — show only paid bills
          matchesCompletion = paymentStatus === 'paid';
        } else if (completionFilter === 'pending') {
          // 'Unpaid' toggle — show pending or partial bills
          matchesCompletion = paymentStatus === 'pending' || paymentStatus === 'partial';
        }
      }

      return matchesSearch && matchesStatus && matchesCompletion;
    });
  }, [items, searchTerm, statusFilter, completionFilter]);

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
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}-${mon}-${yyyy} ${hh}:${mi}:${ss}`;
  };

  const openViewBill = async (bill: any) => {
    setSelectedBill(bill);
    setShowViewModal(true);
    setViewLoading(true);
    setViewItems([]);

    try {
      // Fetch bill items from billing_item table
      const { data: itemsData, error: itemsError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('billing_id', bill.id)
        .order('created_at', { ascending: true });

      if (itemsError) {
        console.error('Error fetching bill items:', itemsError);
        setViewItems([]);
      } else {
        setViewItems(itemsData || []);
      }
    } catch (error) {
      console.error('Failed to load bill data:', error);
      setViewItems([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleThermalPrint = () => {
    if (!selectedBill) return;

    // If we don't have items yet, fetch them first
    if (viewItems.length === 0) {
      openViewBill(selectedBill);
      return;
    }

    const now = new Date();
    const printedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
    const printedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const billDate = selectedBill.created_at ? new Date(selectedBill.created_at) : now;
    const billDateStr = formatBillDateTime(billDate);

    const billNumber = selectedBill.bill_number || selectedBill.invoice_number || String(selectedBill.id || '').slice(0, 8).toUpperCase();
    const patientUhid = selectedBill.patient?.patient_id || selectedBill.patient?.uhid || selectedBill.patient_id || 'WALK-IN';
    const patientName = selectedBill.patient?.name || 'Unknown Patient';
    const currentStatus = getBillingStatus(selectedBill);
    const displayPaymentMethod = selectedBill.payment_method;
    const salesType = currentStatus === 'paid' ? String(displayPaymentMethod || 'cash').toUpperCase() : 'CREDIT';

    const amount = Number(selectedBill.total ?? selectedBill.subtotal ?? 0);
    const discountAmount = Number(selectedBill.discount ?? 0);
    const taxableAmount = amount - discountAmount;
    const cgstAmount = 0; // Lab usually doesn't show GST split unless specified
    const sgstAmount = 0;

    // Use viewItems if available, otherwise fall back to selectedBill.items
    const lineItems = viewItems.length > 0 ? viewItems : (Array.isArray(selectedBill.items) ? selectedBill.items : []);
    let itemsHtml = lineItems
      .map((it: any, idx: number) => {
        const qty = Number(it.qty) || 1;
        const total = Number(it.total_amount) || 0;
        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td class="text-left font-bold uppercase">${escapeHtml(it.description || it.test_name || it.service_name || 'Service')}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">₹${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');
    
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill no, patient, or UHID..."
              value={searchTerm}
              onChange={(e) => globalSearchTerm === undefined ? setLocalSearchTerm(e.target.value) : null}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              readOnly={globalSearchTerm !== undefined}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => globalStatusFilter === undefined ? setLocalStatusFilter(e.target.value) : null}
              className={`px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold text-gray-700 ${globalStatusFilter !== undefined ? 'opacity-50 pointer-events-none' : ''}`}
              disabled={globalStatusFilter !== undefined}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filteredItems.map((bill: any) => {
            const status = getBillingStatus(bill);
            const total = Number(bill.total ?? bill.subtotal ?? 0);
            const billNo = bill.bill_no || bill.bill_number || String(bill.id).slice(0, 8).toUpperCase();
            return (
              <div key={bill.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-2xl border border-gray-200 hover:bg-gray-50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-extrabold text-gray-900 truncate">Bill #{billNo}</div>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(bill.bill_type)}`}>
                      {getBillTypeIcon(bill.bill_type)} {String(bill.bill_type || 'lab').toUpperCase()}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusColor(status)}`}>
                      {String(status).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{bill.patient?.name} • {bill.patient?.patient_id}</div>
                  <div className="text-xs text-gray-500 truncate">Items: {(bill.items || []).length} • Total: ₹{total.toFixed(0)}</div>
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
                    onClick={() => {
                      setSelectedBill(bill);
                      handleThermalPrint();
                    }}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-900 text-xs font-black hover:bg-gray-200 inline-flex items-center gap-2"
                    title="Print"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-sm text-gray-500">No bills found.</div>
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
              onRefresh();
            }}
          />
        )}

        {/* View Modal */}
        {showViewModal && selectedBill && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Bill Details</h2>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedBill(null);
                    setViewItems([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {viewLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <span className="ml-3 text-gray-600">Loading bill details...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Bill Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Number</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.bill_number || selectedBill.invoice_number || String(selectedBill.id).slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Type</label>
                          <p className="text-lg font-semibold text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black border ${getBillTypeColor(selectedBill.bill_type)} mr-2`}>
                              {getBillTypeIcon(selectedBill.bill_type)} {String(selectedBill.bill_type || 'lab').toUpperCase()}
                            </span>
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Patient Name</label>
                          <p className="text-lg font-semibold text-gray-900">{selectedBill.patient?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">UHID</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.patient?.patient_id || selectedBill.patient?.uhid || selectedBill.patient_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Bill Date</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.created_at ? new Date(selectedBill.created_at).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Status</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {getBillingStatus(selectedBill).toUpperCase()}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Payment Method</label>
                          <p className="text-lg font-semibold text-gray-900">
                            {selectedBill.payment_method || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Services & Tests</h3>
                      {viewItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">S.No</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Service/Test Name</th>
                                <th className="text-center py-3 px-4 font-semibold text-gray-700">Quantity</th>
                                <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              {viewItems.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-gray-900">{index + 1}</td>
                                  <td className="py-3 px-4 text-gray-900">
                                    {item.description || item.test_name || item.service_name || 'Unknown Service'}
                                  </td>
                                  <td className="py-3 px-4 text-center text-gray-900">{item.qty || 1}</td>
                                  <td className="py-3 px-4 text-right text-gray-900">
                                    ₹{Number(item.total_amount || 0).toFixed(0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-gray-300">
                                <td colSpan={3} className="py-3 px-4 text-right font-semibold text-gray-900">
                                  Total Amount:
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-lg text-gray-900">
                                  ₹{Number(selectedBill.total || selectedBill.subtotal || 0).toFixed(0)}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-gray-500">No items found for this bill</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              {!viewLoading && (
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedBill(null);
                      setViewItems([]);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleThermalPrint();
                    }}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Printer size={16} />
                    Print Bill
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
