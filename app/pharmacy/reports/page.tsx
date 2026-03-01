'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Download, Calendar, TrendingUp, Package, DollarSign,
  FileText, Filter, Search, BarChart3, PieChart as PieChartIcon,
  IndianRupee, CreditCard, Wallet, Building2, AlertCircle, CheckCircle2,
  Clock, Users, ShoppingCart, Pill, Activity, ChevronDown, X
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { supabase } from '@/src/lib/supabase'
import ExcelJS from 'exceljs'

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

type TabType = 'sales' | 'products' | 'financial'

export default function PharmacyReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sales')
  const [dateRange, setDateRange] = useState('this_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Sales data
  const [salesData, setSalesData] = useState<any>(null)
  const [dailySalesChart, setDailySalesChart] = useState<any[]>([])
  const [paymentMethodChart, setPaymentMethodChart] = useState<any[]>([])
  const [monthlySalesChart, setMonthlySalesChart] = useState<any[]>([])

  // Product data
  const [topMedicines, setTopMedicines] = useState<any[]>([])
  const [batchSales, setBatchSales] = useState<any[]>([])
  const [categoryChart, setCategoryChart] = useState<any[]>([])

  // Financial data
  const [gstData, setGstData] = useState<any>(null)
  const [outstandingPayments, setOutstandingPayments] = useState<any[]>([])
  const [taxChart, setTaxChart] = useState<any[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStaff, setSelectedStaff] = useState('all')
  const [staffList, setStaffList] = useState<any[]>([])

  useEffect(() => {
    loadStaffList()
  }, [])

  useEffect(() => {
    if (activeTab === 'sales') {
      loadSalesData()
    } else if (activeTab === 'products') {
      loadProductData()
    } else if (activeTab === 'financial') {
      loadFinancialData()
    }
  }, [activeTab, dateRange, customStartDate, customEndDate, selectedStaff])

  const getDateRangeValues = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (dateRange) {
      case 'today':
        // Use local timezone for today's date
        const localToday = new Date()
        const todayStr = localToday.getFullYear() + '-' + 
          String(localToday.getMonth() + 1).padStart(2, '0') + '-' + 
          String(localToday.getDate()).padStart(2, '0')
        return {
          start: todayStr,
          end: todayStr
        }
      case 'yesterday': {
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        }
      }
      case 'this_week': {
        const weekStart = new Date(today)
        const day = weekStart.getDay()
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
        weekStart.setDate(diff)
        return {
          start: weekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        }
      }
      case 'this_month':
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return {
          start: lastMonth.toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        }
      }
      case 'this_year':
        return {
          start: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
        }
      case 'custom':
        return {
          start: customStartDate || today.toISOString().split('T')[0],
          end: customEndDate || today.toISOString().split('T')[0]
        }
      default:
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        }
    }
  }

  const loadStaffList = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select('id, first_name, last_name, employee_id')
        .eq('is_active', true)
        .order('first_name')

      if (!error && data) {
        setStaffList(data)
      }
    } catch (err) {
      console.error('Error loading staff:', err)
    }
  }

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRangeValues()
      const startDateTime = `${start}T00:00:00.000Z`
      const endDateTime = `${end}T23:59:59.999Z`

      // Get billing data - only pharmacy bills (bill_type IS NULL)
      let query = supabase
        .from('billing')
        .select('id, bill_number, customer_name, subtotal, discount, tax, total, amount_paid, payment_method, payment_status, created_at, staff_id')
        .is('bill_type', null) // Only pharmacy bills
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)
        .order('created_at', { ascending: false })

      if (selectedStaff !== 'all') {
        query = query.eq('staff_id', selectedStaff)
      }

      const { data: bills, error } = await query

      if (error) throw error

      console.log('Sales data query:', { dateRange, startDateTime, endDateTime, selectedStaff })
      console.log('Found bills:', bills?.length, bills)

      // Calculate summary
      const totalSales = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.total) || 0), 0) || 0
      const totalBills = bills?.length || 0
      const paidBills = bills?.filter((b: any) => b.payment_status === 'paid').length || 0
      const pendingBills = bills?.filter((b: any) => b.payment_status === 'pending').length || 0
      const totalPaid = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.amount_paid) || 0), 0) || 0
      const avgBillValue = totalBills > 0 ? totalSales / totalBills : 0

      setSalesData({
        totalSales,
        totalBills,
        paidBills,
        pendingBills,
        totalPaid,
        avgBillValue,
        totalDiscount: bills?.reduce((sum: number, bill: any) => sum + (Number(bill.discount) || 0), 0) || 0,
        totalTax: bills?.reduce((sum: number, bill: any) => sum + (Number(bill.tax) || 0), 0) || 0
      })

      // Daily sales chart
      const dailyMap = new Map<string, number>()
      bills?.forEach((bill: any) => {
        const date = new Date(bill.created_at).toISOString().split('T')[0]
        dailyMap.set(date, (dailyMap.get(date) || 0) + (Number(bill.total) || 0))
      })
      const dailyData = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date: formatDate(date), amount }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      setDailySalesChart(dailyData)

      // Payment method breakdown
      const paymentMap = new Map<string, number>()
      bills?.forEach((bill: any) => {
        const method = bill.payment_method || 'cash'
        paymentMap.set(method, (paymentMap.get(method) || 0) + (Number(bill.total) || 0))
      })
      const paymentData = Array.from(paymentMap.entries()).map(([name, value]) => ({ name: name.toUpperCase(), value }))
      setPaymentMethodChart(paymentData)

      // Monthly sales (for year view)
      if (dateRange === 'this_year') {
        const monthlyMap = new Map<string, number>()
        bills?.forEach((bill: any) => {
          const month = new Date(bill.created_at).toLocaleDateString('en-IN', { month: 'short' })
          monthlyMap.set(month, (monthlyMap.get(month) || 0) + (Number(bill.total) || 0))
        })
        const monthlyData = Array.from(monthlyMap.entries()).map(([month, sales]) => ({ month, sales }))
        setMonthlySalesChart(monthlyData)
      }

    } catch (err) {
      console.error('Error loading sales data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadProductData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRangeValues()
      const startDateTime = `${start}T00:00:00.000Z`
      const endDateTime = `${end}T23:59:59.999Z`

      // Get bills in date range - only pharmacy bills
      const { data: bills, error: billsError } = await supabase
        .from('billing')
        .select('id, created_at')
        .is('bill_type', null) // Only pharmacy bills
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)

      if (billsError) throw billsError

      console.log('Product data query:', { dateRange, startDateTime, endDateTime })
      console.log('Found bills for products:', bills?.length, bills)

      const billIds = bills?.map((b: any) => b.id) || []

      if (billIds.length === 0) {
        setTopMedicines([])
        setBatchSales([])
        setCategoryChart([])
        setLoading(false)
        return
      }

      // Get billing items
      const { data: items, error: itemsError } = await supabase
        .from('billing_item')
        .select('medicine_id, description, qty, total_amount, batch_number')
        .in('billing_id', billIds)

      if (itemsError) throw itemsError

      // Get medication details
      const medicineIds = [...new Set((items || []).map((item: any) => item.medicine_id).filter(Boolean))] as string[]
      let medicationsMap: Record<string, any> = {}
      
      if (medicineIds.length > 0) {
        const { data: medications } = await supabase
          .from('medications')
          .select('id, name, category, manufacturer')
          .in('id', medicineIds)
        
        medicationsMap = (medications || []).reduce((acc: any, med: any) => {
          acc[med.id] = med
          return acc
        }, {})
      }

      // Top medicines by revenue
      const medicineMap = new Map<string, { name: string; qty: number; revenue: number; category: string }>()
      items?.forEach((item: any) => {
        const medId = item.medicine_id || 'unknown'
        const medInfo = medicationsMap[medId]
        const name = medInfo?.name || item.description || 'Unknown'
        const category = medInfo?.category || 'Uncategorized'
        const existing = medicineMap.get(medId) || { name, qty: 0, revenue: 0, category }
        existing.qty += Number(item.qty) || 0
        existing.revenue += Number(item.total_amount) || 0
        medicineMap.set(medId, existing)
      })

      const topMeds = Array.from(medicineMap.values())
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 20)
      setTopMedicines(topMeds)

      // Category breakdown
      const categoryMap = new Map<string, number>()
      items?.forEach((item: any) => {
        const medId = item.medicine_id || 'unknown'
        const category = medicationsMap[medId]?.category || 'Uncategorized'
        categoryMap.set(category, (categoryMap.get(category) || 0) + (Number(item.total_amount) || 0))
      })
      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }))
      setCategoryChart(categoryData)

      // Batch-wise sales
      const batchMap = new Map<string, { batch: string; qty: number; revenue: number }>()
      items?.forEach((item: any) => {
        const batch = item.batch_number || 'No Batch'
        const existing = batchMap.get(batch) || { batch, qty: 0, revenue: 0 }
        existing.qty += Number(item.qty) || 0
        existing.revenue += Number(item.total_amount) || 0
        batchMap.set(batch, existing)
      })
      const batchData = Array.from(batchMap.values())
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 15)
      setBatchSales(batchData)

    } catch (err) {
      console.error('Error loading product data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFinancialData = async () => {
    try {
      setLoading(true)
      const { start, end } = getDateRangeValues()
      const startDateTime = `${start}T00:00:00.000Z`
      const endDateTime = `${end}T23:59:59.999Z`

      // Get billing data - only pharmacy bills
      const { data: bills, error } = await supabase
        .from('billing')
        .select('id, bill_number, customer_name, subtotal, tax, cgst_amount, sgst_amount, igst_amount, total, amount_paid, payment_status, created_at')
        .is('bill_type', null) // Only pharmacy bills
        .gte('created_at', startDateTime)
        .lte('created_at', endDateTime)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Financial data query:', { dateRange, startDateTime, endDateTime })
      console.log('Found bills for financial:', bills?.length, bills)

      // GST Summary - Calculate CGST and SGST as half of total tax
      const totalTax = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.tax) || 0), 0) || 0
      const totalIGST = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.igst_amount) || 0), 0) || 0
      
      // Split total GST equally between CGST and SGST
      const totalCGST = totalIGST > 0 ? 0 : totalTax / 2
      const totalSGST = totalIGST > 0 ? 0 : totalTax / 2
      
      const taxableAmount = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.subtotal) || 0), 0) || 0
      const totalDiscount = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.discount) || 0), 0) || 0
      const totalAmount = bills?.reduce((sum: number, bill: any) => sum + (Number(bill.total) || 0), 0) || 0

      setGstData({
        totalCGST,
        totalSGST,
        totalIGST,
        totalTax,
        taxableAmount,
        totalDiscount,
        totalAmount,
        totalWithTax: taxableAmount + totalTax,
        billCount: bills?.length || 0
      })

      // Tax breakdown chart
      const taxData = [
        { name: 'CGST', value: totalCGST },
        { name: 'SGST', value: totalSGST },
        { name: 'IGST', value: totalIGST }
      ].filter(item => item.value > 0)
      setTaxChart(taxData)

      // All bills for detailed view
      const allBills = bills?.map((bill: any) => {
          const taxAmount = Number(bill.tax) || 0
          const igstAmount = Number(bill.igst_amount) || 0
          
          // Apply GST splitting logic
          const cgstAmount = igstAmount > 0 ? 0 : taxAmount / 2
          const sgstAmount = igstAmount > 0 ? 0 : taxAmount / 2
          
          return {
            billNumber: bill.bill_number,
            customerName: bill.customer_name,
            subtotal: Number(bill.subtotal) || 0,
            discount: Number(bill.discount) || 0,
            tax: taxAmount,
            cgst: cgstAmount,
            sgst: sgstAmount,
            igst: igstAmount,
            total: Number(bill.total) || 0,
            amountPaid: Number(bill.amount_paid) || 0,
            balance: (Number(bill.total) || 0) - (Number(bill.amount_paid) || 0),
            date: bill.created_at,
            status: bill.payment_status
          }
        })
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()) || []

      // Outstanding payments
      const outstanding = allBills.filter((bill: any) => bill.payment_status === 'pending' || bill.payment_status === 'partial')
        .sort((a: any, b: any) => b.balance - a.balance)

      setOutstandingPayments(allBills) // Changed to show all bills

    } catch (err) {
      console.error('Error loading financial data:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'ANNAM Pharmacy'
      workbook.created = new Date()

      if (activeTab === 'sales' && salesData) {
        const worksheet = workbook.addWorksheet('Sales Report')
        
        // Add header
        worksheet.addRow(['ANNAM Pharmacy - Sales Report'])
        worksheet.addRow([`Period: ${getDateRangeValues().start} to ${getDateRangeValues().end}`])
        worksheet.addRow([])
        
        // Summary
        worksheet.addRow(['Summary'])
        worksheet.addRow(['Total Sales', salesData.totalSales])
        worksheet.addRow(['Total Bills', salesData.totalBills])
        worksheet.addRow(['Paid Bills', salesData.paidBills])
        worksheet.addRow(['Pending Bills', salesData.pendingBills])
        worksheet.addRow(['Average Bill Value', salesData.avgBillValue])
        worksheet.addRow([])
        
        // Daily sales
        worksheet.addRow(['Daily Sales'])
        worksheet.addRow(['Date', 'Amount'])
        dailySalesChart.forEach(row => {
          worksheet.addRow([row.date, row.amount])
        })
      } else if (activeTab === 'products') {
        const worksheet = workbook.addWorksheet('Product Report')
        
        worksheet.addRow(['ANNAM Pharmacy - Product Report'])
        worksheet.addRow([`Period: ${getDateRangeValues().start} to ${getDateRangeValues().end}`])
        worksheet.addRow([])
        
        worksheet.addRow(['Top Selling Medicines'])
        worksheet.addRow(['Medicine', 'Quantity', 'Revenue', 'Category'])
        topMedicines.forEach(med => {
          worksheet.addRow([med.name, med.qty, med.revenue, med.category])
        })
      } else if (activeTab === 'financial' && gstData) {
        const worksheet = workbook.addWorksheet('Financial Report')
        
        worksheet.addRow(['ANNAM Pharmacy - Financial Report'])
        worksheet.addRow([`Period: ${getDateRangeValues().start} to ${getDateRangeValues().end}`])
        worksheet.addRow([])
        
        worksheet.addRow(['GST Summary'])
        worksheet.addRow(['Taxable Amount', gstData.taxableAmount])
        worksheet.addRow(['CGST', gstData.totalCGST])
        worksheet.addRow(['SGST', gstData.totalSGST])
        worksheet.addRow(['IGST', gstData.totalIGST])
        worksheet.addRow(['Total Tax', gstData.totalTax])
        worksheet.addRow([])
        
        worksheet.addRow(['Outstanding Payments'])
        worksheet.addRow(['Bill Number', 'Customer', 'Total', 'Paid', 'Balance', 'Date'])
        outstandingPayments.forEach(payment => {
          worksheet.addRow([
            payment.billNumber,
            payment.customerName,
            payment.total,
            payment.amountPaid,
            payment.balance,
            formatDate(payment.date)
          ])
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pharmacy-${activeTab}-report-${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting to Excel:', err)
      alert('Failed to export report')
    }
  }

  // PDF generation utility
  const generatePDF = async () => {
    const printWindow = window.open('', '', 'width=800,height=600')
    if (!printWindow) {
      alert('Please allow popups to generate PDF')
      return
    }

    const { start, end } = getDateRangeValues()
    const reportType = activeTab === 'sales' ? 'Sales & Revenue' : 
                      activeTab === 'products' ? 'Products & Medication' : 'Financial & Accounting'
    
    let htmlContent = `
      <html>
        <head>
          <title>ANNAM Pharmacy - ${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #1e40af; margin: 0; }
            .header p { color: #64748b; margin: 5px 0; }
            .summary { margin: 20px 0; }
            .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
            .summary-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; }
            .summary-card h3 { margin: 0 0 10px 0; color: #1e293b; }
            .summary-card .value { font-size: 24px; font-weight: bold; color: #059669; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .text-right { text-align: right; }
            .status-paid { color: #059669; }
            .status-pending { color: #d97706; }
            .footer { margin-top: 30px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ANNAM Pharmacy</h1>
            <p>${reportType} Report</p>
            <p>Period: ${start} to ${end}</p>
            <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
    `

    if (activeTab === 'sales' && salesData) {
      htmlContent += `
        <div class="summary">
          <h2>Sales Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Sales</h3>
              <div class="value">${formatCurrency(salesData.totalSales)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Bills</h3>
              <div class="value">${salesData.totalBills}</div>
            </div>
            <div class="summary-card">
              <h3>Paid Bills</h3>
              <div class="value">${salesData.paidBills}</div>
            </div>
            <div class="summary-card">
              <h3>Pending Bills</h3>
              <div class="value">${salesData.pendingBills}</div>
            </div>
          </div>
          
          <h2>Daily Sales Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${dailySalesChart.map(row => `
                <tr>
                  <td>${row.date}</td>
                  <td class="text-right">${formatCurrency(row.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    }

    if (activeTab === 'products') {
      htmlContent += `
        <div class="summary">
          <h2>Top Selling Medicines</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Medicine</th>
                <th>Category</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${topMedicines.slice(0, 20).map((med, index) => `
                <tr>
                  <td>#${index + 1}</td>
                  <td>${med.name}</td>
                  <td>${med.category}</td>
                  <td class="text-right">${med.qty}</td>
                  <td class="text-right">${formatCurrency(med.revenue)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    }

    if (activeTab === 'financial' && gstData) {
      htmlContent += `
        <div class="summary">
          <h2>Pharmacy Financial Summary</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Bills</h3>
              <div class="value">${gstData.billCount}</div>
            </div>
            <div class="summary-card">
              <h3>Taxable Amount</h3>
              <div class="value">${formatCurrency(gstData.taxableAmount)}</div>
            </div>
            <div class="summary-card">
              <h3>Total CGST</h3>
              <div class="value">${formatCurrency(gstData.totalCGST)}</div>
            </div>
            <div class="summary-card">
              <h3>Total SGST</h3>
              <div class="value">${formatCurrency(gstData.totalSGST)}</div>
            </div>
            <div class="summary-card">
              <h3>Total IGST</h3>
              <div class="value">${formatCurrency(gstData.totalIGST)}</div>
            </div>
          </div>
          
          <div class="summary-grid">
            <div class="summary-card">
              <h3>Total Discount</h3>
              <div class="value">${formatCurrency(gstData.totalDiscount)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Amount</h3>
              <div class="value">${formatCurrency(gstData.totalAmount)}</div>
            </div>
            <div class="summary-card">
              <h3>Total Tax</h3>
              <div class="value">${formatCurrency(gstData.totalTax)}</div>
            </div>
            <div class="summary-card">
              <h3>Total with Tax</h3>
              <div class="value">${formatCurrency(gstData.totalWithTax)}</div>
            </div>
          </div>
          
          <h2>Outstanding Payments</h2>
          <table>
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th class="text-right">Total</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${outstandingPayments.map(payment => `
                <tr>
                  <td>${payment.billNumber}</td>
                  <td>${payment.customerName}</td>
                  <td>${formatDate(payment.date)}</td>
                  <td class="text-right">${formatCurrency(payment.total)}</td>
                  <td class="text-right">${formatCurrency(payment.amountPaid)}</td>
                  <td class="text-right">${formatCurrency(payment.balance)}</td>
                  <td class="${payment.status === 'paid' ? 'status-paid' : 'status-pending'}">${payment.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    }

    htmlContent += `
          <div class="footer">
            <p>ANNAM Pharmacy - Pharmacy Management System</p>
            <p>This is a computer-generated report and does not require signature</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load, then trigger print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  const exportToCSV = () => {
    let csvContent = ''
    let filename = ''

    if (activeTab === 'sales' && salesData) {
      csvContent = 'Metric,Value\n'
      csvContent += `Total Sales,${salesData.totalSales}\n`
      csvContent += `Total Bills,${salesData.totalBills}\n`
      csvContent += `Paid Bills,${salesData.paidBills}\n`
      csvContent += `Pending Bills,${salesData.pendingBills}\n\n`
      csvContent += 'Date,Amount\n'
      dailySalesChart.forEach(row => {
        csvContent += `${row.date},${row.amount}\n`
      })
      filename = 'sales-report.csv'
    } else if (activeTab === 'products') {
      csvContent = 'Medicine,Quantity,Revenue,Category\n'
      topMedicines.forEach(med => {
        csvContent += `"${med.name}",${med.qty},${med.revenue},"${med.category}"\n`
      })
      filename = 'product-report.csv'
    } else if (activeTab === 'financial') {
      csvContent = 'Bill Number,Customer,Total,Paid,Balance,Date,Status\n'
      outstandingPayments.forEach(payment => {
        csvContent += `"${payment.billNumber}","${payment.customerName}",${payment.total},${payment.amountPaid},${payment.balance},"${formatDate(payment.date)}","${payment.status}"\n`
      })
      filename = 'financial-report.csv'
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/pharmacy/billing">
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Pharmacy Reports</h1>
                <p className="text-sm text-slate-600 mt-0.5">Analytics & Insights Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <div className="relative">
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Export Excel
                </button>
              </div>
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="this_week">This Week</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="this_year">This Year</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {dateRange === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Staff Member</label>
                  <select
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Staff</option>
                    {staffList.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} ({staff.employee_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mt-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'sales'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Sales & Revenue
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'products'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              Products & Medication
            </button>
            <button
              onClick={() => setActiveTab('financial')}
              className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'financial'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Financial & Accounting
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* No Data Message */}
            {((activeTab === 'sales' && (!salesData || salesData.totalBills === 0)) ||
              (activeTab === 'products' && topMedicines.length === 0) ||
              (activeTab === 'financial' && (!gstData || gstData.billCount === 0))) && (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-amber-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pharmacy Data Found</h3>
                <p className="text-slate-600 mb-4">
                  No pharmacy bills found for the selected date range: <strong>{getDateRangeValues().start}</strong> to <strong>{getDateRangeValues().end}</strong>
                </p>
                <p className="text-sm text-slate-500">
                  Try selecting a different date range or check if pharmacy bills were created during this period.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Note: Pharmacy bills have bill_type = NULL. Other departments have specific bill_type values.
                </p>
              </div>
            )}

            {/* Sales & Revenue Tab */}
            {activeTab === 'sales' && salesData && salesData.totalBills > 0 && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Sales</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(salesData.totalSales)}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <IndianRupee className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Total Bills</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{salesData.totalBills}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Avg Bill Value</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(salesData.avgBillValue)}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Collection Rate</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {salesData.totalSales > 0 ? ((salesData.totalPaid / salesData.totalSales) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Sales Chart */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Sales Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailySalesChart}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorAmount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Methods</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={paymentMethodChart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentMethodChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monthly Sales (if year view) */}
                {dateRange === 'this_year' && monthlySalesChart.length > 0 && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Monthly Sales Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlySalesChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                        <YAxis stroke="#64748b" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          formatter={(value: any) => formatCurrency(value)}
                        />
                        <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Products & Medication Tab */}
            {activeTab === 'products' && topMedicines.length > 0 && (
              <div className="space-y-6">
                {/* Top Medicines Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Top Selling Medicines</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Medicine</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Qty Sold</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {topMedicines.filter(med => 
                          searchTerm === '' || med.name.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((med, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">#{index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{med.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{med.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">{med.qty}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatCurrency(med.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales by Category</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={categoryChart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Batch Sales */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Batches by Revenue</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {batchSales.map((batch, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{batch.batch}</p>
                            <p className="text-xs text-slate-600">Qty: {batch.qty}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">{formatCurrency(batch.revenue)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Financial & Accounting Tab */}
            {activeTab === 'financial' && gstData && (
              <div className="space-y-6">
                {/* GST Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total Bills</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{gstData.billCount}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Taxable Amount</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(gstData.taxableAmount)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total CGST</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(gstData.totalCGST)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total SGST</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(gstData.totalSGST)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total Tax</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(gstData.totalTax)}</p>
                  </div>
                </div>

                {/* Additional Financial Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total Discount</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(gstData.totalDiscount)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total Amount</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(gstData.totalAmount)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <p className="text-sm font-medium text-slate-600">Total with Tax</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(gstData.totalWithTax)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tax Breakdown Chart */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Tax Breakdown</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={taxChart}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {taxChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bill Summary */}
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Bill Summary</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">Total Bills</p>
                            <p className="text-xs text-blue-600">This period</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-blue-600">
                          {outstandingPayments.length}
                        </p>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">Paid Bills</p>
                            <p className="text-xs text-green-600">Fully paid</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-green-600">
                          {outstandingPayments.filter(p => p.status === 'paid').length}
                        </p>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="w-8 h-8 text-amber-600" />
                          <div>
                            <p className="text-sm font-medium text-amber-900">Pending Bills</p>
                            <p className="text-xs text-amber-600">Unpaid or partial</p>
                          </div>
                        </div>
                        <p className="text-xl font-bold text-amber-600">
                          {outstandingPayments.filter(p => p.status !== 'paid').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Outstanding Summary */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Outstanding Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Total Outstanding</p>
                          <p className="text-xs text-red-600">{outstandingPayments.length} bills</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(outstandingPayments.reduce((sum, p) => sum + p.balance, 0))}
                      </p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-900">Total Collected</p>
                          <p className="text-xs text-green-600">This period</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(gstData.totalWithTax - outstandingPayments.reduce((sum, p) => sum + p.balance, 0))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* All Bills Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">All Pharmacy Bills</h3>
                    <p className="text-sm text-slate-600 mt-1">Complete bill details with GST breakdown</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill No</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Subtotal</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">CGST</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">SGST</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {outstandingPayments.filter(payment =>
                          searchTerm === '' || 
                          payment.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((payment, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{payment.billNumber}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900">{payment.customerName}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{formatDate(payment.date)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-900">{formatCurrency(payment.subtotal)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-orange-600">{formatCurrency(payment.discount)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-blue-600">{formatCurrency(payment.cgst)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(payment.sgst)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-slate-900">{formatCurrency(payment.total)}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(payment.amountPaid)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                payment.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Outstanding Payments Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900">Outstanding Payments</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Bill Number</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Paid</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Balance</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {outstandingPayments.filter(payment =>
                          searchTerm === '' || 
                          payment.billNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
                        ).map((payment, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{payment.billNumber}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{payment.customerName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{formatDate(payment.date)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">{formatCurrency(payment.total)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(payment.amountPaid)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">{formatCurrency(payment.balance)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                payment.status === 'pending' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
