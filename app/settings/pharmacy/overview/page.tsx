'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit,
  Loader2,
  Package,
  Save,
  Search,
  X,
  FlaskConical,
  Building2,
  MapPin,
  AlertTriangle,
  Tag,
  Layers,
  BadgeCheck,
  Clock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Info,
  Printer
} from 'lucide-react';
import { DosageFormSelect } from '@/src/components/ui/DosageFormSelect';
import { ManufacturerSelect } from '@/src/components/ui/ManufacturerSelect';
import { CategorySelect } from '@/src/components/ui/CategorySelect';
import { supabase } from '@/src/lib/supabase';

interface Medication {
  id: string;
  name: string;
  combination: string | null;
  nickname: string | null;
  generic_name: string | null;
  manufacturer: string | null;
  dosage_form: string | null;
  minimum_stock_level: number | null;
  category: string | null;
  location: string | null;
  unit: string | null;
  is_active: boolean;
}

interface MedicineBatch {
  id: string;
  batch_number: string;
  received_quantity: number;
  current_quantity: number;
  purchase_price: number | null;
  selling_price: number | null;
  expiry_date: string | null;
  received_date: string | null;
  manufacturing_date: string | null;
  supplier_name: string | null;
  status: string | null;
  edited: boolean | null;
  verified: boolean | null;
  legacy_code: string | null;
}

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection',
  'Ointment', 'Cream', 'Drops', 'Inhaler', 'Powder', 'Other'
];

const DOSAGE_FORM_COLORS: Record<string, string> = {
  Tablet: 'bg-blue-50 text-blue-700 border-blue-200',
  Capsule: 'bg-purple-50 text-purple-700 border-purple-200',
  Syrup: 'bg-amber-50 text-amber-700 border-amber-200',
  Suspension: 'bg-orange-50 text-orange-700 border-orange-200',
  Injection: 'bg-red-50 text-red-700 border-red-200',
  Ointment: 'bg-teal-50 text-teal-700 border-teal-200',
  Cream: 'bg-pink-50 text-pink-700 border-pink-200',
  Drops: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  Inhaler: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Powder: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Other: 'bg-gray-50 text-gray-700 border-gray-200'
};

function getExpiryStatus(expiryDate: string | null): { label: string; color: string; icon: React.ReactNode } {
  if (!expiryDate) return { label: 'No date', color: 'text-gray-400', icon: <Info className="w-3.5 h-3.5" /> };
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Expired', color: 'text-red-600', icon: <XCircle className="w-3.5 h-3.5" /> };
  if (diffDays <= 90) return { label: `${diffDays}d left`, color: 'text-orange-500', icon: <ShieldAlert className="w-3.5 h-3.5" /> };
  if (diffDays <= 180) return { label: `${diffDays}d left`, color: 'text-amber-500', icon: <Clock className="w-3.5 h-3.5" /> };
  return { label: new Date(expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), color: 'text-emerald-600', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
}

function getStockStatus(current: number, min: number | null): { label: string; barColor: string; textColor: string; pct: number } {
  if (!min || min === 0) return { label: 'No limit set', barColor: 'bg-gray-200', textColor: 'text-gray-500', pct: 100 };
  const pct = Math.min((current / min) * 100, 100);
  if (current === 0) return { label: 'Out of stock', barColor: 'bg-red-500', textColor: 'text-red-600', pct: 0 };
  if (current < min) return { label: 'Low stock', barColor: 'bg-orange-400', textColor: 'text-orange-500', pct };
  return { label: 'In stock', barColor: 'bg-emerald-500', textColor: 'text-emerald-600', pct };
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 shrink-0">{label}:</span>
      <span className="text-xs font-medium text-gray-800 truncate">{value}</span>
    </div>
  );
}

export default function PharmacyOverviewPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingBatchMedicationId, setEditingBatchMedicationId] = useState<string | null>(null);
  const [batchDraft, setBatchDraft] = useState<Partial<MedicineBatch> | null>(null);
  const [batchUnitPriceDraft, setBatchUnitPriceDraft] = useState<{
    purchase_unit: string;
    selling_unit: string;
  } | null>(null);
  const [savingBatchId, setSavingBatchId] = useState<string | null>(null);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [expandedMedicationId, setExpandedMedicationId] = useState<string | null>(null);
  const [batchesByMedicationId, setBatchesByMedicationId] = useState<Record<string, MedicineBatch[]>>({});
  const [loadingBatchesFor, setLoadingBatchesFor] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Medication> | null>(null);

  const filteredMedications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter((m) => {
      const hay = [m.name, m.combination, m.nickname, m.generic_name, m.manufacturer, m.category, m.dosage_form, m.location]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [medications, search]);

  useEffect(() => {
    const fetchAllMedications = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('medications')
          .select('id,name,combination,nickname,generic_name,manufacturer,dosage_form,minimum_stock_level,category,location,unit,is_active')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setMedications((data || []) as Medication[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMedications();

    // Auto-hide sidebar on mount
    const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('aside') || document.querySelector('nav[class*="side"]')
    if (sidebar && sidebar instanceof HTMLElement) {
      sidebar.style.display = 'none'
    }
    
    // Restore sidebar on unmount
    return () => {
      if (sidebar && sidebar instanceof HTMLElement) {
        sidebar.style.display = ''
      }
    }
  }, []);

  const fetchBatches = async (medicationId: string) => {
    try {
      setLoadingBatchesFor(medicationId);
      const { data, error } = await supabase
        .from('medicine_batches')
        .select('id,batch_number,received_quantity,current_quantity,purchase_price,selling_price,expiry_date,received_date,manufacturing_date,supplier_name,status,edited,verified,legacy_code')
        .or(`medication_id.eq.${medicationId},medicine_id.eq.${medicationId}`)
        .eq('is_active', true)
        .order('expiry_date');
      if (error) throw error;
      setBatchesByMedicationId((prev) => ({ ...prev, [medicationId]: (data || []) as MedicineBatch[] }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBatchesFor(null);
    }
  };

  const toggleExpand = async (medicationId: string) => {
    if (expandedMedicationId === medicationId) {
      setExpandedMedicationId(null);
      return;
    }
    setExpandedMedicationId(medicationId);
    if (!batchesByMedicationId[medicationId]) {
      await fetchBatches(medicationId);
    }
  };

  const beginEdit = (m: Medication) => {
    setEditingMedicationId(m.id);
    setDraft({ ...m });
  };

  const beginBatchEdit = (medicationId: string, b: MedicineBatch) => {
    setEditingBatchId(b.id);
    setEditingBatchMedicationId(medicationId);
    setBatchDraft({ ...b });

    const receivedQty = b.received_quantity || 0;
    const purchaseUnit =
      b.purchase_price === null
        ? ''
        : receivedQty > 0
          ? (b.purchase_price / receivedQty).toFixed(2)
          : String(b.purchase_price);
    const sellingUnit =
      b.selling_price === null
        ? ''
        : receivedQty > 0
          ? (b.selling_price / receivedQty).toFixed(2)
          : String(b.selling_price);

    setBatchUnitPriceDraft({ purchase_unit: purchaseUnit, selling_unit: sellingUnit });
  };

  const cancelBatchEdit = () => {
    setEditingBatchId(null);
    setEditingBatchMedicationId(null);
    setBatchDraft(null);
    setBatchUnitPriceDraft(null);
  };

  const saveBatchEdit = async () => {
    if (!editingBatchId || !editingBatchMedicationId || !batchDraft) return;
    if (!batchDraft.batch_number || !String(batchDraft.batch_number).trim()) {
      alert('Batch number is required.');
      return;
    }

    try {
      setSavingBatchId(editingBatchId);

      const receivedQty = Number(batchDraft.received_quantity || 0);
      const purchaseUnitRaw = batchUnitPriceDraft?.purchase_unit ?? '';
      const sellingUnitRaw = batchUnitPriceDraft?.selling_unit ?? '';
      const purchaseUnit = purchaseUnitRaw === '' ? null : Number(purchaseUnitRaw);
      const sellingUnit = sellingUnitRaw === '' ? null : Number(sellingUnitRaw);

      if (purchaseUnit !== null && (Number.isNaN(purchaseUnit) || purchaseUnit < 0)) {
        alert('Purchase unit price must be a valid non-negative number.');
        return;
      }
      if (sellingUnit !== null && (Number.isNaN(sellingUnit) || sellingUnit < 0)) {
        alert('MRP unit price must be a valid non-negative number.');
        return;
      }

      const purchaseTotal =
        purchaseUnit === null ? null : (receivedQty > 0 ? purchaseUnit * receivedQty : purchaseUnit);
      const sellingTotal =
        sellingUnit === null ? null : (receivedQty > 0 ? sellingUnit * receivedQty : sellingUnit);

      const payload = {
        batch_number: String(batchDraft.batch_number).trim(),
        legacy_code: batchDraft.legacy_code ?? null,
        current_quantity: batchDraft.current_quantity ?? 0,
        purchase_price: purchaseTotal,
        selling_price: sellingTotal,
        manufacturing_date: batchDraft.manufacturing_date ?? null,
        expiry_date: batchDraft.expiry_date ?? null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('medicine_batches')
        .update(payload)
        .eq('id', editingBatchId);
      if (error) throw error;

      setBatchesByMedicationId((prev) => {
        const current = prev[editingBatchMedicationId] || [];
        return {
          ...prev,
          [editingBatchMedicationId]: current.map((row) =>
            row.id === editingBatchId ? ({ ...(row as any), ...(payload as any) } as MedicineBatch) : row
          )
        };
      });

      cancelBatchEdit();
    } catch (e) {
      console.error(e);
      alert('Failed to update batch. Please try again.');
    } finally {
      setSavingBatchId(null);
    }
  };

  const cancelEdit = () => {
    setEditingMedicationId(null);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (!editingMedicationId || !draft) return;
    try {
      setSaving(editingMedicationId);
      const payload = {
        name: draft.name ?? null,
        combination: draft.combination ?? null,
        nickname: draft.nickname ?? null,
        manufacturer: draft.manufacturer ?? null,
        dosage_form: draft.dosage_form ?? null,
        minimum_stock_level:
          draft.minimum_stock_level === null || draft.minimum_stock_level === undefined
            ? null : Number(draft.minimum_stock_level),
        category: draft.category ?? null,
        location: draft.location ?? null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabase.from('medications').update(payload).eq('id', editingMedicationId);
      if (error) throw error;
      setMedications((prev) =>
        prev.map((m) => (m.id === editingMedicationId ? ({ ...(m as any), ...(payload as any) } as Medication) : m))
      );
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert('Failed to update medicine. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  // Compute total stock per medication across all loaded batches
  const totalStockByMedicationId = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [id, batches] of Object.entries(batchesByMedicationId)) {
      result[id] = batches.reduce((acc, b) => acc + (b.current_quantity ?? 0), 0);
    }
    return result;
  }, [batchesByMedicationId]);

  // ─── Print Barcode for Batch ────────────────────────────────────────────────────

  const printBatchBarcode = async (batch: MedicineBatch, medicineName: string) => {
    try {
      // Helper function to format expiry date safely
      const formatExpiryDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        try {
          // Handle DD-MM-YYYY format
          if (dateStr.includes('-') && dateStr.split('-').length === 3) {
            const [day, month, year] = dateStr.split('-')
            const date = new Date(`${year}-${month}-${day}`)
            if (isNaN(date.getTime())) return dateStr
            return date.toLocaleDateString('en-GB')
          }
          // Handle ISO format or other formats
          const date = new Date(dateStr)
          if (isNaN(date.getTime())) return dateStr
          return date.toLocaleDateString('en-GB')
        } catch {
          return dateStr
        }
      }

      const expiryDate = formatExpiryDate(batch.expiry_date)
      const printDate = new Date().toLocaleDateString('en-GB')
      const printTime = new Date().toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })
      
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      const labelContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Medicine Batch Label</title>
            <style>
              @page { 
                size: 50mm 25mm; 
                margin: 1mm; 
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                font-family: 'Arial', sans-serif;
                width: 48mm;
                height: 23mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 1mm;
                font-size: 8px;
                line-height: 1.1;
                background: white;
              }
              .header {
                text-align: center;
                font-size: 10px;
                font-weight: bold;
                color: #000;
                margin-bottom: 1mm;
              }
              .batch-info {
                display: flex;
                justify-content: space-between;
                font-size: 6px;
                color: #000;
                margin-bottom: 0.8mm;
              }
              .barcode-section {
                text-align: center;
                margin: 1mm 0;
                height: 10mm;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                border: 0.5px solid #ddd;
                background: #f9f9f9;
              }
              #barcode {
                width: 30mm;
                height: 10mm;
                display: block;
              }
              .footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 6px;
                color: #000;
              }
            </style>
          </head>
          <body>
            <div class="header">ANNAM HOSPITAL</div>
            
            <div class="batch-info">
              <span>Batch: ${batch.batch_number}</span>
              <span>Qty: ${batch.current_quantity}</span>
            </div>
            
            <div class="barcode-section">
              <svg id="barcode"></svg>
            </div>
            
            <div class="footer">
              <span>Exp: ${expiryDate}</span>
              <span>Printed: ${printDate} ${printTime}</span>
            </div>

            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
            <script>
              (function() {
                function render() {
                  try {
                    var value = ${JSON.stringify(batch.batch_number)};
                    var isNumeric = /^\\d+$/.test(value);
                    var fmt = (isNumeric && value.length === 13) ? 'EAN13' : 'CODE128';
                    JsBarcode('#barcode', value, {
                      format: fmt,
                      displayValue: true,
                      fontSize: 8,
                      textMargin: 1,
                      margin: 2,
                      lineColor: '#000',
                      background: '#f9f9f9'
                    });
                    setTimeout(function(){ window.print(); window.close(); }, 200);
                  } catch (e) {
                    console.error('Barcode render error', e);
                    setTimeout(function(){ window.print(); window.close(); }, 200);
                  }
                }
                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  render();
                } else {
                  window.addEventListener('load', render);
                }
              })();
            </script>
          </body>
        </html>
      `

      printWindow.document.write(labelContent)
      printWindow.document.close()
      printWindow.focus()
    } catch (error) {
      console.error('Error printing batch barcode:', error)
      alert('Failed to print barcode. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f8fb] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Pharmacy Settings
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-200">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pharmacy Overview</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {loading ? 'Loading…' : `${medications.length} active medicine${medications.length !== 1 ? 's' : ''}`} · Click any row to view batches
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-[440px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, nickname, manufacturer, category…"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent placeholder-gray-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400" />
            <span className="text-sm">Loading medicines…</span>
          </div>
        ) : (
          <div className="space-y-2.5">

            {filteredMedications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                <Package className="w-12 h-12 text-gray-300" />
                <p className="font-medium">No medicines found</p>
                {search && <p className="text-sm">Try adjusting your search</p>}
              </div>
            )}

            {filteredMedications.map((m) => {
              const expanded = expandedMedicationId === m.id;
              const isEditing = editingMedicationId === m.id;
              const batches = batchesByMedicationId[m.id] || [];
              const totalStock = totalStockByMedicationId[m.id];
              const stockLoaded = m.id in batchesByMedicationId;
              const stockStatus = stockLoaded ? getStockStatus(totalStock, m.minimum_stock_level) : null;
              const dosageColor = m.dosage_form ? (DOSAGE_FORM_COLORS[m.dosage_form] ?? DOSAGE_FORM_COLORS['Other']) : null;
              const hasAnyBatchEditing = Boolean(editingBatchId);

              return (
                <div
                  key={m.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                    expanded ? 'border-fuchsia-200 shadow-lg shadow-fuchsia-50' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
                  }`}
                >
                  {/* ── Medication Row ── */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-3">

                      {/* Expand toggle */}
                      <button
                        onClick={() => toggleExpand(m.id)}
                        disabled={hasAnyBatchEditing}
                        className={`mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          expanded ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {expanded
                          ? <ChevronDown className="w-4 h-4" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                      </button>

                      {/* Medicine info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-base font-semibold text-gray-900 leading-tight">{m.name}</span>
                          {m.nickname && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 font-medium">
                              {m.nickname}
                            </span>
                          )}
                          {m.dosage_form && dosageColor && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dosageColor}`}>
                              {m.dosage_form}
                            </span>
                          )}
                        </div>

                        {m.combination && (
                          <p className="text-sm text-gray-500 mb-2 leading-relaxed">{m.combination}</p>
                        )}

                        {/* Info chips */}
                        <div className="flex flex-wrap gap-1.5">
                          <InfoChip icon={<Building2 className="w-3 h-3" />} label="Mfr" value={m.manufacturer} />
                          <InfoChip icon={<Tag className="w-3 h-3" />} label="Category" value={m.category} />
                          <InfoChip icon={<MapPin className="w-3 h-3" />} label="Location" value={m.location} />
                          <InfoChip icon={<FlaskConical className="w-3 h-3" />} label="Generic" value={m.generic_name} />
                          {m.unit && (
                            <InfoChip icon={<Layers className="w-3 h-3" />} label="Unit" value={m.unit} />
                          )}
                          {m.minimum_stock_level !== null && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="text-xs text-amber-600 shrink-0">Min stock:</span>
                              <span className="text-xs font-medium text-amber-800">{m.minimum_stock_level}</span>
                            </div>
                          )}
                        </div>

                        {/* Stock bar — only show when batches are loaded */}
                        {stockLoaded && stockStatus && (
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[160px]">
                              <div
                                className={`h-full rounded-full transition-all ${stockStatus.barColor}`}
                                style={{ width: `${stockStatus.pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${stockStatus.textColor}`}>
                              {totalStock} units · {stockStatus.label}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={cancelEdit}
                              disabled={saving === m.id}
                              className="h-8 px-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <X className="w-3.5 h-3.5" /> Cancel
                              </span>
                            </button>
                            <button
                              onClick={saveEdit}
                              disabled={saving === m.id}
                              className="h-8 px-3 text-sm rounded-lg bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-60 shadow-sm transition-colors"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {saving === m.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Save className="w-3.5 h-3.5" />
                                }
                                Save
                              </span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => beginEdit(m)}
                            className="h-8 px-3 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Edit form ── */}
                    {isEditing && draft && (
                      <div className="mt-5 pt-5 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Edit Medicine Details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                          {[
                            { label: 'Medicine Name', key: 'name', placeholder: '' },
                            { label: 'Nickname / Short Name', key: 'nickname', placeholder: 'Alias for quick search' },
                            { label: 'Generic Name', key: 'generic_name', placeholder: '' },
                            { label: 'Manufacturer', key: 'manufacturer', placeholder: '' },
                            { label: 'Category', key: 'category', placeholder: '' },
                            { label: 'Shelf / Location', key: 'location', placeholder: 'e.g. A1, Rack-3' },
                          ].map(({ label, key, placeholder }) => (
                            <div key={key}>
                              {key === 'manufacturer' ? (
                                <ManufacturerSelect
                                  value={(draft as any)[key] ?? ''}
                                  onChange={(val) => setDraft((p) => ({ ...(p || {}), [key]: val }))}
                                  className="mt-0"
                                />
                              ) : key === 'category' ? (
                                <CategorySelect
                                  value={(draft as any)[key] ?? ''}
                                  onChange={(val) => setDraft((p) => ({ ...(p || {}), [key]: val }))}
                                  className="mt-0"
                                />
                              ) : (
                                <>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                                  <input
                                    value={(draft as any)[key] ?? ''}
                                    onChange={(e) => setDraft((p) => ({ ...(p || {}), [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent bg-gray-50"
                                  />
                                </>
                              )}
                            </div>
                          ))}

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Combination / Formulation</label>
                            <input
                              value={draft.combination ?? ''}
                              onChange={(e) => setDraft((p) => ({ ...(p || {}), combination: e.target.value }))}
                              placeholder="e.g. Paracetamol 500mg + Caffeine 65mg"
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent bg-gray-50"
                            />
                          </div>

                          <div>
                            <DosageFormSelect
                              value={draft.dosage_form ?? ''}
                              onChange={(val) => setDraft((p) => ({ ...(p || {}), dosage_form: val }))}
                              className="mt-0"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Min Stock Level</label>
                            <input
                              type="number"
                              value={draft.minimum_stock_level ?? 0}
                              onChange={(e) => setDraft((p) => ({ ...(p || {}), minimum_stock_level: Number(e.target.value) }))}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-400 focus:border-transparent bg-gray-50"
                            />
                            <p className="text-xs text-gray-400 mt-1">Alert below this level</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Batch panel ── */}
                  {expanded && (
                    <div className="border-t border-gray-100 bg-[#fafafc]">
                      <div className="px-5 py-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> Batch Details
                        </span>
                        {!loadingBatchesFor && batches.length > 0 && (
                          <span className="text-xs text-gray-400">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</span>
                        )}
                      </div>

                      {loadingBatchesFor === m.id ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                          <Loader2 className="w-5 h-5 animate-spin text-fuchsia-400" />
                          <span className="text-sm">Loading batches…</span>
                        </div>
                      ) : batches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
                          <Package className="w-8 h-8 text-gray-200" />
                          <p className="text-sm">No batches found for this medicine</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto pb-4">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-100">
                                {['Batch No', 'Legacy Code', 'Received Qty', 'Current Qty', 'Purchase Price', 'MRP', 'Expiry Date', 'Actions'].map((h) => (
                                  <th
                                    key={h}
                                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 whitespace-nowrap"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {batches.map((b) => {
                                const expiry = getExpiryStatus(b.expiry_date);
                                const stockPct = b.received_quantity > 0
                                  ? Math.min((b.current_quantity / b.received_quantity) * 100, 100)
                                  : 0;
                                const isExpired = b.expiry_date && new Date(b.expiry_date) < new Date();
                                const isBatchEditing = editingBatchId === b.id && editingBatchMedicationId === m.id;
                                const currentDraft = isBatchEditing ? batchDraft : null;
                                return (
                                  <tr
                                    key={b.id}
                                    className={`transition-colors ${isExpired ? 'bg-red-50/40' : 'hover:bg-white'}`}
                                  >
                                    {/* Batch No */}
                                    <td className="px-4 py-3 font-mono font-semibold text-gray-800 whitespace-nowrap">
                                      {isBatchEditing ? (
                                        <input
                                          value={String(currentDraft?.batch_number ?? '')}
                                          onChange={(e) => setBatchDraft((p) => ({ ...(p || {}), batch_number: e.target.value }))}
                                          className="w-32 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                                        />
                                      ) : (
                                        b.batch_number || '—'
                                      )}
                                    </td>

                                    {/* Legacy code */}
                                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                                      {isBatchEditing ? (
                                        <input
                                          value={String(currentDraft?.legacy_code ?? '')}
                                          onChange={(e) => setBatchDraft((p) => ({ ...(p || {}), legacy_code: e.target.value }))}
                                          className="w-32 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                                          placeholder="Enter legacy code"
                                        />
                                      ) : (
                                        b.legacy_code || '—'
                                      )}
                                    </td>

                                    {/* Received Qty */}
                                    <td className="px-4 py-3 text-gray-700 text-center">{b.received_quantity}</td>

                                    {/* Current Qty with mini bar */}
                                    <td className="px-4 py-3 min-w-[100px]">
                                      {isBatchEditing ? (
                                        <input
                                          type="number"
                                          value={currentDraft?.current_quantity ?? ''}
                                          onChange={(e) => setBatchDraft((p) => ({ ...(p || {}), current_quantity: Number(e.target.value) || 0 }))}
                                          className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-center"
                                          min="0"
                                        />
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span className={`font-semibold ${b.current_quantity === 0 ? 'text-red-500' : 'text-gray-800'}`}>
                                            {b.current_quantity}
                                          </span>
                                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-12">
                                            <div
                                              className={`h-full rounded-full ${
                                                stockPct === 0 ? 'bg-red-400'
                                                : stockPct < 30 ? 'bg-orange-400'
                                                : stockPct < 60 ? 'bg-amber-400'
                                                : 'bg-emerald-400'
                                              }`}
                                              style={{ width: `${stockPct}%` }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </td>

                                    {/* Purchase Price */}
                                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                      {isBatchEditing ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={batchUnitPriceDraft?.purchase_unit ?? ''}
                                          onChange={(e) =>
                                            setBatchUnitPriceDraft((p) => ({
                                              purchase_unit: e.target.value,
                                              selling_unit: p?.selling_unit ?? ''
                                            }))
                                          }
                                          onBlur={(e) => {
                                            const v = e.target.value;
                                            if (v && !Number.isNaN(Number(v))) {
                                              setBatchUnitPriceDraft((p) => ({
                                                purchase_unit: Number(v).toFixed(2),
                                                selling_unit: p?.selling_unit ?? ''
                                              }));
                                            }
                                          }}
                                          className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                                        />
                                      ) : (
                                        b.purchase_price !== null && b.received_quantity > 0
                                          ? <span className="font-medium">₹{(b.purchase_price / b.received_quantity).toFixed(2)}</span>
                                          : b.purchase_price !== null
                                            ? <span className="font-medium">₹{b.purchase_price.toFixed(2)}</span>
                                            : <span className="text-gray-300">—</span>
                                      )}
                                    </td>

                                    {/* Selling / MRP */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {isBatchEditing ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={batchUnitPriceDraft?.selling_unit ?? ''}
                                          onChange={(e) =>
                                            setBatchUnitPriceDraft((p) => ({
                                              purchase_unit: p?.purchase_unit ?? '',
                                              selling_unit: e.target.value
                                            }))
                                          }
                                          onBlur={(e) => {
                                            const v = e.target.value;
                                            if (v && !Number.isNaN(Number(v))) {
                                              setBatchUnitPriceDraft((p) => ({
                                                purchase_unit: p?.purchase_unit ?? '',
                                                selling_unit: Number(v).toFixed(2)
                                              }));
                                            }
                                          }}
                                          className="w-28 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                                        />
                                      ) : (
                                        b.selling_price !== null && b.received_quantity > 0
                                          ? <span className="font-semibold text-emerald-700">₹{(b.selling_price / b.received_quantity).toFixed(2)}</span>
                                          : b.selling_price !== null
                                            ? <span className="font-semibold text-emerald-700">₹{b.selling_price.toFixed(2)}</span>
                                            : <span className="text-gray-300">—</span>
                                      )}
                                    </td>

                                    {/* Expiry */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {isBatchEditing ? (
                                        <input
                                          type="date"
                                          value={(currentDraft?.expiry_date ?? '') || ''}
                                          onChange={(e) => setBatchDraft((p) => ({ ...(p || {}), expiry_date: e.target.value || null }))}
                                          className="w-[140px] px-2 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                                        />
                                      ) : (
                                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${expiry.color}`}>
                                          {expiry.icon}
                                          {expiry.label}
                                        </span>
                                      )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      {isBatchEditing ? (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={cancelBatchEdit}
                                            disabled={savingBatchId === b.id}
                                            className="h-7 px-2.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={saveBatchEdit}
                                            disabled={savingBatchId === b.id}
                                            className="h-7 px-2.5 text-xs rounded-md bg-fuchsia-600 text-white hover:bg-fuchsia-700 disabled:opacity-60 inline-flex items-center gap-1.5"
                                          >
                                            {savingBatchId === b.id
                                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              : <Save className="w-3.5 h-3.5" />
                                            }
                                            Save
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() => beginBatchEdit(m.id, b)}
                                            disabled={hasAnyBatchEditing}
                                            className="h-7 px-2.5 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 inline-flex items-center gap-1.5 disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:border-gray-200"
                                          >
                                            <Edit className="w-3.5 h-3.5" /> Edit
                                          </button>
                                          <button
                                            onClick={() => printBatchBarcode(b, m.name)}
                                            className="h-7 px-2.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-1.5"
                                            title="Print barcode label"
                                          >
                                            <Printer className="w-3.5 h-3.5" /> Print
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
