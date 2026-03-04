'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet, ListChecks, Loader2, Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

type RowComparison = {
  file: 'A' | 'B';
  row: number;
  batch: string;
  status: 'match' | 'missing_in_other' | 'empty';
};

type CompareResult = {
  success: true;
  fileA: { fileName: string; totalRows: number; batchHeader: string; emptyBatchRows: number; uniqueBatches: number };
  fileB: { fileName: string; totalRows: number; batchHeader: string; emptyBatchRows: number; uniqueBatches: number };
  matches: { uniqueMatched: number; totalMatchedRowsA: number; totalMatchedRowsB: number };
  missing: { uniqueMissingInB: number; uniqueMissingInA: number };
  duplicates: { duplicatesInA: number; duplicatesInB: number };
  rowResults: RowComparison[];
  errors: { sheet: string; row: number; message: string }[];
  error?: string;
};

// A combined row for side-by-side display
type SideBySideRow = {
  batchA: string | null; // null = not present in A
  batchB: string | null; // null = not present in B
  rowA: number | null;
  rowB: number | null;
  status: 'match' | 'only_in_a' | 'only_in_b';
};

function buildSideBySide(result: CompareResult): SideBySideRow[] {
  const rowsA = result.rowResults.filter((r) => r.file === 'A' && r.batch.trim() !== '');
  const rowsB = result.rowResults.filter((r) => r.file === 'B' && r.batch.trim() !== '');

  // Build sets for lookup
  const setB = new Map<string, { row: number; used: boolean }[]>();
  for (const r of rowsB) {
    if (!setB.has(r.batch)) setB.set(r.batch, []);
    setB.get(r.batch)!.push({ row: r.row, used: false });
  }

  const setA = new Map<string, { row: number; used: boolean }[]>();
  for (const r of rowsA) {
    if (!setA.has(r.batch)) setA.set(r.batch, []);
    setA.get(r.batch)!.push({ row: r.row, used: false });
  }

  const rows: SideBySideRow[] = [];

  // For each A row, find a matching B row
  for (const r of rowsA) {
    const bMatches = setB.get(r.batch);
    const available = bMatches?.find((m) => !m.used);
    if (available) {
      available.used = true;
      // Mark A as used too
      const aEntry = setA.get(r.batch)?.find((m) => m.row === r.row && !m.used);
      if (aEntry) aEntry.used = true;
      rows.push({ batchA: r.batch, batchB: r.batch, rowA: r.row, rowB: available.row, status: 'match' });
    } else {
      const aEntry = setA.get(r.batch)?.find((m) => m.row === r.row && !m.used);
      if (aEntry) aEntry.used = true;
      rows.push({ batchA: r.batch, batchB: null, rowA: r.row, rowB: null, status: 'only_in_a' });
    }
  }

  // Remaining unmatched B rows
  for (const [batch, entries] of setB.entries()) {
    for (const entry of entries) {
      if (!entry.used) {
        rows.push({ batchA: null, batchB: batch, rowA: null, rowB: entry.row, status: 'only_in_b' });
      }
    }
  }

  // Sort: matches first, then only_in_a, then only_in_b
  rows.sort((a, b) => {
    const order = { match: 0, only_in_a: 1, only_in_b: 2 };
    return order[a.status] - order[b.status];
  });

  return rows;
}

const StatusBadge = ({ status }: { status: SideBySideRow['status'] }) => {
  if (status === 'match')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3 h-3" /> Match
      </span>
    );
  if (status === 'only_in_a')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3 h-3" /> Missing in B
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <AlertCircle className="w-3 h-3" /> Missing in A
    </span>
  );
};

const FieldValidatorsPage = () => {
  const router = useRouter();

  const fileARef = useRef<HTMLInputElement>(null);
  const fileBRef = useRef<HTMLInputElement>(null);

  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<'A' | 'B' | null>(null);

  const [batchHeader, setBatchHeader] = useState<string>('batch');
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | 'match' | 'only_in_a' | 'only_in_b'>('all');

  const handleFile = (which: 'A' | 'B', selected: File | undefined) => {
    if (!selected) return;
    const ok =
      selected.name.endsWith('.xlsx') ||
      selected.name.endsWith('.xls') ||
      selected.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      selected.type === 'application/vnd.ms-excel';

    if (!ok) {
      alert('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    if (which === 'A') setFileA(selected);
    else setFileB(selected);
    setError(null);
    setResult(null);
  };

  const handleDrag = (which: 'A' | 'B', e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(which);
    if (e.type === 'dragleave') setDragActive(null);
  };

  const handleDrop = (which: 'A' | 'B', e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const dropped = e.dataTransfer.files?.[0];
    handleFile(which, dropped);
  };

  const canCompare = !!fileA && !!fileB && !comparing;

  const runCompare = async () => {
    if (!fileA || !fileB) return;
    setComparing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('fileA', fileA);
      formData.append('fileB', fileB);
      formData.append('batchHeader', batchHeader || 'batch');

      const res = await fetch('/api/pharmacy/excel-tools/field-validators/compare-batches', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as CompareResult;
      if (!res.ok) throw new Error((data as any).error || 'Compare failed');
      setResult(data);
    } catch (e: any) {
      setError(e?.message || 'Compare failed');
    } finally {
      setComparing(false);
    }
  };

  const sideBySide = useMemo(() => (result ? buildSideBySide(result) : []), [result]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return sideBySide;
    return sideBySide.filter((r) => r.status === statusFilter);
  }, [sideBySide, statusFilter]);

  const counts = useMemo(() => {
    const match = sideBySide.filter((r) => r.status === 'match').length;
    const onlyA = sideBySide.filter((r) => r.status === 'only_in_a').length;
    const onlyB = sideBySide.filter((r) => r.status === 'only_in_b').length;
    return { match, onlyA, onlyB, total: sideBySide.length };
  }, [sideBySide]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl shadow-lg">
              <ListChecks className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Batch Comparator</h1>
              <p className="text-gray-600">Compare batch column values side-by-side across two Excel files</p>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-gray-900 font-semibold">Upload Excel Files</div>
              <div className="text-gray-500 text-sm mt-0.5">
                Upload two files and specify which column header to compare.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Batch column header</label>
              <input
                value={batchHeader}
                onChange={(e) => setBatchHeader(e.target.value)}
                className="w-36 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="batch"
                disabled={comparing}
              />
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['A', 'B'] as const).map((which) => {
              const file = which === 'A' ? fileA : fileB;
              const ref = which === 'A' ? fileARef : fileBRef;
              const label = which === 'A' ? 'File A (Source)' : 'File B (Target)';
              const hint = which === 'A' ? 'This will be the reference file' : 'Batches will be matched against File A';
              return (
                <div
                  key={which}
                  className={`rounded-xl border-2 border-dashed transition-colors ${
                    dragActive === which
                      ? 'border-teal-400 bg-teal-50'
                      : file
                        ? 'border-teal-300 bg-teal-50/40'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                  onDragEnter={(e) => handleDrag(which, e)}
                  onDragOver={(e) => handleDrag(which, e)}
                  onDragLeave={(e) => handleDrag(which, e)}
                  onDrop={(e) => handleDrop(which, e)}
                >
                  <input
                    ref={ref}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleFile(which, e.target.files?.[0])}
                  />
                  <div className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${file ? 'bg-teal-100' : 'bg-white border border-gray-200'}`}>
                      {file ? (
                        <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                      ) : (
                        <Upload className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900 text-sm">{label}</span>
                        <button
                          onClick={() => ref.current?.click()}
                          disabled={comparing}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-white text-xs font-medium disabled:opacity-50 transition-colors"
                        >
                          <FileSpreadsheet className="w-3 h-3" />
                          Choose
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{hint}</div>
                      {file ? (
                        <div className="mt-2 text-xs font-mono text-teal-700 truncate">{file.name}</div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-400">Drag & drop or click Choose</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 pb-5">
            {error && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <button
              onClick={runCompare}
              disabled={!canCompare}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
            >
              {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
              {comparing ? 'Comparing…' : 'Compare Batches'}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Warnings */}
            {result.errors?.length > 0 && (
              <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold mb-1">Warnings</div>
                  {result.errors.slice(0, 5).map((e, idx) => (
                    <div key={idx} className="font-mono text-xs">
                      {e.sheet}:{e.row} — {e.message}
                    </div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="text-xs mt-1">…and {result.errors.length - 5} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <button
                onClick={() => setStatusFilter('all')}
                className={`rounded-xl border p-4 text-left transition-all ${statusFilter === 'all' ? 'border-gray-400 bg-white shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}
              >
                <div className="text-2xl font-bold text-gray-900">{counts.total}</div>
                <div className="text-sm text-gray-500 mt-0.5">Total unique batches</div>
              </button>
              <button
                onClick={() => setStatusFilter('match')}
                className={`rounded-xl border p-4 text-left transition-all ${statusFilter === 'match' ? 'border-green-400 bg-green-50 shadow-md' : 'border-gray-100 bg-white hover:border-green-200'}`}
              >
                <div className="text-2xl font-bold text-green-700">{counts.match}</div>
                <div className="text-sm text-green-600 mt-0.5">Matched</div>
              </button>
              <button
                onClick={() => setStatusFilter('only_in_a')}
                className={`rounded-xl border p-4 text-left transition-all ${statusFilter === 'only_in_a' ? 'border-red-400 bg-red-50 shadow-md' : 'border-gray-100 bg-white hover:border-red-200'}`}
              >
                <div className="text-2xl font-bold text-red-700">{counts.onlyA}</div>
                <div className="text-sm text-red-600 mt-0.5">Missing in B</div>
              </button>
              <button
                onClick={() => setStatusFilter('only_in_b')}
                className={`rounded-xl border p-4 text-left transition-all ${statusFilter === 'only_in_b' ? 'border-amber-400 bg-amber-50 shadow-md' : 'border-gray-100 bg-white hover:border-amber-200'}`}
              >
                <div className="text-2xl font-bold text-amber-700">{counts.onlyB}</div>
                <div className="text-sm text-amber-600 mt-0.5">Missing in A</div>
              </button>
            </div>

            {/* File info strip */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <div className="font-semibold text-gray-700 mb-1">File A — {result.fileA.fileName}</div>
                <div className="text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                  <span>{result.fileA.totalRows} rows</span>
                  <span>{result.fileA.uniqueBatches} unique batches</span>
                  {result.fileA.emptyBatchRows > 0 && <span className="text-amber-600">{result.fileA.emptyBatchRows} empty</span>}
                  {result.duplicates.duplicatesInA > 0 && <span className="text-orange-600">{result.duplicates.duplicatesInA} duplicates</span>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-sm">
                <div className="font-semibold text-gray-700 mb-1">File B — {result.fileB.fileName}</div>
                <div className="text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
                  <span>{result.fileB.totalRows} rows</span>
                  <span>{result.fileB.uniqueBatches} unique batches</span>
                  {result.fileB.emptyBatchRows > 0 && <span className="text-amber-600">{result.fileB.emptyBatchRows} empty</span>}
                  {result.duplicates.duplicatesInB > 0 && <span className="text-orange-600">{result.duplicates.duplicatesInB} duplicates</span>}
                </div>
              </div>
            </div>

            {/* Side-by-side table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="font-semibold text-gray-900">
                  Side-by-side Comparison
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {filteredRows.length} row{filteredRows.length !== 1 ? 's' : ''}
                    {statusFilter !== 'all' && ' (filtered)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Filter:</span>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
                    {([
                      { value: 'all', label: 'All' },
                      { value: 'match', label: 'Match' },
                      { value: 'only_in_a', label: 'Missing in B' },
                      { value: 'only_in_b', label: 'Missing in A' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`px-3 py-1.5 border-r last:border-r-0 border-gray-200 transition-colors ${
                          statusFilter === opt.value
                            ? 'bg-teal-500 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 w-12">#</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        File A — <span className="font-mono font-normal text-gray-500">{result.fileA.batchHeader}</span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs text-center w-8 text-gray-400">Row</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-36">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700 text-xs text-center w-8 text-gray-400">Row</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        File B — <span className="font-mono font-normal text-gray-500">{result.fileB.batchHeader}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredRows.slice(0, 500).map((r, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors ${
                          r.status === 'match'
                            ? 'hover:bg-green-50/40'
                            : r.status === 'only_in_a'
                              ? 'bg-red-50/30 hover:bg-red-50/60'
                              : 'bg-amber-50/30 hover:bg-amber-50/60'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-900">
                          {r.batchA ?? <span className="text-gray-300 italic text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                          {r.rowA ?? ''}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2.5 text-center text-xs text-gray-400">
                          {r.rowB ?? ''}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-gray-900">
                          {r.batchB ?? <span className="text-gray-300 italic text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredRows.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm">No rows for this filter</div>
                )}

                {filteredRows.length > 500 && (
                  <div className="px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
                    Showing first 500 of {filteredRows.length} rows — use a filter to narrow down
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FieldValidatorsPage;
