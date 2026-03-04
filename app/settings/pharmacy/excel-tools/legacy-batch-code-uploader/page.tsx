'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Barcode, FileSpreadsheet, Loader2, Upload } from 'lucide-react';

type PreviewMatch = {
  medicationName: string;
  medicationId: string;
  batchNumber: string;
  batchId: string;
  excelBarcode: string;
  existingLegacyCode: string | null;
};

type PreviewResult = {
  fileName: string;
  totalExcelRows: number;
  matchedRows: number;
  medicationNotFound: number;
  batchNotFound: number;
  missingBarcode: number;
  alreadyHasLegacy: number;
  sampleMatches: PreviewMatch[];
  errors: { sheet: string; row: number; message: string }[];
};

type ApplyRowResult = {
  row: number;
  medicationName: string;
  batchNumber: string;
  excelBarcode: string;
  status: 'updated' | 'skipped' | 'not_found' | 'invalid' | 'error';
  message: string;
};

type ApplyResult = {
  success: boolean;
  fileName: string;
  overwrite: boolean;
  totalExcelRows: number;
  matchedRows: number;
  updatedRows: number;
  skippedRows: number;
  notFoundRows: number;
  invalidRows: number;
  errorRows: number;
  results: ApplyRowResult[];
  allResults: ApplyRowResult[];
  error?: string;
};

const LegacyBatchCodeUploaderPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);

  const canPreview = !!file && !previewing && !applying;
  const canProceed = !!file && !!preview && !previewing && !applying;

  const handleFile = (selected: File | undefined) => {
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

    setFile(selected);
    setError(null);
    setPreview(null);
    setApplyResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    handleFile(dropped);
  };

  const runPreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setPreview(null);
    setApplyResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/pharmacy/legacy-batch-code-uploader/preview', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as PreviewResult & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Preview failed');

      setPreview(data);
    } catch (e: any) {
      setError(e?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const runApply = async () => {
    if (!file) return;
    setApplying(true);
    setError(null);
    setApplyResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overwrite', overwrite ? 'true' : 'false');

      const res = await fetch('/api/pharmacy/legacy-batch-code-uploader/apply', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as ApplyResult;
      if (!res.ok) throw new Error(data.error || 'Apply failed');
      setApplyResult(data);
    } catch (e: any) {
      setError(e?.message || 'Apply failed');
    } finally {
      setApplying(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!preview) return [];
    return [
      { label: 'Excel rows', value: preview.totalExcelRows },
      { label: 'Matched batches', value: preview.matchedRows },
      { label: 'Medication not found', value: preview.medicationNotFound },
      { label: 'Batch not found', value: preview.batchNotFound },
      { label: 'Missing barcode', value: preview.missingBarcode },
      { label: 'Already has legacy', value: preview.alreadyHasLegacy },
    ];
  }, [preview]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push('/settings/pharmacy')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Pharmacy Settings</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl shadow-lg">
              <Barcode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Legacy Batch Code Uploader</h1>
              <p className="text-gray-600">Upload Excel (DrugName / Batch / Barcode) to update batch legacy codes</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-lg border overflow-hidden ${
            dragActive ? 'border-indigo-400' : 'border-gray-100'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-gray-900">Upload Excel</div>
                <div className="text-sm text-gray-600">Expected columns: DrugName, Batch, Barcode</div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={previewing || applying}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="text-sm font-medium">Choose file</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-white border border-gray-200">
                  <Upload className="w-6 h-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Drag & drop file here</div>
                  <div className="text-sm text-gray-600 mt-1">or use “Choose file”.</div>
                  <div className="mt-4 text-sm text-gray-700">
                    <span className="font-medium">Selected:</span>{' '}
                    <span className="font-mono">{file ? file.name : '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                  disabled={previewing || applying}
                />
                Overwrite existing legacy codes
              </label>

              <div className="flex items-center gap-3">
                <button
                  onClick={runPreview}
                  disabled={!canPreview}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon />}
                  <span>{previewing ? 'Previewing…' : 'Preview'}</span>
                </button>

                <button
                  onClick={runApply}
                  disabled={!canProceed}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
                  <span>{applying ? 'Updating…' : 'Proceed & Update'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="font-semibold text-gray-900">Preview Summary</div>
              <div className="text-sm text-gray-600 mt-1">
                Matched by <span className="font-mono">(medication name + batch number)</span> and will set <span className="font-mono">legacy_code = Barcode</span>.
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {summaryCards.map((c) => (
                  <div key={c.label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="text-xs text-gray-500">{c.label}</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{c.value}</div>
                  </div>
                ))}
              </div>

              {preview.sampleMatches?.length > 0 && (
                <div className="mt-6">
                  <div className="font-semibold text-gray-900">5 example matches</div>
                  <div className="text-sm text-gray-600 mt-1">Review before proceeding.</div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2 pr-4">Medication</th>
                          <th className="py-2 pr-4">Batch</th>
                          <th className="py-2 pr-4">Excel Barcode</th>
                          <th className="py-2 pr-4">Existing legacy_code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sampleMatches.map((m) => (
                          <tr key={m.batchId} className="border-t border-gray-100">
                            <td className="py-2 pr-4 font-medium text-gray-900">{m.medicationName}</td>
                            <td className="py-2 pr-4 font-mono text-gray-800">{m.batchNumber}</td>
                            <td className="py-2 pr-4 font-mono text-indigo-700">{m.excelBarcode}</td>
                            <td className="py-2 pr-4 font-mono text-gray-700">{m.existingLegacyCode || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {preview.errors?.length > 0 && (
                <div className="mt-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">
                  <div className="font-semibold">Preview warnings</div>
                  <div className="text-sm mt-2 space-y-1">
                    {preview.errors.slice(0, 5).map((e, idx) => (
                      <div key={idx}>
                        <span className="font-mono">{e.sheet}</span> row {e.row}: {e.message}
                      </div>
                    ))}
                    {preview.errors.length > 5 && (
                      <div className="text-sm">…and {preview.errors.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {applyResult && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="font-semibold text-gray-900">Upload Result</div>
              <div className="text-sm text-gray-600 mt-1">Updated legacy codes in database.</div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Matched</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{applyResult.matchedRows}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Updated</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{applyResult.updatedRows}</div>
                </div>
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Skipped</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{applyResult.skippedRows}</div>
                </div>
              </div>

              {applyResult.results?.length > 0 && (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-4">Row</th>
                        <th className="py-2 pr-4">Medication</th>
                        <th className="py-2 pr-4">Batch</th>
                        <th className="py-2 pr-4">Barcode</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applyResult.results.map((r, idx) => (
                        <tr key={`${r.row}-${idx}`} className="border-t border-gray-100">
                          <td className="py-2 pr-4 font-mono">{r.row}</td>
                          <td className="py-2 pr-4">{r.medicationName}</td>
                          <td className="py-2 pr-4 font-mono">{r.batchNumber}</td>
                          <td className="py-2 pr-4 font-mono text-indigo-700">{r.excelBarcode}</td>
                          <td className="py-2 pr-4 font-semibold">{r.status}</td>
                          <td className="py-2 pr-4 text-gray-700">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.3-4.3m1.8-5.2a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default LegacyBatchCodeUploaderPage;
