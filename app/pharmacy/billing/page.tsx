'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Receipt,
  DollarSign,
  ArrowLeft,
  Calendar,
  CreditCard,
  TrendingUp,
  IndianRupee,
  CheckCircle,
  Eye,
  Download,
  Edit,
  X,
  Trash2,
  AlertCircle,
  Clock,
  Plus,
  RotateCcw,
  FileText
} from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import { getCurrentUserProfile } from '@/src/lib/supabase'
import BillEditModal from '@/src/components/BillEditModal'

const roundToWholeNumber = (amount: number): number => {
  const decimal = amount - Math.floor(amount)
  return decimal >= 0.5 ? Math.ceil(amount) : Math.floor(amount)
}

interface PharmacyBill {
  id: string
  bill_number: string
  customer_name: string
  patient_uhid: string
  customer_type: string
  subtotal: number
  discount: number
  tax: number
  tax_percent?: number
  cgst_amount?: number
  sgst_amount?: number
  total_amount: number
  amount_paid: number
  payment_method: string
  payment_status: string
  created_at: string
  staff_id?: string
  staff_name?: string
  payments?: any[]
}

interface DashboardStats {
  todaysSales: number
  pendingOrders: number
  monthlyCollection: number
  totalPayments: number
}

export default function PharmacyBillingPage() {
  const router = useRouter()
  const [bills, setBills] = useState<PharmacyBill[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [showPaymentEditModal, setShowPaymentEditModal] = useState(false)
  const [selectedBill, setSelectedBill] = useState<PharmacyBill | null>(null)
  const [newPaymentMethod, setNewPaymentMethod] = useState('')
  const [updatingPayment, setUpdatingPayment] = useState(false)
  const embedded = false
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewItems, setViewItems] = useState<any[]>([])
  const [viewLoading, setViewLoading] = useState(false)
  const [billReturnsMap, setBillReturnsMap] = useState<Record<string, { return_id: string; return_number: string; return_date: string | null; refund_amount: number | null }[]>>({})
  const [selectedBillReturns, setSelectedBillReturns] = useState<any[]>([])
  const [selectedBillReturnItems, setSelectedBillReturnItems] = useState<any[]>([])
  const [returnsLoading, setReturnsLoading] = useState(false)
  // Payment details for split payments
  const [paymentDetails, setPaymentDetails] = useState<any[]>([])
  const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(false)
  // Pending bills modal state
  const [showPendingModal, setShowPendingModal] = useState(false)
  const [pendingBills, setPendingBills] = useState<any[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  // Current user state for admin check
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  // Mark as paid modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false)
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<PharmacyBill | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentReference, setPaymentReference] = useState('')
  const [splitPayments, setSplitPayments] = useState<{ method: string; amount: string; reference: string }[]>([
    { method: 'cash', amount: '', reference: '' }
  ])
  const [markingPaid, setMarkingPaid] = useState(false)

  // Bill Edit Modal state
  const [showBillEditModal, setShowBillEditModal] = useState(false)
  const [selectedBillForEdit, setSelectedBillForEdit] = useState<PharmacyBill | null>(null)
  const [editingBill, setEditingBill] = useState(false)

  // Advanced Filters
  const [attrFilterCategory, setAttrFilterCategory] = useState('') // 'name', 'combination', 'dosage_form', 'manufacturer'
  const [attrFilterValue, setAttrFilterValue] = useState('')
  const [timeframe, setTimeframe] = useState('all') // 'all', 'daily', 'weekly', 'monthly', 'yearly', 'date_range'
  const [timeframeValue, setTimeframeValue] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [medications, setMedications] = useState<any[]>([])
  const [matchedBillIds, setMatchedBillIds] = useState<string[] | null>(null)
  const [loadingFilters, setLoadingFilters] = useState(false)
  // Hospital settings
  const [hospital, setHospital] = useState({
    name: 'ANNAM PHARMACY',
    department: 'Pharmacy Department',
    address: '2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur - 628002',
    contact_number: 'Ph.No: 04639-252592',
    gst_number: 'GST29ABCDE1234F1Z5'
  })

  useEffect(() => {
    loadBillingData()
    loadMedications()

    // Load current user for admin check
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUserProfile()
        setCurrentUser(user)
        // Check if user is admin (you can adjust this logic based on your role system)
        const adminRoles = ['admin', 'administrator', 'md', 'superadmin', 'Administrator']
        setIsAdmin(adminRoles.includes(user?.role?.toLowerCase()) || adminRoles.includes(user?.role) || false)
      } catch (error) {
        console.error('Error loading current user:', error)
        setIsAdmin(false)
      }
    }

    loadCurrentUser()

      ; (async () => {
        try {
          const { data } = await supabase.from('hospital_settings').select('*').eq('id', 1).maybeSingle()
          if (data) {
            setHospital({
              name: data.name,
              department: data.department,
              address: data.address,
              contact_number: data.contact_number,
              gst_number: data.gst_number
            })
          }
        } catch { }
      })()
  }, [])

  const loadMedications = async () => {
    try {
      const { data } = await supabase.from('medications').select('*')
      setMedications(data || [])
    } catch (err) {
      console.error('Failed to load medications for filters', err)
    }
  }

  const getUniqueAttrValues = (category: string) => {
    if (!category) return []
    const key = category === 'dosage_form' ? 'dosage_form' :
      category === 'combination' ? 'combination' :
        category === 'manufacturer' ? 'manufacturer' : 'name'
    const vals = medications.map(m => m[key]).filter(v => v !== null && v !== undefined && v !== '')
    return Array.from(new Set(vals)).sort()
  }

  useEffect(() => {
    const fetchMatchedBills = async () => {
      if (!attrFilterCategory || !attrFilterValue) {
        setMatchedBillIds(null)
        return
      }

      setLoadingFilters(true)
      try {
        const key = attrFilterCategory === 'dosage_form' ? 'dosage_form' :
          attrFilterCategory === 'combination' ? 'combination' :
            attrFilterCategory === 'manufacturer' ? 'manufacturer' : 'name'
        const filteredMeds = medications.filter((m: any) => m[key] === attrFilterValue)
        const medIds = filteredMeds.map((m: any) => m.id)

        if (medIds.length === 0) {
          setMatchedBillIds([])
          return
        }

        const { data: items } = await supabase
          .from('billing_item')
          .select('billing_id')
          .in('medicine_id', medIds)

        const ids = Array.from(new Set((items || []).map((it: any) => String(it.billing_id)))) as string[]
        setMatchedBillIds(ids)
      } catch (err) {
        console.error('Filter error:', err)
      } finally {
        setLoadingFilters(false)
      }
    }

    fetchMatchedBills()
  }, [attrFilterCategory, attrFilterValue, medications])

  const loadBillingData = async () => {
    try {
      setLoading(true)

      // Fetch billing data first (no join to avoid FK/join errors)
      const { data: billsData, error: billsError } = await supabase
        .from('billing')
        .select(`
          id,
          bill_number,
          customer_name,
          customer_type,
          patient_id,
          subtotal,
          discount,
          tax,
          tax_percent,
          cgst_amount,
          sgst_amount,
          total,
          amount_paid,
          payment_method,
          payment_status,
          created_at,
          staff_id,
          bill_type
        `)
        .or('bill_type.eq.pharmacy,bill_type.is.null')
        .order('created_at', { ascending: false })

      if (billsError) throw billsError

      // Resolve patient UHIDs in a separate safe query
      const patientIds = Array.from(new Set((billsData || [])
        .map((b: any) => b.patient_id)
        .filter((id: string | null) => !!id)))

      let patientsMap: Record<string, { patient_id: string }> = {}
      if (patientIds.length > 0) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, patient_id')
          .in('id', patientIds as string[])

        if (!patientsError && patientsData) {
          console.log('Patients data fetched:', patientsData.slice(0, 3)) // Debug first 3 patients
          console.log('Sample patient data structure:', patientsData[0]) // Show structure
          patientsMap = patientsData.reduce((acc: any, p: any) => {
            acc[p.id] = { patient_id: p.patient_id }
            return acc
          }, {})
        } else {
          console.warn('Patients lookup skipped due to error:', patientsError)
        }
      }

      // Resolve staff names in a separate safe query
      const staffIds = Array.from(new Set((billsData || [])
        .map((b: any) => b.staff_id)
        .filter((id: string | null) => !!id)))

      let staffMap: Record<string, { first_name: string; last_name: string; employee_id: string; full_name: string }> = {}
      if (staffIds.length > 0) {
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id, first_name, last_name, employee_id')
          .in('id', staffIds as string[])

        if (!staffError && staffData) {
          staffMap = staffData.reduce((acc: any, s: any) => {
            const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim()
            acc[s.id] = {
              first_name: s.first_name || '',
              last_name: s.last_name || '',
              employee_id: s.employee_id || '',
              full_name: fullName || s.employee_id || 'Unknown Staff'
            }
            return acc
          }, {})
        } else {
          console.warn('Staff lookup skipped due to error:', staffError)
        }
      }

      // Resolve payments in a separate query
      const billIds = (billsData || []).map((b: any) => b.id)
      let paymentsMap: Record<string, any[]> = {}
      if (billIds.length > 0) {
        const { data: paymentsData, error: paymentsError } = await supabase
          .from('billing_payments')
          .select('billing_id, method, amount')
          .in('billing_id', billIds)

        if (!paymentsError && paymentsData) {
          paymentsMap = paymentsData.reduce((acc: any, p: any) => {
            if (!acc[p.billing_id]) acc[p.billing_id] = []
            acc[p.billing_id].push(p)
            return acc
          }, {})
        }
      }

      // Helper function to determine payment status with roundoff consideration
      const getPaymentStatusWithRoundoff = (totalAmount: number, amountPaid: number, currentStatus: string, paymentMethod: string) => {
        // For credit payments, always keep as pending until explicitly marked as paid through payment system
        if (paymentMethod === 'credit') return 'pending';

        // If already marked as paid and not credit, keep it as paid
        if (currentStatus === 'paid') return 'paid';

        // If no amount paid, it's pending
        if (!amountPaid || amountPaid <= 0) return 'pending';

        // Roundoff handling:
        const roundedPayable = Math.round(totalAmount);
        const matchesRoundedPayable = Math.abs(roundedPayable - amountPaid) <= 0.01;

        // Also allow tiny floating point differences
        const difference = Math.abs(totalAmount - amountPaid);
        const isFullyPaid = matchesRoundedPayable || difference <= 0.05;

        return isFullyPaid ? 'paid' : 'partial';
      };

      // Map bills data with proper formatting and resolved UHIDs and staff names
      const mappedBills = (billsData || []).map((bill: any) => {
        const totalAmount = bill.total || 0;
        const amountPaid = bill.amount_paid || 0;
        const currentStatus = bill.payment_status || 'pending';
        const paymentMethod = bill.payment_method || 'cash';

        // Determine correct payment status considering roundoff and payment method
        const correctedStatus = getPaymentStatusWithRoundoff(totalAmount, amountPaid, currentStatus, paymentMethod);

        return {
          id: bill.id,
          bill_number: bill.bill_number || `#${bill.id.slice(-8)}`,
          customer_name: bill.customer_name || 'Unknown',
          patient_uhid: bill.customer_type === 'patient'
            ? (patientsMap[bill.patient_id]?.patient_id || 'No UHID')
            : '',
          customer_type: bill.customer_type || 'patient',
          subtotal: Number(bill.subtotal || 0),
          discount: Number(bill.discount || bill.discount_amount || 0),
          tax: Number(bill.tax || bill.tax_amount || 0),
          tax_percent: Number(bill.tax_percent || 0),
          cgst_amount: Number(bill.cgst_amount || 0),
          sgst_amount: Number(bill.sgst_amount || 0),
          total_amount: Number(totalAmount),
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          payment_status: correctedStatus,
          created_at: bill.created_at,
          staff_id: bill.staff_id,
          staff_name: staffMap[bill.staff_id]?.full_name || 'Unknown Staff',
          payments: paymentsMap[bill.id] || []
        };
      })

      // Load sales return flags for these bills (for Returned badge)
      try {
        const billIds = (billsData || []).map((b: any) => b.id).filter(Boolean)
        if (billIds.length > 0) {
          const { data: srRows, error: srErr } = await supabase
            .from('sales_returns')
            .select('id, bill_id, return_number, return_date, refund_amount')
            .in('bill_id', billIds)

          if (srErr) {
            console.warn('Failed loading sales_returns for billing badges:', srErr)
            setBillReturnsMap({})
          } else {
            const map: Record<string, { return_id: string; return_number: string; return_date: string | null; refund_amount: number | null }[]> = {}
              ; (srRows || []).forEach((r: any) => {
                const bid = String(r.bill_id)
                if (!map[bid]) map[bid] = []
                map[bid].push({
                  return_id: String(r.id),
                  return_number: String(r.return_number || ''),
                  return_date: r.return_date || null,
                  refund_amount: r.refund_amount !== null && r.refund_amount !== undefined ? Number(r.refund_amount) : null
                })
              })
            setBillReturnsMap(map)
          }
        } else {
          setBillReturnsMap({})
        }
      } catch (e) {
        console.warn('Error loading sales_returns for billing badges:', e)
        setBillReturnsMap({})
      }

      // Auto-correct DB payment_status for non-credit bills that qualify as paid after roundoff.
      // This ensures UI + reports reflect "paid" instead of lingering "partial".
      // Also fix credit bills that were incorrectly marked as paid
      try {
        // Fix credit bills that were incorrectly marked as paid
        const creditBillsToFix = (billsData || [])
          .filter((bill: any) => {
            const paymentMethod = bill.payment_method || 'cash';
            const currentStatus = bill.payment_status || 'pending';
            return paymentMethod === 'credit' && currentStatus === 'paid';
          })
          .map((b: any) => b.id);

        if (creditBillsToFix.length > 0) {
          const { error: creditFixErr } = await supabase
            .from('billing')
            .update({ payment_status: 'pending' })
            .in('id', creditBillsToFix);

          if (creditFixErr) {
            console.warn('Failed to fix credit bill payment_status to pending:', creditFixErr);
          } else {
            console.log(`Fixed ${creditBillsToFix.length} credit bills to pending status`);
          }
        }

        // Auto-correct non-credit bills to paid if they qualify
        const idsToMarkPaid = (billsData || [])
          .filter((bill: any) => {
            const totalAmount = bill.total || 0;
            const amountPaid = bill.amount_paid || 0;
            const currentStatus = bill.payment_status || 'pending';
            const paymentMethod = bill.payment_method || 'cash';
            if (paymentMethod === 'credit') return false;
            if (currentStatus === 'paid') return false;
            const correctedStatus = getPaymentStatusWithRoundoff(totalAmount, amountPaid, currentStatus, paymentMethod);
            return correctedStatus === 'paid';
          })
          .map((b: any) => b.id);

        if (idsToMarkPaid.length > 0) {
          const { error: updErr } = await supabase
            .from('billing')
            .update({ payment_status: 'paid' })
            .in('id', idsToMarkPaid);

          if (updErr) {
            console.warn('Failed to auto-correct payment_status to paid:', updErr);
          }
        }
      } catch (autoFixErr) {
        console.warn('Auto-correct payment_status error:', autoFixErr);
      }

      setBills(mappedBills)

      // Calculate KPI stats from the bills data
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      const todaysCollection = mappedBills
        .filter((bill: any) => new Date(bill.created_at) >= startOfToday && bill.payment_status === 'paid')
        .reduce((sum: number, bill: any) => sum + bill.total_amount, 0)

      const monthlyCollection = mappedBills
        .filter((bill: any) => new Date(bill.created_at) >= startOfMonth && bill.payment_status === 'paid')
        .reduce((sum: number, bill: any) => sum + bill.total_amount, 0)

      const pendingDue = mappedBills
        .filter((bill: any) => bill.payment_status === 'pending')
        .reduce((sum: number, bill: any) => sum + bill.total_amount, 0)

      const totalPayments = mappedBills
        .filter((bill: any) => bill.payment_status === 'paid')
        .reduce((sum: number, bill: any) => sum + bill.total_amount, 0)

      setDashboardStats({
        todaysSales: todaysCollection,
        pendingOrders: pendingDue,
        monthlyCollection: monthlyCollection,
        totalPayments: totalPayments
      })
    } catch (err) {
      setError('Failed to load billing data')
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSettlePayment = async (bill: PharmacyBill) => {
    if (!confirm(`Mark bill ${bill.bill_number} as paid? This action will set the amount paid to ₹${Math.round(bill.total_amount)}.`)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('billing')
        .update({ 
          payment_status: 'paid',
          amount_paid: bill.total_amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.id)

      if (error) throw error

      await loadBillingData()
      alert('Payment settled successfully!')
    } catch (err: any) {
      setError('Failed to settle payment: ' + (err?.message || 'Unknown error'))
      console.error('Error settling payment:', err)
    } finally {
      setLoading(false)
    }
  }

  const openMarkPaidModal = (bill: PharmacyBill) => {
    setSelectedBillForPayment(bill)
    setSplitPayments([{ method: 'cash', amount: '', reference: '' }])
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentReference('')
    setShowMarkPaidModal(true)
  }

  const handleMarkAsPaid = async () => {
    const validPayments = splitPayments.filter(p => p.amount && parseFloat(p.amount) > 0)
    const totalPaymentAmount = validPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

    if (!selectedBillForPayment || validPayments.length === 0) {
      alert('Please enter at least one valid payment amount')
      return
    }

    const totalAmount = selectedBillForPayment.total_amount || 0
    const currentPaid = selectedBillForPayment.amount_paid || 0
    
    // For credit bills, amount_paid might already be equal to total_amount.
    // We treat the settle action as a new set of payments that replaces the credit.
    const isCreditBill = selectedBillForPayment.payment_method === 'credit'
    const remainingBalance = isCreditBill ? totalAmount : (totalAmount - currentPaid)
    const isRefund = remainingBalance < 0

    // Prevent overpayment if it's a regular payment (allow tiny rounding margin)
    if (!isRefund && totalPaymentAmount > remainingBalance + 0.1) {
      alert(`Total payment amount (₹${totalPaymentAmount.toFixed(2)}) exceeds remaining balance (₹${remainingBalance.toFixed(2)}).`)
      return
    }

    // Prevent over-refunding if it's a refund
    if (isRefund && totalPaymentAmount > Math.abs(remainingBalance) + 0.1) {
      alert(`Refund amount (₹${totalPaymentAmount.toFixed(2)}) exceeds the overpayment amount (₹${Math.abs(remainingBalance).toFixed(2)}).`)
      return
    }

    try {
      setMarkingPaid(true)
      
      // Calculate new total paid
      // If it's a credit bill we are settling, we might need special logic for amount_paid.
      // But if we follow the existing pattern, we just add the new cash payments.
      // NOTE: If amount_paid already included the credit, adding more might exceed total.
      // However, the existing DB pattern seems to expect amount_paid to reflect total money accounted for.
      // If we are settling credit, we ideally want to replace the credit payment with cash.
      
      const newTotalPaid = isRefund ? currentPaid - totalPaymentAmount : currentPaid + totalPaymentAmount
      
      console.log('Recording multiple payments:', {
        billId: selectedBillForPayment.id,
        totalPayment: totalPaymentAmount,
        payments: validPayments,
        currentPaid,
        newTotalPaid
      })

      // Update billing table with correct payment status and overall method (use first one as primary)
      let paymentStatus = 'partial'
      const difference = Math.abs(totalAmount - newTotalPaid)

      if (difference <= 0.1 || newTotalPaid >= totalAmount) {
        paymentStatus = 'paid'
      }

      // If it was a credit bill and we are now paying it, change the method to the first real payment method
      const mainPaymentMethod = validPayments[0].method

      const { error: billingError } = await supabase
        .from('billing')
        .update({
          payment_status: paymentStatus,
          amount_paid: newTotalPaid,
          payment_method: mainPaymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBillForPayment.id)

      if (billingError) {
        console.error('Billing update error:', billingError)
        throw billingError
      }

      // Insert all payment records
      for (const p of validPayments) {
        const amount = parseFloat(p.amount)
        const transactionAmount = isRefund ? -amount : amount
        
        const paymentData: any = {
          billing_id: selectedBillForPayment.id,
          method: p.method,
          amount: transactionAmount,
          reference: p.reference || null,
          received_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        }

        if (currentUser?.id && currentUser.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          paymentData.received_by = currentUser.id
        }

        const { error: pErr } = await supabase
          .from('billing_payments')
          .insert(paymentData)

        if (pErr) {
          console.error('Individual payment record error:', pErr)
          // We don't throw here to ensure others are attempted, though usually they'd all fail if one does
        }
      }

      await loadBillingData()
      setShowMarkPaidModal(false)
      setSelectedBillForPayment(null)

      if (isRefund) {
        alert(`Refund of ₹${totalPaymentAmount.toFixed(2)} recorded successfully.`)
      } else if (paymentStatus === 'paid') {
        alert('Payment recorded successfully! Bill marked as fully paid.')
      } else {
        alert(`Partial payment of ₹${totalPaymentAmount.toFixed(2)} recorded successfully.`)
      }
    } catch (err: any) {
      console.error('Full error object:', err)
      setError('Failed to record payment: ' + (err?.message || JSON.stringify(err)))
      alert('Failed to record payment: ' + (err?.message || 'Unknown error'))
    } finally {
      setMarkingPaid(false)
    }
  }

  const handleDeleteBill = async (billId: string, billNumber: string) => {
    if (!confirm(`Are you sure you want to delete bill ${billNumber}? This action cannot be undone and will permanently remove all bill data.`)) {
      return
    }

    try {
      setLoading(true)

      // First delete related billing items
      const { error: itemsError } = await supabase
        .from('billing_item')
        .delete()
        .eq('billing_id', billId)

      if (itemsError) throw itemsError

      // Then delete related billing payments
      const { error: paymentsError } = await supabase
        .from('billing_payments')
        .delete()
        .eq('billing_id', billId)

      if (paymentsError) throw paymentsError

      // Finally delete the bill itself
      const { error: billError } = await supabase
        .from('billing')
        .delete()
        .eq('id', billId)

      if (billError) throw billError

      await loadBillingData()
      alert('Bill deleted successfully!')
    } catch (err: any) {
      setError('Failed to delete bill: ' + (err?.message || 'Unknown error'))
      console.error('Error deleting bill:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditPaymentMethod = (bill: PharmacyBill) => {
    setSelectedBill(bill)
    setNewPaymentMethod(bill.payment_method)
    setShowPaymentEditModal(true)
  }

  const openReturnForBill = (bill: PharmacyBill) => {
    router.push(`/pharmacy/sales-return-v2?billId=${bill.id}`)
  }

  const handleSaveBillEdit = async (updatedBill: any, updatedItems: any[]) => {
    if (!selectedBillForEdit) return

    try {
      setEditingBill(true)

      console.log('Selected bill for edit:', selectedBillForEdit)
      console.log('Updated bill data:', updatedBill)
      console.log('Updated items:', updatedItems)

      // 1) Update existing bill items (qty edits). Avoid delete+insert because inventory triggers run.
      // updatedItems come from BillEditModal which loads existing billing_item rows.
      for (const item of updatedItems) {
        if (!item?.id) {
          throw new Error('Missing billing_item.id in edited items payload')
        }

        const qty = Number(item.qty)
        const unitAmount = Number(item.unit_amount)
        const lineTotal = Number(item.total_amount)

        const { error: itemUpdErr } = await supabase
          .from('billing_item')
          .update({
            qty,
            unit_amount: unitAmount,
            total_amount: lineTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .eq('billing_id', selectedBillForEdit.id)

        if (itemUpdErr) {
          console.error('billing_item update error:', {
            message: (itemUpdErr as any)?.message,
            details: (itemUpdErr as any)?.details,
            hint: (itemUpdErr as any)?.hint,
            code: (itemUpdErr as any)?.code,
            raw: itemUpdErr
          })
          throw itemUpdErr
        }
      }

      // 2) Try to update bill header totals (do not hard-fail if blocked by DB rules).
      const subtotal = Number(updatedBill.subtotal)
      const tax = Number(updatedBill.tax)
      const total = Number(updatedBill.total)

      const billingUpdate = await supabase
        .from('billing')
        .update({
          subtotal: Number.isFinite(subtotal) ? subtotal : 0,
          tax: Number.isFinite(tax) ? tax : 0,
          total: Number.isFinite(total) ? total : subtotal,
          balance_due: (Number.isFinite(total) ? total : subtotal) - (Number(selectedBillForEdit.amount_paid) || 0),
          updated_at: new Date().toISOString(),
          bill_type: 'pharmacy'
        })
        .eq('id', selectedBillForEdit.id)
        .select('id')
        .single()

      if (billingUpdate.error) {
        console.error('Bill update error details:', {
          status: (billingUpdate as any)?.status,
          message: (billingUpdate.error as any)?.message,
          details: (billingUpdate.error as any)?.details,
          hint: (billingUpdate.error as any)?.hint,
          code: (billingUpdate.error as any)?.code,
          raw: billingUpdate.error
        })
        // Do not throw here; item quantities are already updated.
      }

      await loadBillingData()
      alert('Bill updated successfully!')
    } catch (err: any) {
      setError('Failed to update bill: ' + (err?.message || 'Unknown error'))
      console.error('Error updating bill:', err)
    } finally {
      setEditingBill(false)
    }
  }

  const openPendingBillsModal = async () => {
    setShowPendingModal(true)
    setPendingLoading(true)

    try {
      // Get all bills with pending or partial payment status
      const pendingBillsData = bills.filter(bill =>
        bill.payment_status === 'pending' || bill.payment_status === 'partial'
      )

      // Fetch bill items for each pending bill
      const billsWithItems = await Promise.all(
        pendingBillsData.map(async (bill) => {
          try {
            const { data: itemsData, error: itemsError } = await supabase
              .from('billing_item')
              .select('*')
              .eq('billing_id', bill.id)

            return {
              ...bill,
              items: itemsData || [],
              itemsError: itemsError
            }
          } catch (error) {
            console.error(`Error fetching items for bill ${bill.id}:`, error)
            return {
              ...bill,
              items: [],
              itemsError: error
            }
          }
        })
      )

      setPendingBills(billsWithItems)
    } catch (error) {
      console.error('Error loading pending bills:', error)
    } finally {
      setPendingLoading(false)
    }
  }

  const openViewBill = async (bill: PharmacyBill) => {
    setSelectedBill(bill)
    setShowViewModal(true)
    setViewLoading(true)
    setPaymentDetailsLoading(true)
    setReturnsLoading(true)
    setSelectedBillReturns([])
    setSelectedBillReturnItems([])

    try {
      // Fetch bill items
      const { data: itemsData, error: itemsError } = await supabase
        .from('billing_item')
        .select('*')
        .eq('billing_id', bill.id)
      if (itemsError) throw itemsError
      setViewItems(itemsData || [])

      // Fetch payment details for split payments
      const { data: paymentData, error: paymentError } = await supabase
        .from('billing_payments')
        .select('*')
        .eq('billing_id', bill.id)
        .order('created_at', { ascending: true })

      if (paymentError) {
        console.warn('Failed to load payment details:', paymentError)
        setPaymentDetails([])
      } else {
        setPaymentDetails(paymentData || [])
      }

      // Fetch returns for this bill
      try {
        const { data: sr, error: srErr } = await supabase
          .from('sales_returns')
          .select('id, return_number, return_date, reason, refund_mode, refund_amount, status, remarks')
          .eq('bill_id', bill.id)
          .order('created_at', { ascending: false })

        if (srErr) {
          console.warn('Failed to load sales_returns for bill:', srErr)
          setSelectedBillReturns([])
          setSelectedBillReturnItems([])
        } else {
          setSelectedBillReturns(sr || [])

          const returnIds = (sr || []).map((r: any) => r.id).filter(Boolean)
          if (returnIds.length > 0) {
            const { data: sri, error: sriErr } = await supabase
              .from('sales_return_items')
              .select('return_id, medication_id, batch_number, quantity, selling_rate, total_amount, return_reason, restock_status')
              .in('return_id', returnIds)

            if (sriErr) {
              console.warn('Failed to load sales_return_items for bill:', sriErr)
              setSelectedBillReturnItems([])
            } else {
              setSelectedBillReturnItems(sri || [])
            }
          }
        }
      } catch (e) {
        console.warn('Error loading return details for bill:', e)
        setSelectedBillReturns([])
        setSelectedBillReturnItems([])
      }
    } catch (e) {
      console.error('Failed to load bill data', e)
      setViewItems([])
      setPaymentDetails([])
      setSelectedBillReturns([])
      setSelectedBillReturnItems([])
    } finally {
      setViewLoading(false)
      setPaymentDetailsLoading(false)
      setReturnsLoading(false)
    }
  }

  const hasReturns = (billId: string) => {
    const rows = billReturnsMap[billId]
    return Array.isArray(rows) && rows.length > 0
  }

  const printBill = () => {
    if (!selectedBill) return

    // Generate payment details HTML
    const paymentDetailsHtml = paymentDetails.length > 0 ? `
      <div style="margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 6px;">
        <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #111827;">Payment Details</h4>
        ${paymentDetails.map(payment => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 13px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 500;">${payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}</span>
              ${payment.reference ? `<span style="color: #6b7280;">(${payment.reference})</span>` : ''}
            </div>
            <span style="font-weight: 600; color: #059669;">₹${Number(payment.amount || 0).toFixed(2)}</span>
          </div>
        `).join('')}
        ${paymentDetails.length > 1 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; margin-top: 4px; border-top: 1px solid #e5e7eb; font-weight: 600; font-size: 13px;">
            <span>Total Paid</span>
            <span style="color: #2563eb;">₹${paymentDetails.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}</span>
          </div>
        ` : ''}
      </div>
    ` : '';

    const itemsHtml = viewItems.map((it: any, idx: number) => `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:6px">${idx + 1}</td>
        <td style="padding:6px">
          <div style="font-weight:500">${it.description || ''}</div>
        </td>
        <td style="padding:6px;text-align:center">${it.qty}</td>
        <td class="amount-cell" style="padding:6px;text-align:right;padding-right:4mm">₹${roundToWholeNumber(Number(it.total_amount || 0))}</td>
      </tr>
    `).join('')

    const totalAmount = Number(selectedBill.total_amount || 0)
    let discount = Number(selectedBill.discount || 0)
    let tax = Number(selectedBill.tax || 0)
    
    // If subtotal is missing, derive it from total, tax, and discount
    let subtotal = Number(selectedBill.subtotal || 0)
    if (!subtotal) {
      subtotal = totalAmount - tax + discount
    }

    const w = window.open('', 'printwin')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>Bill ${selectedBill.bill_number}</title>
          <style>
            @page{margin:5mm}
            body{font-family:'Times New Roman', Times, serif;color:#111827}
            table{font-family:'Times New Roman', Times, serif;border-collapse:collapse;width:100%}
            .invoice-header{font-family:'Times New Roman', Times, serif;line-height:1.3;margin-bottom:6px;text-align:center}
            .bill-info td{font-family:'Times New Roman', Times, serif;word-break:break-all}
            .amount-cell{font-family:'Times New Roman', Times, serif;text-align:right;padding-right:4mm}
            .label{font-family:'Times New Roman', Times, serif;font-weight:400;color:#333}
            .value{font-family:'Times New Roman', Times, serif;font-weight:600}
            .totals{font-family:'Times New Roman', Times, serif;page-break-inside:avoid;margin-bottom:5mm;border-top:2px solid #d1d5db;padding-top:8px}
            .invoice-footer{font-family:'Times New Roman', Times, serif;position:relative;margin-top:10mm;text-align:center;font-size:10pt}
            th{font-family:'Times New Roman', Times, serif;padding:6px;text-align:left}
            td{font-family:'Times New Roman', Times, serif;padding:6px}
            h1,h2,h3,div,p,span,strong{font-family:'Times New Roman', Times, serif}
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <h2 style="margin:0;font-size:22px;font-weight:700">${hospital.name}</h2>
            <div>${hospital.department}</div>
            <div style="font-size:12px;color:#4b5563">${hospital.address}</div>
            <div style="font-size:12px;color:#4b5563">${hospital.contact_number}</div>
            <div style="font-size:12px;color:#6b7280">GST No: ${hospital.gst_number}</div>
            <div style="margin-top:2px;font-weight:600">INVOICE</div>
          </div>

          <table class="bill-info" style="margin-bottom:8px;font-size:14px">
            <tr>
              <td><strong>Bill No:</strong> ${selectedBill.bill_number}</td>
              <td><strong>To:</strong> ${selectedBill.customer_name || 'WALK-IN CUSTOMER'}</td>
            </tr>
            <tr>
              <td><strong>Date:</strong> ${new Date(selectedBill.created_at).toLocaleString()}</td>
              <td><strong>Status:</strong> ${selectedBill.payment_status}</td>
            </tr>
          </table>

          ${paymentDetailsHtml}

          <table style="font-size:14px;margin-bottom:10px">
            <thead>
              <tr style="border-bottom:2px solid #d1d5db">
                <th style="padding:6px;width:40px">S.No</th>
                <th style="padding:6px">Drug Name</th>
                <th style="padding:6px;text-align:center">Qty</th>
                <th style="padding:6px;text-align:right">Amount</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals" style="font-size:14px">
            <div style="display:flex;justify-content:space-between"><span class="label">Taxable Amt</span><span class="value">₹${roundToWholeNumber(subtotal)}</span></div>
            <div style="display:flex;justify-content:space-between"><span class="label">Dist Amt</span><span class="value">${discount > 0 ? `-₹${roundToWholeNumber(discount)}` : '₹0'}</span></div>
            <div style="display:flex;justify-content:space-between"><span class="label">CGST Amt</span><span class="value">₹${(tax / 2).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between"><span class="label">SGST Amt</span><span class="value">₹${(tax / 2).toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:600;border-top:1px solid #e5e7eb;padding-top:6px"><span>Total Amount</span><span>₹${roundToWholeNumber(totalAmount)}</span></div>
          </div>

          <div class="invoice-footer">
            <div style="display:flex;justify-content:space-between;align-items:flex-end">
              <div>
                <div>Printed Date: ${new Date().toLocaleDateString()}</div>
                <div>Printed Time: ${new Date().toLocaleTimeString()}</div>
              </div>
              <div>
                <div style="height:40px"></div>
                <div style="border-top:1px solid #d1d5db;padding-top:4px">Pharmacist Signature</div>
              </div>
            </div>
          </div>
          <script>window.onload=() => {window.print(); setTimeout(()=>window.close(), 300);}</script>
        </body>
      </html>
    `)
    w.document.close()
  }

  const showThermalPreview = () => {
    showThermalPreviewWithLogo();
  };

  const showThermalPreviewWithLogo = () => {
    if (!selectedBill || !viewItems.length) return;

    const { name, address, contact_number, gst_number } = hospital;

    const itemsHtml = viewItems.map((item: any, index: number) => `
      <tr>
        <td class="text-center">${index + 1}</td>
        <td class="text-left uppercase">${item.description || item.name || 'Unknown'}</td>
        <td class="text-center">${item.qty || 1}</td>
        <td class="text-right">₹${Number(item.total_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    // Calculate totals
    const totalAmount = Number(selectedBill.total_amount || 0);
    const discount = Number(selectedBill.discount || 0);
    
    // Determine tax components
    // If cgst/sgst are stored, use them. Otherwise, if total tax is stored, split it.
    // If no tax is stored, calculate it as 12% inclusive GST.
    let cgst = Number(selectedBill.cgst_amount || 0);
    let sgst = Number(selectedBill.sgst_amount || 0);
    let tax = Number(selectedBill.tax || 0);

    if (cgst <= 0 && sgst <= 0) {
      if (tax > 0) {
        cgst = tax / 2;
        sgst = tax / 2;
      } else if (totalAmount > 0) {
        // Fallback: use stored tax_percent or default to 12% GST inclusive
        const percent = selectedBill.tax_percent || 12;
        const taxable = totalAmount / (1 + (percent / 100));
        tax = totalAmount - taxable;
        cgst = tax / 2;
        sgst = tax / 2;
      }
    }

    // Taxable Amount is the total net amount minus tax
    const taxableAmount = totalAmount - (cgst + sgst);

    const now = new Date();
    const printedDate = now.toLocaleDateString('en-GB').replace(/\//g, '-');
    const printedTime = now.toLocaleTimeString('en-GB');

    // Get patient UHID
    const patientUhid = selectedBill.patient_uhid || 'WALK-IN';

    // Get sales type
    let salesType = selectedBill.payment_method?.toUpperCase() || 'CASH';
    if (salesType === 'CREDIT') {
      salesType = 'CREDIT';
    }

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${selectedBill.bill_number}</title>
          <style>
            @page { margin: 3mm; size: 80mm auto; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              margin: 0; 
              padding: 0px;
              font-size: 11px;
              width: 77mm;
            }
            .center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .logo { width: 250px; height: auto; margin-bottom: 5px; }
            .invoice-box {
              border: 1px solid #000;
              margin: 5px 0;
            }

            .invoice-info {
              padding: 4px;
              font-size: 7px;
              color: #444;
            }
            .invoice-info td:first-child {
              font-weight: bold;
              width: 30%;
            }
            .invoice-info td {
              font-weight: normal;
            }

            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              border: none;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
            }
            .receipt-table th {
              border: 1px solid #000;
              border-top: none;
              border-left: 1px solid #000;
              border-right: 1px solid #000;
              padding: 4px 2px;
              text-align: center;
              text-transform: uppercase;
              font-size: 12px;
              font-weight: bold;
            }
            .receipt-table td {
              border-left: 1px solid #000;
              border-right: 1px solid #000;
              padding: 3px 2px;
              font-size: 12px;
              font-weight: bold;
            }
            /* Remove outer vertical borders to avoid duplicate with invoice-box */
            .receipt-table th:first-child, .receipt-table td:first-child { border-left: none; }
            .receipt-table th:last-child, .receipt-table td:last-child { border-right: none; }

            .totals-box {
              width: 100%;
              border-collapse: collapse;
              border: none;
              font-size: 11px;
            }
            .totals-box td {
              padding: 2px 4px;
              border: none;
            }
            .totals-label {
              text-align: right;
              width: 70%;
              font-weight: bold;
            }
            .totals-value {
              text-align: right;
              width: 30%;
              font-weight: bold;
            }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamPharmacy.png" alt="ANNAM LOGO" class="logo" />
            <div style="font-size: 15px; font-weight: bold;">${name}</div>
            <div style="font-size: 10px;">${address}</div>
            <div style="font-size: 10px;">${contact_number}</div>
            <div style="font-size: 10px;">GST No: ${gst_number}</div>
          </div>

          <div class="invoice-box">
            <div class="center" style="border-bottom: 1px solid #000; padding: 2px;">
              <span style="font-size: 12px; letter-spacing: 2px; font-weight: bold;">INVOICE</span>
            </div>

            <div class="invoice-info">
              <table style="width: 100%; border-collapse: collapse; border: none;">
                <tr><td style="width: 30%; border: none;">UHID</td><td style="border: none;">: ${patientUhid}</td></tr>
                <tr><td style="border: none;">Patient Name</td><td style="border: none;">: ${selectedBill.customer_name || 'WALK-IN CUSTOMER'}</td></tr>
                <tr style="height: 5px;"><td style="border: none;"></td><td style="border: none;"></td></tr>
                <tr><td style="border: none;">Bill No</td><td style="border: none;">: ${selectedBill.bill_number}</td></tr>
                <tr><td style="border: none;">Date</td><td style="border: none;">: ${new Date(selectedBill.created_at).toLocaleString()}</td></tr>
                <tr><td style="border: none;">Sales Type</td><td style="border: none;">: ${salesType}</td></tr>
              </table>
            </div>

            <table class="receipt-table">
              <thead>
                <tr>
                  <th style="width: 10%;">.No</th>
                  <th style="width: 55%; text-align: left;">DRUG NAME</th>
                  <th style="width: 15%;">Qty</th>
                  <th style="width: 20%; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="border-top: 1px solid #000;">
              <table class="totals-box">
                <tbody>
                  <tr><td class="totals-label">Taxable Amount</td><td class="totals-value">₹${taxableAmount.toFixed(2)}</td></tr>
                  <tr><td class="totals-label">Disc Amt:</td><td class="totals-value">₹${discount.toFixed(2)}</td></tr>
                  <tr><td class="totals-label">CGST Amt:</td><td class="totals-value">₹${cgst.toFixed(2)}</td></tr>
                  <tr><td class="totals-label">SGST Amt:</td><td class="totals-value">₹${sgst.toFixed(2)}</td></tr>
                  <tr><td class="totals-label" style="font-size: 13px; border-top: 1px solid #000;">Tot.Net.Amt:</td><td class="totals-value" style="font-size: 13px; border-top: 1px solid #000;">₹${totalAmount.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px;">
            <div style="font-size: 9px; font-weight: bold;">
              <p>PRINTED ON ${printedDate}</p>
              <p>${printedTime}</p>
            </div>
            <div style="text-align: right; font-size: 9px; font-weight: bold;">
              <p style="margin-bottom: 25px;">PHARMACIST SIGNATURE</p>
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); }
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

  const handleUpdatePaymentMethod = async () => {
    if (!selectedBill || !newPaymentMethod) return

    if (!confirm(`Change payment method from ${selectedBill.payment_method} to ${newPaymentMethod}?`)) {
      return
    }

    try {
      setUpdatingPayment(true)
      
      // 1. Update the bill header
      const { error: billError } = await supabase
        .from('billing')
        .update({
          payment_method: newPaymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBill.id)

      if (billError) throw billError

      // 2. Also update associated payment records in billing_payments
      // This ensures reports and receipts reflect the updated method
      const { error: paymentsError } = await supabase
        .from('billing_payments')
        .update({ method: newPaymentMethod })
        .eq('billing_id', selectedBill.id)

      if (paymentsError) {
        console.warn('Failed to update associated payment records:', paymentsError)
        // We don't throw here as the main bill was updated, but we log it
      }

      await loadBillingData()
      setShowPaymentEditModal(false)
      setSelectedBill(null)
      setNewPaymentMethod('')
      alert('Payment method updated successfully!')
    } catch (err: any) {
      setError('Failed to update payment method: ' + (err?.message || 'Unknown error'))
      console.error('Error updating payment method:', err)
    } finally {
      setUpdatingPayment(false)
    }
  }

  const filteredBills = bills.filter(bill => {
    const matchesSearch = (bill.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.patient_uhid || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.bill_number || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || bill.payment_status === statusFilter
    const matchesPayment = paymentFilter === 'all' || bill.payment_method === paymentFilter

    // Attribute Filter
    const matchesAttr = matchedBillIds === null || matchedBillIds.includes(bill.id)

    // Timeframe Filter
    let matchesTimeframe = true
    if (timeframe !== 'all') {
      const billDate = new Date(bill.created_at)

      if (timeframe === 'date_range') {
        if (startDate && endDate) {
          const start = new Date(startDate)
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999) // Include the entire end date
          matchesTimeframe = billDate >= start && billDate <= end
        } else if (startDate) {
          const start = new Date(startDate)
          matchesTimeframe = billDate >= start
        } else if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          matchesTimeframe = billDate <= end
        } else {
          matchesTimeframe = true // No date range selected
        }
      } else if (timeframeValue) {
        const selectedDate = new Date(timeframeValue)

        if (timeframe === 'daily') {
          matchesTimeframe = billDate.toDateString() === selectedDate.toDateString()
        } else if (timeframe === 'weekly') {
          const start = new Date(selectedDate)
          start.setDate(selectedDate.getDate() - selectedDate.getDay())
          const end = new Date(start)
          end.setDate(start.getDate() + 6)
          matchesTimeframe = billDate >= start && billDate <= end
        } else if (timeframe === 'monthly') {
          matchesTimeframe = billDate.getMonth() === selectedDate.getMonth() &&
            billDate.getFullYear() === selectedDate.getFullYear()
        } else if (timeframe === 'yearly') {
          matchesTimeframe = billDate.getFullYear() === selectedDate.getFullYear()
        }
      }
    }

    return matchesSearch && matchesStatus && matchesPayment && matchesAttr && matchesTimeframe
  })

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'partial':
        return 'bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium'
      case 'cancelled':
        return 'bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium'
      default:
        return 'bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium'
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <IndianRupee className="w-4 h-4 text-green-600" />
      case 'card':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'upi':
        return <Receipt className="w-4 h-4 text-purple-600" />
      case 'split':
        return <Receipt className="w-4 h-4 text-indigo-600" />
      case 'credit':
        return <DollarSign className="w-4 h-4 text-orange-600" />
      case 'others':
        return <DollarSign className="w-4 h-4 text-gray-600" />
      default:
        return <Receipt className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading billing data...</div>
      </div>
    )
  }

  return (
    <div className={embedded ? "space-y-6" : "max-w-[1800px] mx-auto p-6 space-y-6"}>
      {/* Header (hidden when embedded) */}
      {!embedded && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/pharmacy">
              <button
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pharmacy Billing History</h1>
              <p className="text-gray-600 mt-1">Manage bills and payment records</p>
            </div>
          </div>
          <Link href="/pharmacy/billing/reports">
            <button className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all font-semibold">
              <FileText className="h-5 w-5" />
              Report
            </button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Collection</p>
                <p className="text-2xl font-bold text-green-600">₹{Math.round(dashboardStats.todaysSales).toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Collection</p>
                <p className="text-2xl font-bold text-blue-600">₹{Math.round(dashboardStats.monthlyCollection).toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200" onClick={openPendingBillsModal}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Due</p>
                <p className="text-2xl font-bold text-orange-600">₹{dashboardStats.pendingOrders.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-purple-600">₹{Math.round(dashboardStats.totalPayments).toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Receipt className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        {/* Row 1: Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search bills or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="upi">UPI</option>
            <option value="split">Split</option>
            <option value="credit">Credit</option>
            <option value="others">Others</option>
          </select>

          <div className="text-sm font-medium text-blue-600 bg-blue-50 px-4 py-2 rounded-lg flex items-center justify-center border border-blue-100">
            {filteredBills.length} results found
          </div>
        </div>

        {/* Row 2: Advanced Dynamic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Item Filter Category</label>
            <select
              value={attrFilterCategory}
              onChange={(e) => {
                setAttrFilterCategory(e.target.value)
                setAttrFilterValue('')
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 font-medium"
            >
              <option value="">-- Choose Category --</option>
              <option value="name">Medicine Name</option>
              <option value="combination">Combination</option>
              <option value="dosage_form">Dosage Type</option>
              <option value="manufacturer">Manufacturer</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Filter Value</label>
            <select
              value={attrFilterValue}
              onChange={(e) => setAttrFilterValue(e.target.value)}
              disabled={!attrFilterCategory}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed font-medium"
            >
              <option value="">All {attrFilterCategory ? (attrFilterCategory === 'dosage_form' ? 'Dosage Types' : attrFilterCategory.charAt(0).toUpperCase() + attrFilterCategory.slice(1) + 's') : 'Values'}</option>
              {getUniqueAttrValues(attrFilterCategory).map(val => (
                <option key={val} value={val}>{val}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase">Timeframe Range</label>
            <select
              value={timeframe}
              onChange={(e) => {
                setTimeframe(e.target.value)
                setTimeframeValue('')
                setStartDate('')
                setEndDate('')
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 font-medium"
            >
              <option value="all">All Dates</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="date_range">Date Range</option>
            </select>
          </div>

          {timeframe === 'date_range' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  min={startDate}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Select {timeframe === 'weekly' ? 'Week Star' : timeframe === 'all' ? 'Date' : timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</label>
              <input
                type={timeframe === 'monthly' ? 'month' : timeframe === 'yearly' ? 'number' : 'date'}
                value={timeframeValue}
                onChange={(e) => setTimeframeValue(e.target.value)}
                disabled={timeframe === 'all'}
                placeholder={timeframe === 'yearly' ? "e.g. 2026" : ""}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed font-medium"
              />
            </div>
          )}
        </div>

        {loadingFilters && (
          <div className="flex items-center gap-2 text-xs text-blue-600 animate-pulse font-medium bg-blue-50 p-2 rounded-lg border border-blue-100">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce"></div>
            Filtering bills by selected medicine attribute...
          </div>
        )}
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewBill(bill)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{bill.bill_number}</span>
                      {hasReturns(bill.id) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          Returned
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">{bill.customer_name}</div>
                      <div className="text-xs text-gray-500 capitalize">{bill.customer_type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bill.patient_uhid || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ₹{Math.round(bill.total_amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col gap-1.5 group/payment relative">
                      {bill.payments && bill.payments.length > 0 ? (
                        bill.payments.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            {getPaymentMethodIcon(p.method)}
                            <span className="capitalize text-[11px] font-medium text-gray-700">
                              {p.method} (₹{Math.round(p.amount)})
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(bill.payment_method)}
                          <span className="capitalize">{bill.payment_method}</span>
                        </div>
                      )}
                      
                      {/* Quick Edit Button */}
                      {bill.payment_status !== 'cancelled' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditPaymentMethod(bill) }}
                          className="absolute -right-2 top-0 p-1 text-purple-600 hover:bg-purple-50 rounded-full opacity-0 group-hover/payment:opacity-100 transition-opacity"
                          title="Change Payment Mode"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadge(bill.payment_status)}>
                      {bill.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(bill.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-800" onClick={(e) => { e.stopPropagation(); openViewBill(bill) }} title="View Bill">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800" onClick={(e) => { e.stopPropagation(); (async () => { await openViewBill(bill); setTimeout(() => printBill(), 150); })(); }} title="Download / Print">
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openReturnForBill(bill) }}
                        className="text-orange-600 hover:text-orange-800"
                        title="Sales Return"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      {bill.payment_status !== 'cancelled' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditPaymentMethod(bill) }}
                          className="text-purple-600 hover:text-purple-800"
                          title="Edit Payment Method"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      )}
                      {(bill.payment_status === 'pending' || bill.payment_status === 'partial') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openMarkPaidModal(bill) }}
                          className="text-orange-600 hover:text-orange-800"
                          title="Mark as Paid / Refund"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBills.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bills found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Bill View Modal */}
      {showViewModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowViewModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Bill {selectedBill.bill_number}</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowViewModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-700 mb-4 grid grid-cols-2 gap-2">
              <div><span className="font-medium">Customer:</span> {selectedBill.customer_name}</div>
              {selectedBill.patient_uhid && (
                <div><span className="font-medium">UHID:</span> {selectedBill.patient_uhid}</div>
              )}
              <div><span className="font-medium">Date:</span> {new Date(selectedBill.created_at).toLocaleString()}</div>
              <div><span className="font-medium">Payment Status:</span> <span className={getStatusBadge(selectedBill.payment_status)}>{selectedBill.payment_status}</span></div>
              {(selectedBill.amount_paid !== undefined && selectedBill.amount_paid !== selectedBill.total_amount) && (
                <div className="col-span-2">
                  <span className="font-medium">Payment:</span> ₹{roundToWholeNumber(selectedBill.amount_paid || 0)} / ₹{roundToWholeNumber(selectedBill.total_amount || 0)}
                  {selectedBill.payment_status === 'partial' && (
                    <span className="ml-2 text-orange-600 text-xs">
                      {Math.abs((selectedBill.total_amount || 0) - (selectedBill.amount_paid || 0)) < 1 
                        ? '(Roundoff applied)' 
                        : '(Partial)'}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Payment Details */}
            {paymentDetails.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Details</h4>
                <div className="space-y-2">
                  {paymentDetails.map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        {getPaymentMethodIcon(payment.method)}
                        <span className="capitalize">{payment.method}</span>
                        {payment.reference && (
                          <span className="text-gray-500">({payment.reference})</span>
                        )}
                      </div>
                      <span className="font-medium text-green-600">₹{roundToWholeNumber(Number(payment.amount || 0))}</span>
                    </div>
                  ))}
                  {paymentDetails.length > 1 && (
                    <div className="flex items-center justify-between bg-blue-50 rounded p-2 text-sm font-medium">
                      <span>Total Paid</span>
                      <span className="text-blue-600">₹{roundToWholeNumber(paymentDetails.reduce((sum, p) => sum + Number(p.amount || 0), 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Returns Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">Returns</h4>
                {hasReturns(selectedBill.id) ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Returned</span>
                ) : (
                  <span className="text-xs text-gray-500">No returns</span>
                )}
              </div>

              {returnsLoading ? (
                <div className="text-xs text-gray-500 mt-2">Loading return details...</div>
              ) : selectedBillReturns.length === 0 ? null : (
                <div className="mt-2 space-y-3">
                  {selectedBillReturns.map((r: any) => {
                    const items = selectedBillReturnItems.filter((x: any) => String(x.return_id) === String(r.id))
                    return (
                      <div key={r.id} className="border rounded-lg p-3 bg-red-50">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div>
                            <div className="font-medium text-red-900">{r.return_number || r.id}</div>
                            <div className="text-xs text-red-700">
                              {r.return_date ? new Date(r.return_date).toLocaleDateString() : ''}
                              {r.reason ? ` · ${r.reason}` : ''}
                              {r.status ? ` · ${r.status}` : ''}
                            </div>
                          </div>
                          <div className="text-sm text-red-900">
                            <span className="font-medium">Refund:</span> ₹{roundToWholeNumber(Number(r.refund_amount || 0))}
                          </div>
                        </div>

                        {items.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {items.map((it: any, idx: number) => (
                              <div key={`${r.id}-${idx}`} className="flex justify-between text-xs bg-white rounded p-2">
                                <div>
                                  <div className="font-medium">Batch: {it.batch_number || '-'} · {it.restock_status || ''}</div>
                                  <div className="text-gray-600">Qty: {it.quantity} · Rate: ₹{roundToWholeNumber(Number(it.selling_rate || 0))}</div>
                                </div>
                                <div className="font-medium">₹{roundToWholeNumber(Number(it.total_amount || 0))}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {r.remarks ? (
                          <div className="text-xs text-gray-700 mt-2"><span className="font-medium">Remarks:</span> {r.remarks}</div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Item</th>
                    <th className="px-3 py-2 border-b">Qty</th>
                    <th className="text-right px-3 py-2 border-b">Rate</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewLoading ? (
                    <tr><td className="px-3 py-3 text-center" colSpan={4}>Loading items...</td></tr>
                  ) : viewItems.length === 0 ? (
                    <tr><td className="px-3 py-3 text-center" colSpan={4}>No items</td></tr>
                  ) : (
                    viewItems.map((it: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">{it.description}</td>
                        <td className="px-3 py-2 text-center">{it.qty}</td>
                        <td className="px-3 py-2 text-right">₹{Number(it.unit_amount || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">₹{Number(it.total_amount || 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div className="text-gray-600 text-sm">Total</div>
              <div className="font-semibold text-lg">₹{Math.round(selectedBill.total_amount).toLocaleString()}</div>
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={showThermalPreviewWithLogo} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Thermal Print</button>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteBill(selectedBill.id, selectedBill.bill_number)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Bill
                </button>
              )}
              <button onClick={() => setShowViewModal(false)} className="px-4 py-2 border rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Edit Modal */}
      {showPaymentEditModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit Payment Method</h3>
              <button
                onClick={() => {
                  setShowPaymentEditModal(false)
                  setSelectedBill(null)
                  setNewPaymentMethod('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Bill: <span className="font-medium">{selectedBill.bill_number}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Customer: <span className="font-medium">{selectedBill.customer_name}</span>
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current Method: <span className="font-medium capitalize">{selectedBill.payment_method}</span>
              </p>

              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Amount:</span>
                  <span className="font-bold text-blue-600">₹{Math.round(selectedBill.total_amount || 0)}</span>
                </div>
                {selectedBill.amount_paid && selectedBill.amount_paid > 0 && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Amount Paid:</span>
                    <span className="font-medium text-green-600">₹{selectedBill.amount_paid?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Payment Method
              </label>
              <select
                value={newPaymentMethod}
                onChange={(e) => setNewPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select payment method</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="gpay">GPay</option>
                <option value="ghpay">GHPay</option>
                <option value="credit">Credit</option>
                <option value="split">Split Payment</option>
                <option value="insurance">Insurance</option>
                <option value="others">Others</option>
              </select>

              {newPaymentMethod === 'split' && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Split Payment:</strong> This will allow multiple payment methods for this bill. You can add individual payments through the "Mark as Paid" option.
                  </p>
                </div>
              )}

              {newPaymentMethod === 'credit' && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>Credit Payment:</strong> This will mark the bill as credit and keep it in pending status until payment is received.
                  </p>
                </div>
              )}

              {selectedBill.payment_method === 'credit' && newPaymentMethod !== 'credit' && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Changing from Credit to another method will require payment settlement.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentEditModal(false)
                  setSelectedBill(null)
                  setNewPaymentMethod('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePaymentMethod}
                disabled={!newPaymentMethod || updatingPayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingPayment ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Bills Modal */}
      {showPendingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPendingModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Pending Bills</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowPendingModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {pendingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : pendingBills.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Pending Bills</h4>
                  <p className="text-gray-600">All bills have been paid or settled.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingBills.map((bill) => (
                    <div key={bill.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">Bill {bill.bill_number}</h4>
                          <p className="text-sm text-gray-600">{bill.customer_name}</p>
                          {bill.patient_uhid && (
                            <p className="text-sm text-gray-500">UHID: {bill.patient_uhid}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(bill.created_at).toLocaleDateString()} at {new Date(bill.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(bill.payment_status)}`}>
                            {bill.payment_status}
                          </span>
                          <p className="text-lg font-bold text-gray-900 mt-1">₹{Math.round(bill.total_amount || 0)}</p>
                          {bill.amount_paid !== undefined && bill.amount_paid !== bill.total_amount && (
                            <p className="text-sm text-gray-500">Paid: ₹{bill.amount_paid?.toFixed(2) || '0.00'}</p>
                          )}
                        </div>
                      </div>

                      {/* Bill Items */}
                      <div className="border-t pt-3">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Items</h5>
                        <div className="space-y-1">
                          {bill.items && bill.items.length > 0 ? (
                            bill.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-600">{item.description || 'Unknown Item'}</span>
                                <span className="text-gray-900">Qty: {item.qty || 1} × ₹{Number(item.unit_amount || 0).toFixed(2)}</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No items found</p>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <button
                          onClick={() => {
                            openViewBill(bill)
                            setShowPendingModal(false)
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => openMarkPaidModal(bill)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Mark as Paid
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteBill(bill.id, bill.bill_number)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total Pending: {pendingBills.length} bills
                </div>
                <div className="text-sm font-semibold text-orange-600">
                  Total Amount: ₹{Math.round(pendingBills.reduce((sum, bill) => sum + (bill.total_amount || 0), 0)).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {showMarkPaidModal && selectedBillForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMarkPaidModal(false)}>
          <div className="bg-white rounded-lg p-8 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Mark Bill as Paid</h3>
              <button
                onClick={() => {
                  setShowMarkPaidModal(false)
                  setSelectedBillForPayment(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Bill: <span className="font-medium">{selectedBillForPayment.bill_number}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Customer: <span className="font-medium">{selectedBillForPayment.customer_name}</span>
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="font-bold text-lg text-blue-600">₹{Math.round(selectedBillForPayment.total_amount || 0)}</span>
                  </div>
                  {selectedBillForPayment.amount_paid && selectedBillForPayment.amount_paid > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Already Accounted:</span>
                      <span className="font-medium text-green-600">₹{selectedBillForPayment.amount_paid?.toFixed(2) || '0.00'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      {(selectedBillForPayment.total_amount || 0) < (selectedBillForPayment.amount_paid || 0) ? 'Refund Due:' : 'Remaining Balance:'}
                    </span>
                    <span className={`font-bold ${(selectedBillForPayment.total_amount || 0) < (selectedBillForPayment.amount_paid || 0) ? 'text-red-600' : 'text-orange-600'}`}>
                      ₹{Math.abs((selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.amount_paid || 0)).toFixed(2)}
                    </span>
                  </div>
                  {selectedBillForPayment.payment_method === 'credit' && (
                    <p className="text-[10px] text-blue-600 mt-1 font-medium italic">
                      * This is a Credit bill. Entering payments will settle the credit.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-gray-700">Payment Details</label>
                  <button
                    type="button"
                    onClick={() => setSplitPayments([...splitPayments, { method: 'cash', amount: '', reference: '' }])}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3 h-3" /> Add Method
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
                  {splitPayments.map((payment, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 shadow-sm relative group hover:border-blue-200 transition-colors">
                      {splitPayments.length > 1 && (
                        <button
                          onClick={() => setSplitPayments(splitPayments.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 bg-white border border-gray-200 text-gray-400 hover:text-red-500 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      
                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">Payment Method</label>
                          <select
                            value={payment.method}
                            onChange={(e) => {
                              const newPayments = [...splitPayments]
                              newPayments[index].method = e.target.value
                              setSplitPayments(newPayments)
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white"
                          >
                            <option value="cash">💵 Cash</option>
                            <option value="card">💳 Card</option>
                            <option value="upi">📱 UPI</option>
                            <option value="gpay">🔵 GPay</option>
                            <option value="ghpay">🟡 GHPay</option>
                            <option value="netbanking">🏦 Net Banking</option>
                            <option value="insurance">🛡️ Insurance</option>
                            <option value="others">🔘 Others</option>
                          </select>
                        </div>

                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">Amount (₹)</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={payment.amount}
                              onChange={(e) => {
                                const newPayments = [...splitPayments]
                                newPayments[index].amount = e.target.value
                                setSplitPayments(newPayments)
                              }}
                              className="w-full pl-7 pr-3 py-2 text-sm font-semibold border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white"
                              placeholder="0.00"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          </div>
                        </div>

                        <div className="flex-[1.5] min-w-[200px]">
                          <label className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5 ml-1">Reference / Transaction ID</label>
                          <input
                            type="text"
                            value={payment.reference}
                            onChange={(e) => {
                              const newPayments = [...splitPayments]
                              newPayments[index].reference = e.target.value
                              setSplitPayments(newPayments)
                            }}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-white"
                            placeholder="e.g. UPI ID, Cheque #, etc."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-2 rounded-md flex justify-between items-center text-sm">
                   <span className="font-medium text-blue-700">Total Selected:</span>
                   <span className="font-bold text-blue-800">₹{splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowMarkPaidModal(false)
                    setSelectedBillForPayment(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={markingPaid || splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) <= 0}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold ${
                    (selectedBillForPayment.total_amount || 0) < (selectedBillForPayment.amount_paid || 0)
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700 shadow-sm'
                  }`}
                >
                  {markingPaid ? 'Processing...' : (selectedBillForPayment.total_amount || 0) < (selectedBillForPayment.amount_paid || 0) ? 'Record Refund' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Edit Modal */}
      {showBillEditModal && selectedBillForEdit && (
        <BillEditModal
          bill={selectedBillForEdit}
          isOpen={showBillEditModal}
          onClose={() => {
            setShowBillEditModal(false)
            setSelectedBillForEdit(null)
          }}
          onSave={handleSaveBillEdit}
        />
      )}
    </div>
  )
}
