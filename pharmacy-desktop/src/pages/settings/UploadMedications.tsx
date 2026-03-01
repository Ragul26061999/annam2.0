import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, FileText, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MedRow {
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  unit?: string;
  mrp?: number;
  selling_price?: number;
  purchase_price?: number;
  minimum_stock_level?: number;
  gst_percent?: number;
  hsn_code?: string;
  status?: string;
  error?: string;
}

export function UploadMedications() {
  const [rows, setRows] = useState<MedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): MedRow[] => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const row: MedRow = { name: "" };
      headers.forEach((h, i) => {
        const val = vals[i] ?? "";
        if (["mrp", "selling_price", "purchase_price", "minimum_stock_level", "gst_percent"].includes(h)) {
          (row as any)[h] = parseFloat(val) || 0;
        } else {
          (row as any)[h] = val;
        }
      });
      if (!row.name) row.error = "Name is required";
      return row;
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      setRows(parsed);
    } finally {
      setLoading(false);
    }
  };

  const deriveCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("antibiotic") || lower.includes("amox") || lower.includes("cipro")) return "Antibiotics";
    if (lower.includes("pain") || lower.includes("paracet") || lower.includes("ibuprofen")) return "Analgesics";
    if (lower.includes("vitamin") || lower.includes("calcium")) return "Vitamins";
    if (lower.includes("insulin") || lower.includes("metformin")) return "Antidiabetics";
    return "General";
  };

  const generateCode = (name: string, idx: number): string => {
    const prefix = name.slice(0, 3).toUpperCase().replace(/\s/g, "");
    return `${prefix}-${String(idx + 1000).padStart(4, "0")}`;
  };

  const uploadAll = async () => {
    const validRows = rows.filter((r) => !r.error && r.name);
    if (validRows.length === 0) { alert("No valid rows to upload"); return; }
    setSaving(true);
    let success = 0, failed = 0;
    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const { error } = await supabase.from("medications").insert({
          medicine_code: generateCode(row.name, i),
          name: row.name,
          generic_name: row.generic_name || row.name,
          manufacturer: row.manufacturer || "Unknown",
          category: row.category || deriveCategory(row.name),
          dosage_form: row.dosage_form || "Tablet",
          strength: row.strength || "",
          unit: row.unit || "Strip",
          mrp: row.mrp || 0,
          selling_price: row.selling_price || row.mrp || 0,
          purchase_price: row.purchase_price || 0,
          minimum_stock_level: row.minimum_stock_level || 10,
          total_stock: 0,
          available_stock: 0,
          gst_percent: row.gst_percent || 12,
          cgst_percent: (row.gst_percent || 12) / 2,
          sgst_percent: (row.gst_percent || 12) / 2,
          hsn_code: row.hsn_code || null,
          prescription_required: false,
          status: row.status || "active",
        });
        if (error) failed++;
        else success++;
      }
      setResult({ success, failed });
    } finally {
      setSaving(false);
    }
  };

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => r.error).length;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary-500" /> Upload Medications CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50 py-12 transition-colors hover:border-primary-400"
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="mb-3 h-12 w-12 text-primary-300" />
            <p className="text-lg font-medium text-primary-600">Click to select CSV file</p>
            <p className="mt-1 text-sm text-gray-400">Required column: <strong>name</strong>. Optional: generic_name, manufacturer, category, dosage_form, strength, unit, mrp, selling_price, gst_percent, hsn_code</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

          {rows.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex gap-6 text-sm">
                <span><strong>{rows.length}</strong> total rows</span>
                <span className="text-success-600"><CheckCircle className="mr-1 inline h-4 w-4" /><strong>{validCount}</strong> valid</span>
                {errorCount > 0 && <span className="text-danger-600"><AlertCircle className="mr-1 inline h-4 w-4" /><strong>{errorCount}</strong> errors</span>}
              </div>
              <Button onClick={uploadAll} disabled={saving || validCount === 0} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Uploading..." : `Upload ${validCount} Medications`}
              </Button>
            </div>
          )}

          {result && (
            <div className={`rounded-lg p-4 ${result.failed === 0 ? "bg-success-50" : "bg-warning-50"}`}>
              <p className="font-semibold">Upload Complete</p>
              <p className="text-sm">✓ {result.success} uploaded successfully · {result.failed} failed</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Preview ({rows.length} rows)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Generic</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Form</th>
                    <th className="px-3 py-2 text-right">MRP</th>
                    <th className="px-3 py-2 text-right">GST%</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b ${row.error ? "bg-danger-50" : ""}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="font-medium">{row.name || <span className="text-danger-400">missing</span>}</p>
                          {row.error && <p className="text-xs text-danger-500">{row.error}</p>}
                        </div>
                      </td>
                      <td className="px-3 py-2">{row.generic_name || "—"}</td>
                      <td className="px-3 py-2">{row.category || deriveCategory(row.name)}</td>
                      <td className="px-3 py-2">{row.dosage_form || "Tablet"}</td>
                      <td className="px-3 py-2 text-right">₹{row.mrp || 0}</td>
                      <td className="px-3 py-2 text-right">{row.gst_percent || 12}%</td>
                      <td className="px-3 py-2">{row.status || "active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

}
