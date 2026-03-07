'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Download, Calendar, Filter, FileText,
    BarChart3, PieChart as PieChartIcon, TrendingUp,
    DollarSign, Clock, CheckCircle2, AlertCircle,
    Search, X, Printer, Share2, ChevronDown, LayoutDashboard,
    Package, ShoppingCart, Receipt, Wallet, Activity,
    FileSpreadsheet, FileJson, ImageIcon,
    SortAsc, SortDesc, Stethoscope, User
} from 'lucide-react'
import {
    PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { supabase } from '@/src/lib/supabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as ExcelJS from 'exceljs'
import html2canvas from 'html2canvas'

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

type ReportType = 'dashboard' | 'closing_drug' | 'expiring_soon' | 'billwise_sales' | 'drugwise_sales' | 'indent' | 'purchase_gst' | 'purchase' | 'purchase_value' | 'sale'

export default function PharmacyBillingReportsPage() {
    const reportRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(true)
    const [selectedReport, setSelectedReport] = useState<ReportType>('dashboard')
    const [dateRange, setDateRange] = useState('this_month')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
    const [selectedDept, setSelectedDept] = useState<string>('all')

    const [reportData, setReportData] = useState<any[]>([])

    // Dashboard Stats
    const [stats, setStats] = useState({
        totalCollection: 0,
        totalBills: 0,
        paidBills: 0,
        pendingAmount: 0,
        avgBillValue: 0
    })
    const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false)

    const REPORT_OPTIONS: { value: ReportType, label: string, icon: any }[] = [
        { value: 'dashboard', label: 'Operations Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
        { value: 'closing_drug', label: 'Closing Drug Report', icon: <Package className="h-4 w-4" /> },
        { value: 'expiring_soon', label: 'Expiring Soon', icon: <AlertCircle className="h-4 w-4" /> },
        { value: 'billwise_sales', label: 'Billwise Sales Reports', icon: <Receipt className="h-4 w-4" /> },
        { value: 'drugwise_sales', label: 'Drugwise Sales', icon: <Activity className="h-4 w-4" /> },
        { value: 'indent', label: 'Indent Reports', icon: <FileText className="h-4 w-4" /> },
        { value: 'purchase_gst', label: 'Purchase GST Report', icon: <DollarSign className="h-4 w-4" /> },
        { value: 'purchase', label: 'Purchase Report', icon: <ShoppingCart className="h-4 w-4" /> },
        { value: 'purchase_value', label: 'Purchase Value', icon: <TrendingUp className="h-4 w-4" /> },
        { value: 'sale', label: 'Sale Reports', icon: <BarChart3 className="h-4 w-4" /> }
    ]

    const [salesByDay, setSalesByDay] = useState<any[]>([])
    const [paymentMethods, setPaymentMethods] = useState<any[]>([])
    const [statusBreakdown, setStatusBreakdown] = useState<any[]>([])
    const [recentTransactions, setRecentTransactions] = useState<any[]>([])

    useEffect(() => {
        if (selectedReport === 'dashboard') {
            loadDashboardData()
        } else {
            loadSpecificReport()
        }
    }, [dateRange, selectedReport, startDate, endDate, selectedDept])

    const getEffectiveDates = () => {
        if (startDate && endDate) {
            return { from: new Date(startDate).toISOString(), to: new Date(endDate).toISOString() }
        }

        const now = new Date()
        const start = new Date()
        if (dateRange === 'today') {
            start.setHours(0, 0, 0, 0)
        } else if (dateRange === 'this_week') {
            start.setDate(now.getDate() - 7)
        } else if (dateRange === 'this_month') {
            start.setMonth(now.getMonth() - 1)
        } else if (dateRange === 'this_year') {
            start.setFullYear(now.getFullYear() - 1)
        }
        return { from: start.toISOString(), to: now.toISOString() }
    }

    const loadDashboardData = async () => {
        try {
            setLoading(true)
            const { from } = getEffectiveDates()

            let query = supabase
                .from('billing')
                .select('*')
                .gte('created_at', from)

            if (selectedDept !== 'all') {
                query = query.eq('bill_type', selectedDept)
            }

            const { data: bills, error } = await query.order('created_at', { ascending: false })

            if (error) throw error

            const totalCollection = bills.reduce((sum: number, b: any) => sum + (Number(b.amount_paid) || 0), 0)
            const totalAmount = bills.reduce((sum: number, b: any) => sum + (Number(b.total) || 0), 0)
            const pendingAmount = totalAmount - totalCollection
            const paidBills = bills.filter((b: any) => b.payment_status === 'paid').length

            setStats({
                totalCollection,
                totalBills: bills.length,
                paidBills,
                pendingAmount,
                avgBillValue: bills.length > 0 ? totalAmount / bills.length : 0
            })

            const dailyMap = new Map()
            bills.forEach((b: any) => {
                const day = new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                dailyMap.set(day, (dailyMap.get(day) || 0) + (Number(b.total) || 0))
            })
            setSalesByDay(Array.from(dailyMap.entries()).map(([name, value]) => ({ name, value })).reverse().slice(-15))

            const methodMap = new Map()
            bills.forEach((b: any) => {
                const method = b.payment_method || 'other'
                methodMap.set(method, (methodMap.get(method) || 0) + 1)
            })
            setPaymentMethods(Array.from(methodMap.entries()).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value
            })))

            const statusMap = new Map()
            bills.forEach((b: any) => {
                const status = b.payment_status || 'pending'
                statusMap.set(status, (statusMap.get(status) || 0) + 1)
            })
            setStatusBreakdown(Array.from(statusMap.entries()).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value
            })))

            setRecentTransactions(bills.slice(0, 10))
        } catch (err) {
            console.error('Dashboard error:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadSpecificReport = async () => {
        try {
            setLoading(true)
            const { from, to } = getEffectiveDates()
            let data: any[] = []

            switch (selectedReport) {
                case 'closing_drug':
                    const { data: batches } = await supabase
                        .from('medicine_batches')
                        .select(`*, medication:medications(name, category, rack_location)`)
                        .gt('current_quantity', 0)
                        .order('expiry_date', { ascending: true })
                    data = batches || []
                    break

                case 'expiring_soon':
                    const today = new Date()
                    const todayStr = today.toISOString().split('T')[0]
                    const soon = new Date()
                    soon.setDate(today.getDate() + 30)
                    const soonStr = soon.toISOString().split('T')[0]

                    const { data: expBatches } = await supabase
                        .from('medicine_batches')
                        .select(`*, medication:medications(name, category, rack_location)`)
                        .lte('expiry_date', soonStr)
                        .gte('expiry_date', todayStr)
                        .order('expiry_date', { ascending: true })
                    data = expBatches || []
                    break

                case 'billwise_sales':
                case 'sale':
                    let saleQuery = supabase
                        .from('billing')
                        .select('*')
                        .gte('created_at', from)
                        .lte('created_at', to)

                    if (selectedDept !== 'all') {
                        saleQuery = saleQuery.eq('bill_type', selectedDept)
                    }

                    const { data: sales } = await saleQuery.order('created_at', { ascending: false })
                    data = sales || []
                    break

                case 'drugwise_sales':
                    let drugQuery = supabase
                        .from('billing_item')
                        .select(`*, billing:billing!inner(created_at, bill_type)`)
                        .gte('billing.created_at', from)
                        .lte('billing.created_at', to)

                    if (selectedDept !== 'all') {
                        drugQuery = drugQuery.eq('billing.bill_type', selectedDept)
                    }

                    const { data: drugSales } = await drugQuery

                    const drugMap = new Map()
                    drugSales?.forEach((item: any) => {
                        const key = item.medicine_id || item.description
                        const existing = drugMap.get(key) || { name: item.description, qty: 0, amount: 0, hsn: item.hsn_code }
                        existing.qty += Number(item.qty) || 0
                        existing.amount += Number(item.total_amount) || 0
                        drugMap.set(key, existing)
                    })
                    data = Array.from(drugMap.values()).sort((a, b) => b.amount - a.amount)
                    break

                case 'purchase':
                case 'purchase_gst':
                case 'purchase_value':
                    const { data: purchases } = await supabase
                        .from('drug_purchases')
                        .select(`*, supplier:suppliers(name)`)
                        .gte('purchase_date', from.split('T')[0])
                        .lte('purchase_date', to.split('T')[0])
                    data = purchases || []
                    break

                case 'indent':
                    const { data: indents } = await supabase
                        .from('pharmacy_indents')
                        .select('*')
                        .gte('created_at', from)
                        .lte('created_at', to)
                    data = indents || []
                    break
            }

            setReportData(data)
        } catch (err) {
            console.error('Report load error:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredAndSortedData = useMemo(() => {
        let result = [...reportData]

        // Filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase()
            result = result.filter(item => {
                const searchableString = JSON.stringify(item).toLowerCase()
                return searchableString.includes(lowerSearch)
            })
        }

        // Sort
        result.sort((a, b) => {
            const valA = a.customer_name || a.medication?.name || a.name || a.purchase_number || a.bill_number || ''
            const valB = b.customer_name || b.medication?.name || b.name || b.purchase_number || b.bill_number || ''

            if (sortOrder === 'asc') {
                return valA.toString().localeCompare(valB.toString())
            } else {
                return valB.toString().localeCompare(valA.toString())
            }
        })

        return result
    }, [reportData, searchTerm, sortOrder])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    const renderReportTitle = () => {
        const deptNames: any = {
            pharmacy: 'Pharmacy',
            lab: 'Laboratory',
            radiology: 'X-Ray',
            scan: 'Imaging Scan',
            outpatient: 'Outpatient',
            consultation: 'OP Consultation'
        }

        const deptStr = selectedDept !== 'all' ? `[${deptNames[selectedDept] || selectedDept}] ` : ''

        switch (selectedReport) {
            case 'closing_drug': return `${deptStr}Closing Drug status Report`
            case 'expiring_soon': return `${deptStr}Expiring Soon Medicine Report`
            case 'billwise_sales': return `${deptStr}Billwise Sales Report`
            case 'drugwise_sales': return `${deptStr}Drugwise Sales Report`
            case 'indent': return `${deptStr}Indent Reports`
            case 'purchase_gst': return `${deptStr}Purchase GST Report`
            case 'purchase': return `${deptStr}Purchase Report`
            case 'purchase_value': return `${deptStr}Purchase Value Report`
            case 'sale': return `${deptStr}Sale Reports`
            default: return `${deptStr}Billing history & Analytics`
        }
    }

    // Export Functions
    const exportExcel = async () => {
        const workbook = new ExcelJS.Workbook()
        const worksheet = workbook.addWorksheet(selectedReport)

        if (filteredAndSortedData.length === 0) return

        const headers = Object.keys(filteredAndSortedData[0]).filter(k => typeof filteredAndSortedData[0][k] !== 'object')
        worksheet.addRow(headers.map(h => h.replace('_', ' ').toUpperCase()))

        filteredAndSortedData.forEach(item => {
            worksheet.addRow(headers.map(h => item[h]))
        })

        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${renderReportTitle().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        a.click()
    }

    const exportPDF = () => {
        if (filteredAndSortedData.length === 0) return

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const timestamp = new Date().toLocaleString()
        const title = renderReportTitle()

        // Report Header Logic
        doc.setFontSize(22)
        doc.setTextColor(40)
        doc.text(title, 15, 20)

        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.text(`Generated on: ${timestamp}`, 15, 27)
        doc.text(`Record Count: ${filteredAndSortedData.length}`, 15, 32)

        let headers: string[] = []
        let data: any[][] = []

        const formatPDFCurrency = (num: number) => {
            return 'Rs. ' + new Intl.NumberFormat('en-IN', {
                maximumFractionDigits: 0
            }).format(num)
        }

        // Map columns based on report type
        if (selectedReport === 'closing_drug' || selectedReport === 'expiring_soon') {
            headers = ['MEDICAL FORMULATION', 'BATCH', 'STORAGE RACK', 'QUANTITY', 'EXPIRY']
            data = filteredAndSortedData.map(item => [
                item.medication?.name || 'Generic',
                item.batch_number || 'N/A',
                item.medication?.rack_location || 'LOBBY',
                item.current_quantity?.toString() || '0',
                item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'
            ])
        } else if (selectedReport === 'drugwise_sales') {
            headers = ['PHARMACEUTICAL NAME', 'HSN CODE', 'QTY DISPATCHED', 'GROSS LIQUIDATION']
            data = filteredAndSortedData.map(item => [
                item.name?.toUpperCase() || 'N/A',
                item.hsn || 'N/A',
                `${item.qty} UNITS`,
                formatPDFCurrency(item.amount)
            ])
        } else {
            headers = ['REFERENCE #', 'LEGAL ENTITY / PARTY', 'BASE VALUE', 'OUTCOME STATUS', 'LOG DATE']
            data = filteredAndSortedData.map(p => [
                p.purchase_number || p.bill_number || 'N/A',
                p.supplier?.name || p.customer_name || 'Generic Party',
                formatPDFCurrency(p.total_amount || p.total || 0),
                (p.status || p.payment_status || 'PENDING').toUpperCase(),
                new Date(p.purchase_date || p.created_at).toLocaleDateString()
            ])
        }

        autoTable(doc, {
            head: [headers],
            body: data,
            startY: 40,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: 6
            },
            bodyStyles: {
                fontSize: 9,
                textColor: 50,
                cellPadding: 5
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            columnStyles: {
                2: { halign: 'right' }, // Amounts/Quantities align right
                3: { halign: selectedReport === 'drugwise_sales' ? 'right' : 'center' },
                4: { halign: 'right' }
            },
            margin: { left: 15, right: 15 }
        })

        doc.save(`${renderReportTitle().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const exportWord = () => {
        const content = document.getElementById('report-table-area')?.innerHTML || ''
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Report</title></head><body>`
        const footer = `</body></html>`
        const sourceHTML = header + content + footer

        const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${renderReportTitle().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`
        a.click()
    }

    const exportImage = async () => {
        if (!reportRef.current) return
        const canvas = await html2canvas(reportRef.current)
        const url = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `${renderReportTitle().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`
        a.click()
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans select-none">
            <div className="max-w-[96%] mx-auto space-y-8" ref={reportRef}>
                {/* Header Section */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <Link href="/pharmacy/billing">
                                <button className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-all shadow-sm group">
                                    <ArrowLeft className="h-6 w-6 text-indigo-600 group-hover:-translate-x-1 transition-transform" />
                                </button>
                            </Link>
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{renderReportTitle()}</h1>
                                <p className="text-gray-500 font-bold mt-2 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-indigo-400" />
                                    Dynamic analytics & business intelligence
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative">
                                <button
                                    onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                                    className="flex items-center gap-3 pl-6 pr-12 py-3.5 bg-white border-2 border-indigo-100 rounded-2xl text-base font-black text-gray-800 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 cursor-pointer shadow-sm hover:shadow-lg transition-all outline-none min-w-[280px]"
                                >
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                        {REPORT_OPTIONS.find(r => r.value === selectedReport)?.icon}
                                    </div>
                                    <span className="flex-1 text-left">{REPORT_OPTIONS.find(r => r.value === selectedReport)?.label}</span>
                                    <ChevronDown className={`absolute right-4 h-4 w-4 text-gray-400 stroke-[3px] transition-transform duration-300 ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isReportDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsReportDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 mt-3 w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {REPORT_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => {
                                                        setSelectedReport(opt.value)
                                                        setIsReportDropdownOpen(false)
                                                    }}
                                                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${selectedReport === opt.value
                                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                                        : 'text-gray-600 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className={`p-2 rounded-xl ${selectedReport === opt.value ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                                                        {opt.icon}
                                                    </div>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex bg-gray-100 p-1 rounded-2xl shadow-inner border border-gray-200">
                                {['today', 'this_week', 'this_month', 'this_year'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => { setDateRange(r); setStartDate(''); setEndDate(''); }}
                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${dateRange === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        {r.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Department Filter Segments */}
                    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-50 rounded-2xl border border-gray-100">
                        {[
                            { id: 'all', label: 'All Depts', icon: <Activity className="h-3 w-3" /> },
                            { id: 'pharmacy', label: 'Pharmacy', icon: <Package className="h-3 w-3" /> },
                            { id: 'lab', label: 'Lab', icon: <Activity className="h-3 w-3" /> },
                            { id: 'radiology', label: 'X-Ray', icon: <Activity className="h-3 w-3" /> },
                            { id: 'scan', label: 'Scan', icon: <Activity className="h-3 w-3" /> },
                            { id: 'outpatient', label: 'Outpatient', icon: <User className="h-3 w-3" /> },
                            { id: 'consultation', label: 'Consultation', icon: <Stethoscope className="h-3 w-3" /> }
                        ].map((dept) => (
                            <button
                                key={dept.id}
                                onClick={() => setSelectedDept(dept.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${selectedDept === dept.id
                                    ? 'bg-white text-indigo-600 border-indigo-100 shadow-sm'
                                    : 'text-gray-400 border-transparent hover:text-gray-600 hover:bg-gray-100/50'
                                    }`}
                            >
                                {dept.icon}
                                {dept.label}
                            </button>
                        ))}
                    </div>

                    {/* Advanced Filter Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8 pt-4 border-t border-gray-100 items-center">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search client, drug, or identifier..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                />
                            </div>
                            <span className="text-gray-300 font-black text-[10px]">TO</span>
                            <div className="flex-1 relative">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase focus:bg-white focus:border-indigo-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="relative max-w-[150px] lg:ml-auto">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                className="w-full appearance-none pl-11 pr-8 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-black focus:bg-white focus:border-indigo-500 transition-all outline-none cursor-pointer uppercase tracking-wider"
                            >
                                <option value="asc">SORT A-Z</option>
                                <option value="desc">SORT Z-A</option>
                            </select>
                            {sortOrder === 'asc' ? <SortAsc className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" /> : <SortDesc className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500" />}
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 stroke-[3px] pointer-events-none" />
                        </div>

                        <div className="flex gap-2">
                            <div className="relative group flex-1">
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-xs">
                                    <Download className="h-4 w-4" />
                                    EXPORT AS
                                </button>
                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 p-2 space-y-1">
                                    <button onClick={exportPDF} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all">
                                        <FileText className="h-4 w-4" /> PDF Document
                                    </button>
                                    <button onClick={exportExcel} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
                                        <FileSpreadsheet className="h-4 w-4" /> Excel Sheet
                                    </button>
                                    <button onClick={exportWord} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all">
                                        <FileText className="h-4 w-4" /> Word Document
                                    </button>
                                    <button onClick={exportImage} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all">
                                        <ImageIcon className="h-4 w-4" /> High-Res Image
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {selectedReport === 'dashboard' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        {/* Summary Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <SummaryCard icon={<TrendingUp />} label="Total Collection" value={formatCurrency(stats.totalCollection)} color="indigo" growth="+15%" />
                            <SummaryCard icon={<Receipt />} label="Total Bills" value={stats.totalBills.toString()} color="emerald" growth="+22%" />
                            <SummaryCard icon={<Wallet />} label="Pending Amount" value={formatCurrency(stats.pendingAmount)} color="amber" growth="-5%" />
                            <SummaryCard icon={<Activity />} label="Avg. Ticket Size" value={formatCurrency(stats.avgBillValue)} color="rose" growth="+12%" />
                        </div>

                        {/* Analytic Clusters */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8">
                                    <div className="w-24 h-24 bg-indigo-50/50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                                </div>
                                <div className="flex items-center justify-between mb-10 relative">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Growth Trajectory</h3>
                                        <p className="text-gray-400 font-bold text-sm tracking-wide">Real-time revenue monitoring</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 rounded-2xl text-xs font-black uppercase tracking-widest ring-1 ring-green-100 shadow-sm">
                                        <TrendingUp className="h-4 w-4" />
                                        Positive Trend
                                    </div>
                                </div>
                                <div className="h-[360px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={salesByDay}>
                                            <defs>
                                                <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#cbd5e1' }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}
                                                itemStyle={{ fontWeight: 900, color: '#4f46e5' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={5} fillOpacity={1} fill="url(#premiumGrad)" animationDuration={2000} strokeLinecap="round" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter mb-10 w-full">Payment Mix</h3>
                                <div className="h-[280px] w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentMethods}
                                                innerRadius={85}
                                                outerRadius={110}
                                                paddingAngle={15}
                                                dataKey="value"
                                                stroke="none"
                                                cornerRadius={16}
                                            >
                                                {paymentMethods.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest leading-none">Total Value</p>
                                        <h4 className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{formatCurrency(stats.totalCollection)}</h4>
                                    </div>
                                </div>
                                <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                                    {paymentMethods.map((m, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/50 border border-gray-100 transition-hover hover:border-indigo-200">
                                            <div className="w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-gray-900 leading-none">{m.name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{m.value} Bills</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Table */}
                        <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-white">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">Live Transaction Feed</h3>
                                    <p className="text-gray-400 font-bold text-sm">Monitoring medical billing cycles in real-time</p>
                                </div>
                                <button className="px-8 py-3 bg-gray-50 text-indigo-600 rounded-2xl font-black text-xs hover:bg-indigo-50 border-2 border-transparent hover:border-indigo-100 transition-all">
                                    FULL AUDIT LOG
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] w-48">Identifier</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Medical Client</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Net Value</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Status</th>
                                            <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {recentTransactions.map((tx) => (
                                            <tr key={tx.id} className="group hover:bg-indigo-50/10 transition-all cursor-pointer">
                                                <td className="px-10 py-6 font-black text-gray-900 tracking-tight group-hover:text-indigo-600 uppercase">{tx.bill_number}</td>
                                                <td className="px-10 py-6 text-gray-500 font-bold group-hover:text-gray-900">{tx.customer_name || 'Anonymous Guest'}</td>
                                                <td className="px-10 py-6 text-right font-black text-gray-900 text-lg">{formatCurrency(tx.total)}</td>
                                                <td className="px-10 py-6 text-center">
                                                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-[1.25rem] text-[10px] font-black tracking-widest border-2 ${tx.payment_status === 'paid'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                                        }`}>
                                                        <div className={`w-2 h-2 rounded-full ${tx.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
                                                        {tx.payment_status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-sm font-black text-gray-900 leading-none">{new Date(tx.created_at).toLocaleDateString('en-GB')}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-700">
                        {/* Summary View for Specific Report */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <SummaryCard icon={<Activity />} label="Record Count" value={filteredAndSortedData.length.toString()} color="indigo" growth="" />
                            <SummaryCard icon={<DollarSign />} label="Accumulated Valuation" value={formatCurrency(filteredAndSortedData.reduce((s, i) => s + (Number(i.total_amount || i.amount || i.current_quantity * (i.unit_price || 0)) || 0), 0))} color="emerald" growth="" />
                            <SummaryCard icon={<Calendar />} label="Report Density" value="Active Data" color="amber" growth="" />
                        </div>

                        {/* Data Engine Table */}
                        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden" id="report-table-area">
                            {loading ? (
                                <div className="p-32 flex flex-col items-center justify-center space-y-6">
                                    <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Synchronizing Central Database...</p>
                                </div>
                            ) : filteredAndSortedData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    {selectedReport === 'closing_drug' || selectedReport === 'expiring_soon' ? (
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50/50">
                                                <tr className="border-b border-gray-100">
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medical Formulation</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Identifier</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage Rack</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Volume</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Expiry Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredAndSortedData.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/5 transition-all">
                                                        <td className="px-10 py-6 font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{item.medication?.name || 'GENERIC'}</td>
                                                        <td className="px-10 py-6 text-gray-500 font-bold">{item.batch_number}</td>
                                                        <td className="px-10 py-6 text-gray-500 font-bold">{item.medication?.rack_location || 'LOBBY'}</td>
                                                        <td className="px-10 py-6 text-right font-black text-indigo-600 text-lg">{item.current_quantity}</td>
                                                        <td className="px-10 py-6 text-right text-gray-400 font-bold">{new Date(item.expiry_date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : selectedReport === 'drugwise_sales' ? (
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Pharmaceutical Name</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reg. Code (HSN)</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quantity Dispatched</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Gross Liquidation</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredAndSortedData.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/5 transition-all">
                                                        <td className="px-10 py-6 font-black text-gray-900 uppercase tracking-tight">{item.name}</td>
                                                        <td className="px-10 py-6 text-gray-400 font-bold">{item.hsn || 'N/A'}</td>
                                                        <td className="px-10 py-6 text-right font-black text-blue-600 text-lg">{item.qty} UNITS</td>
                                                        <td className="px-10 py-6 text-right font-black text-emerald-600 text-xl">{formatCurrency(item.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50/50">
                                                <tr>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Core Reference #</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Legal Entity / Counterparty</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Base Value</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Outcome Status</th>
                                                    <th className="px-10 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Log Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {filteredAndSortedData.map((p, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50/5 transition-all group">
                                                        <td className="px-10 py-6 font-black text-gray-900 tracking-tight flex items-center gap-3">
                                                            <div className="w-2 h-8 bg-indigo-500 rounded-full scale-y-50 opacity-0 group-hover:opacity-100 group-hover:scale-y-100 transition-all duration-300"></div>
                                                            {p.purchase_number || p.bill_number}
                                                        </td>
                                                        <td className="px-10 py-6 text-gray-500 font-bold">{p.supplier?.name || p.customer_name || 'Generic Party'}</td>
                                                        <td className="px-10 py-6 text-right font-black text-gray-900 text-xl">{formatCurrency(p.total_amount || p.total)}</td>
                                                        <td className="px-10 py-6 text-center">
                                                            <span className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-600 font-black text-[10px] uppercase ring-1 ring-gray-200">
                                                                {p.status || p.payment_status}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-6 text-right font-black text-gray-400">{new Date(p.purchase_date || p.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ) : (
                                <div className="p-32 flex flex-col items-center justify-center text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 ring-1 ring-gray-100">
                                        <Search className="h-10 w-10 text-gray-200" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter shadow-none uppercase">Zero Records Captured</h3>
                                    <p className="text-gray-400 font-bold mt-2 max-w-xs">The current filter criteria matched zero entries in the medical repository.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function SummaryCard({ icon, label, value, color, growth }: { icon: React.ReactNode, label: string, value: string, color: string, growth: string }) {
    const colorClasses: any = {
        indigo: 'from-indigo-600 to-indigo-800 text-indigo-600 bg-indigo-50 border-indigo-100',
        emerald: 'from-emerald-600 to-emerald-800 text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'from-amber-600 to-amber-800 text-amber-600 bg-amber-50 border-amber-100',
        rose: 'from-rose-600 to-rose-800 text-rose-600 bg-rose-50 border-rose-100'
    }

    return (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-gray-200 transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-gray-50/50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="flex flex-col gap-6 relative">
                <div className="flex items-center justify-between">
                    <div className={`p-4 rounded-2xl ${colorClasses[color].split(' ').slice(1).join(' ')} shadow-inner flex items-center justify-center`}>
                        <div className="h-6 w-6">
                            {icon}
                        </div>
                    </div>
                    {growth && (
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${growth.startsWith('+') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} ring-1 ring-inset tracking-widest`}>
                            {growth}
                        </span>
                    )}
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                    <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{value}</h3>
                </div>
            </div>
        </div>
    )
}
