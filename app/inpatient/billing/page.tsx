'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Plus, 
  TrendingUp, 
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingDown,
  Loader2,
  Calendar,
  BedDouble,
  FileText
} from 'lucide-react';
import { supabase } from '../../../src/lib/supabase';
import { getBedAllocations, type BedAllocation } from '../../../src/lib/bedAllocationService';

export default function IPAllBillingPage() {
  const [loading, setLoading] = useState(true);
  const [allocations, setAllocations] = useState<BedAllocation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    activeBills: 0,
    dischargedBills: 0,
    totalRevenue: 0,
    pendingAmount: 0
  });

  useEffect(() => {
    loadBillingRecords();
  }, [statusFilter]);

  const loadBillingRecords = async () => {
    try {
      setLoading(true);
      const { allocations: data } = await getBedAllocations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100
      });
      setAllocations(data);

      // Simple stats for demo/summary
      setStats({
        activeBills: data.filter(a => a.status === 'active').length,
        dischargedBills: data.filter(a => a.status === 'discharged').length,
        totalRevenue: 1254000, // Placeholder
        pendingAmount: 342000 // Placeholder
      });
    } catch (error) {
      console.error('Error loading billing:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAllocations = allocations.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (a.patient?.name || '').toLowerCase().includes(q) ||
      (a.patient?.uhid || '').toLowerCase().includes(q) ||
      (a.ip_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] font-geist">
      {/* ── HEADER ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none text-2xl">IP Billing Center</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Management & Settlement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
               <input 
                 type="text" 
                 placeholder="Search Patient Name, UHID, IP..." 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-2xl text-sm font-bold w-72 focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
               />
             </div>
             <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
               <Download className="h-4 w-4" /> Export
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* ── STATS CARDS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           {[
             { label: 'Active Bills', value: stats.activeBills, sub: 'Currently admitted', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
             { label: 'Discharged', value: stats.dischargedBills, sub: 'Ready for settlement', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
             { label: 'Pending Bills', value: '₹3,42,000', sub: 'Calculated uncollected', icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
             { label: 'Total Billed', value: '₹12,54,000', sub: 'Last 30 days revenue', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
           ].map((stat, idx) => (
             <div key={idx} className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between group hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                </div>
                <div>
                   <p className="text-2xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                   <p className="text-xs font-medium text-slate-400 mt-0.5 tracking-tight">{stat.sub}</p>
                </div>
             </div>
           ))}
        </div>

        {/* ── TABLES ── */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden mb-12">
           <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
             <div className="flex items-center gap-2">
               <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Inpatient Financial Records</h2>
               <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 uppercase">{filteredAllocations.length} total</span>
             </div>
             <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
               {['all', 'active', 'discharged'].map(s => (
                 <button 
                   key={s} 
                   onClick={() => setStatusFilter(s)}
                   className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {s}
                 </button>
               ))}
             </div>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                   <th className="px-8 py-4">Patient Information</th>
                   <th className="px-8 py-4">Stay & Doctor</th>
                   <th className="px-8 py-4">Admission</th>
                   <th className="px-8 py-4">Status</th>
                   <th className="px-8 py-4 text-right">Settlement</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {loading ? (
                   [...Array(5)].map((_, i) => (
                     <tr key={i} className="animate-pulse">
                        <td className="px-8 py-6"><div className="h-5 w-40 bg-slate-100 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-5 w-32 bg-slate-100 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-5 w-24 bg-slate-100 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-5 w-20 bg-slate-100 rounded" /></td>
                        <td className="px-8 py-6"><div className="h-5 w-20 bg-slate-100 rounded ml-auto" /></td>
                     </tr>
                   ))
                 ) : filteredAllocations.map((a) => (
                   <tr key={a.id} className="group hover:bg-slate-50 transition-colors">
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs">
                             {a.patient?.name?.charAt(0)}
                           </div>
                           <div>
                             <p className="text-sm font-black text-slate-900 leading-none">{a.patient?.name}</p>
                             <div className="flex items-center gap-2 mt-1.5">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{a.patient?.uhid}</span>
                               <span className="text-slate-200">/</span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{a.ip_number}</span>
                             </div>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-700 leading-none">Bed {a.bed?.bed_number || '—'}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium tracking-tight">Dr. {(a as any).doctor?.name || 'Consultant'}</p>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <Calendar className="h-3.5 w-3.5 text-slate-300" />
                           <span className="text-xs font-bold text-slate-600">{new Date(a.admission_date).toLocaleDateString()}</span>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          a.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-150'
                        }`}>
                          <div className={`w-1 h-1 rounded-full ${a.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {a.status}
                        </span>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <Link href={`/inpatient/billing/${a.id}/create`}>
                          <button className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm">
                            <ArrowRight className="h-5 w-5" />
                          </button>
                        </Link>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           
           {filteredAllocations.length === 0 && !loading && (
             <div className="py-20 text-center">
               <Receipt className="h-12 w-12 text-slate-200 mx-auto mb-4" />
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No billing records found</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
