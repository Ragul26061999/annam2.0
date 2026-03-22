'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Calendar,
    User,
    Stethoscope,
    Clock,
    TrendingUp,
    Users,
    Activity,
    Printer
} from 'lucide-react';
import { getRecentRevisits, getRevisitStats } from '../../src/lib/revisitService';

export default function RevisitDashboard() {
    const router = useRouter();
    const [revisits, setRevisits] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, thisMonth: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [revisitData, statsData] = await Promise.all([
                getRecentRevisits(50),
                getRevisitStats()
            ]);
            setRevisits(revisitData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading revisit data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRevisits = revisits.filter(revisit => {
        const search = searchTerm.toLowerCase();
        return (
            revisit.uhid?.toLowerCase().includes(search) ||
            revisit.patient?.name?.toLowerCase().includes(search) ||
            revisit.reason_for_visit?.toLowerCase().includes(search)
        );
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const showThermalPreviewWithLogo = (revisit: any) => {
        if (!revisit) return;

        const now = new Date();
        const printedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()}`;
        const printedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const patientUhid = revisit.uhid || revisit.patient?.patient_id || 'WALK-IN';
        const patientName = revisit.patient?.name || 'Unknown Patient';
        const billNumber = (revisit.id || '').toUpperCase().substring(0, 8);
        const paymentType = (revisit.payment_mode || 'CASH').toUpperCase();
        const consultingDoctorName = revisit.consulting_doctor_name || 'N/A';

        const bDate = new Date(revisit.visit_date);
        const billDateStr = bDate.toLocaleDateString('en-IN') + ' ' + (revisit.visit_time || '');

        const fee = Number(revisit.consultation_fee || 0);

        const itemsHtml = `
          <tr>
            <td class="text-center">1</td>
            <td class="text-left font-bold uppercase">REVISIT CONSULTATION<br/><small>${revisit.reason_for_visit || ''}</small></td>
            <td class="text-center">1</td>
            <td class="text-right">₹${fee.toFixed(2)}</td>
          </tr>
          <tr><td style="height: 10mm;"></td><td></td><td></td><td></td></tr>
        `;

        const thermalContent = '<html>' +
          '<head>' +
            '<title>Thermal Receipt - ' + billNumber + '</title>' +
            '<style>' +
                '@page { margin: 3mm 8mm 3mm 3mm; size: 85mm 297mm; }' +
                'body {' +
                  'font-family: \'Verdana\', sans-serif;' +
                  'font-weight: bold;' +
                  'margin: 0;' +
                  'padding: 2px;' +
                  'font-size: 14px;' +
                  'line-height: 1.2;' +
                  'width: 85mm;' +
                  'color: #000;' +
                  '-webkit-print-color-adjust: exact;' +
                  'print-color-adjust: exact;' +
                '}' +
                'html, body { background: #fff; }' +
                '.header-14cm { font-size: 16pt; font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.header-9cm { font-size: 11pt; font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.header-10cm { font-size: 12pt; font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.header-8cm { font-size: 10pt; font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.items-8cm { font-size: 10pt; font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.bill-info-10cm { font-size: 12pt; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.bill-info-bold { font-weight: bold; font-family: \'Verdana\', sans-serif; }' +
                '.footer-7cm { font-size: 9pt; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.center { text-align: center; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.right { text-align: right; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.table { width: 100%; border-collapse: collapse; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.table td { padding: 1px; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.totals-line { display: flex; justify-content: space-between; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.footer { margin-top: 15px; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.signature-area { margin-top: 25px; font-family: \'Verdana\', sans-serif; font-weight: bold; }' +
                '.logo { width: 300px; height: auto; margin-bottom: 5px; }' +
                '.text-center { text-align: center; }' +
                '.text-right { text-align: right; }' +
              '</style>' +
            '</head>' +
            '<body>' +
              '<div class="center">' +
                '<img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />' +
                '<div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>' +
                '<div class="header-9cm">Phone- 04639 252592</div>' +
                '<div class="footer-7cm">Gst No: 33AJWPR2713G2ZZ</div>' +
                '<div style="margin-top: 5px; font-weight: bold;">REVISIT BILL</div>' +
              '</div>' +
              
              '<div style="margin-top: 10px;">' +
                '<table class="table">' +
                  '<tr>' +
                    '<td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="bill-info-10cm bill-info-bold">' + billNumber + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="bill-info-10cm bill-info-bold">' + patientUhid + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="bill-info-10cm bill-info-bold">' + patientName + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="bill-info-10cm bill-info-bold">' + billNumber + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="header-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="header-10cm bill-info-bold">' + new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString() + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="header-10cm bill-info-bold">' + paymentType + '</td>' +
                  '</tr>' +
                  '<tr>' +
                    '<td class="header-10cm">Consulting Dr&nbsp;:&nbsp;&nbsp;</td>' +
                    '<td class="header-10cm bill-info-bold">Dr. ' + consultingDoctorName + '</td>' +
                  '</tr>' +
                '</table>' +
              '</div>' +
              
              '<div style="margin-top: 10px;">' +
                '<table class="table">' +
                  '<tr style="border-bottom: 1px dashed #000;">' +
                    '<td width="30%" class="items-8cm">S.No</td>' +
                    '<td width="40%" class="items-8cm">CHARGE NAME</td>' +
                    '<td width="15%" class="items-8cm text-center">Qty</td>' +
                    '<td width="15%" class="items-8cm text-right">Amt</td>' +
                  '</tr>' +
                  itemsHtml +
                '</table>' +
              '</div>' +
              
              '<div style="margin-top: 10px;">' +
                '<div class="totals-line items-8cm">' +
                  '<span>Taxable Amount</span>' +
                  '<span>' + fee.toFixed(2) + '</span>' +
                '</div>' +
                '<div class="totals-line items-8cm">' +
                  '<span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>' +
                  '<span>0.00</span>' +
                '</div>' +
                '<div class="totals-line items-8cm">' +
                  '<span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>' +
                  '<span>0.00</span>' +
                '</div>' +
                '<div class="totals-line items-8cm">' +
                  '<span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>' +
                  '<span>0.00</span>' +
                '</div>' +
                '<div class="totals-line items-8cm">' +
                  '<span>&nbsp;&nbsp;&nbsp;&nbsp;Tax Amt</span>' +
                  '<span>0.00</span>' +
                '</div>' +
                '<div class="totals-line items-8cm">' +
                  '<span>&nbsp;&nbsp;&nbsp;&nbsp;Tot.Net.Amt</span>' +
                  '<span>' + fee.toFixed(2) + '</span>' +
                '</div>' +
              
              '<div class="footer">' +
                '<div class="footer-left">' +
                  'PRINTED ON: ' + printedDate + '<br/>' +
                  'TIME: ' + printedTime +
                '</div>' +
                '<div class="footer-right">' +
                  '<div class="signature-area"></div><br/>' +
                  'BILLING SIGNATURE' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</body>' +
        '</html>';

        const printWindow = window.open('', '_blank', 'width=450,height=650');
        if (printWindow) {
            printWindow.document.write(thermalContent);
            printWindow.document.close();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                            <RefreshCw className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Revisits</h1>
                            <p className="text-gray-600">Track and manage returning patients</p>
                        </div>
                    </div>
                    <Link
                        href="/revisit/create"
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
                    >
                        <Plus size={20} />
                        New Revisit
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Revisits</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-cyan-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Today's Revisits</p>
                                <p className="text-3xl font-bold text-cyan-600 mt-2">{stats.today}</p>
                            </div>
                            <div className="p-3 bg-cyan-100 rounded-xl">
                                <Activity className="h-6 w-6 text-cyan-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">This Month</p>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.thisMonth}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by UHID, patient name, or reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Revisits Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Recent Revisits</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600">Loading revisits...</p>
                        </div>
                    ) : filteredRevisits.length === 0 ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">No revisits found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            UHID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Reason for Visit
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Visit Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Fee
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRevisits.map((revisit) => (
                                        <tr key={revisit.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span>{formatDate(revisit.visit_date)}</span>
                                                    <Clock className="h-4 w-4 text-gray-400 ml-2" />
                                                    <span>{revisit.visit_time}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono font-semibold text-cyan-600">
                                                    {revisit.uhid}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">
                                                        {revisit.patient?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700">
                                                    {revisit.reason_for_visit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">
                                                    {revisit.visit_type || 'follow-up'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-semibold text-green-600">
                                                    ₹{revisit.consultation_fee || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => showThermalPreviewWithLogo(revisit)}
                                                    className="p-2 text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-all"
                                                    title="Print Bill"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
