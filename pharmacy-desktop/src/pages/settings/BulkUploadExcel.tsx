import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Save, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DrugRow {
  name: string;
  generic_name?: string;
  manufacturer?: string;
  category?: string;
  dosage_form?: string;
  strength?: string;
  batch_number?: string;
  expiry_date?: string;
  quantity?: number;
  mrp?: number;
  purchase_price?: number;
  selling_price?: number;
  gst_percent?: number;
  hsn_code?: string;
  rack_location?: string;
  error?: string;
}

function parseExpiryDate(raw: string | number): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-MM-YYYY
  const a = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (a) return `${a[3]}-${a[2]}-${a[1]}`;
  // MM/YYYY or MM-YYYY
  const b = s.match(/^(\d{2})[\/\-](\d{4})$/);
  if (b) return `${b[2]}-${b[1]}-01`;
  // MMM-YYYY
  const c = s.match(/^([A-Za-z]{3})-(\d{4})$/);
  if (c) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const m = months[c[1].toLowerCase()];
    if (m) return `${c[2]}-${m}-01`;
  }
  return null;
}

function deriveCategory(name: string, form?: string): string {
  const lower = (name + " " + (form || "")).toLowerCase();
  if (lower.includes("antibiotic") || lower.includes("amox") || lower.includes("cipro") || lower.includes("azithro")) return "Antibiotics";
  if (lower.includes("paracet") || lower.includes("ibuprofen") || lower.includes("aspirin")) return "Analgesics";
  if (lower.includes("vitamin") || lower.includes("calcium") || lower.includes("iron")) return "Vitamins & Minerals";
  if (lower.includes("insulin") || lower.includes("metformin") || lower.includes("glipizide")) return "Antidiabetics";
  if (lower.includes("omeprazole") || lower.includes("pantoprazole") || lower.includes("antacid")) return "Antacids";
  if (lower.includes("cetirizine") || lower.includes("levocetir") || lower.includes("antihistamine")) return "Antihistamines";
  if (lower.includes("atenolol") || lower.includes("amlodipine") || lower.includes("losartan")) return "Antihypertensives";
  if (lower.includes("injection") || lower.includes("inj")) return "Injectables";
  if (lower.includes("syrup") || lower.includes("suspension")) return "Syrups";
  if (lower.includes("ointment") || lower.includes("cream") || lower.includes("gel")) return "Topicals";
  if (lower.includes("eye drop") || lower.includes("ear drop")) return "Drops";
  return "General";
}

export function BulkUploadExcel() {
  const [rows, setRows] = useState<DrugRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Dynamically import ExcelJS
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await wb.xlsx.load(buffer);

      const ws = wb.worksheets[0];
      if (!ws) { alert("No worksheet found"); return; }

      const headerRow = ws.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, col) => {
        headers[col] = String(cell.value ?? "").trim().toLowerCase().replace(/[\s\/\-\(\)]+/g, "_");
      });

      const parsed: DrugRow[] = [];
      ws.eachRow((row, rowNum) => {
        if (rowNum === 1) return;
        const get = (keys: string[]) => {
          for (const k of keys) {
            const idx = headers.indexOf(k);
            if (idx !== -1) {
              const val = row.getCell(idx).value;
              if (val != null && val !== "") return String(val).trim();
            }
          }
          return "";
        };

        const name = get(["drug_name", "medicine_name", "name", "medication_name"]);
        if (!name) return;

        const expRaw = get(["expiry_date", "expiry", "exp_date", "exp"]);
        const expiryDate = parseExpiryDate(expRaw);

        const drugRow: DrugRow = {
          name,
          generic_name: get(["generic_name", "generic"]),
          manufacturer: get(["manufacturer", "company", "mfr"]),
          dosage_form: get(["dosage_form", "form", "type"]),
          strength: get(["strength", "dose"]),
          batch_number: get(["batch_number", "batch_no", "batch"]),
          expiry_date: expiryDate ?? undefined,
          quantity: parseFloat(get(["quantity", "qty", "stock"])) || 0,
          mrp: parseFloat(get(["mrp", "max_retail_price"])) || 0,
          purchase_price: parseFloat(get(["purchase_price", "cost_price", "price"])) || 0,
          selling_price: parseFloat(get(["selling_price", "sale_price"])) || 0,
          gst_percent: parseFloat(get(["gst_percent", "gst", "tax_percent"])) || 12,
          hsn_code: get(["hsn_code", "hsn"]),
          rack_location: get(["rack_location", "rack"]),
        };
        drugRow.category = deriveCategory(name, drugRow.dosage_form);
        if (!expiryDate && expRaw) drugRow.error = `Cannot parse expiry: ${expRaw}`;

        parsed.push(drugRow);
      });

      setRows(parsed);
      setResult(null);
    } catch (e: any) {
      alert("Error reading Excel: " + e.message);
    }
  };

  const uploadAll = async () => {
    const valid = rows.filter((r) => !r.error && r.name);
    if (valid.length === 0) { alert("No valid rows"); return; }
    setSaving(true);
    let success = 0, failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        // Upsert medication
        const code = `${row.name.slice(0, 3).toUpperCase().replace(/\s/g, "")}-${String(i + 1000).padStart(4, "0")}`;
        const { data: med, error: medErr } = await supabase
          .from("medications")
          .upsert({
            medicine_code: code,
            name: row.name,
            generic_name: row.generic_name || row.name,
            manufacturer: row.manufacturer || "Unknown",
            category: row.category || "General",
            dosage_form: row.dosage_form || "Tablet",
            strength: row.strength || "",
            unit: "Strip",
            mrp: row.mrp || 0,
            selling_price: row.selling_price || row.mrp || 0,
            purchase_price: row.purchase_price || 0,
            minimum_stock_level: 10,
            total_stock: row.quantity || 0,
            available_stock: row.quantity || 0,
            gst_percent: row.gst_percent || 12,
            cgst_percent: (row.gst_percent || 12) / 2,
            sgst_percent: (row.gst_percent || 12) / 2,
            hsn_code: row.hsn_code || null,
            prescription_required: false,
            status: "active",
          }, { onConflict: "name" })
          .select("id")
          .single();

        if (medErr) throw medErr;

        // Add stock transaction if batch info exists
        if (row.batch_number && row.expiry_date && (row.quantity || 0) > 0) {
          await supabase.from("stock_transactions").insert({
            medication_id: med.id,
            transaction_type: "purchase",
            batch_number: row.batch_number,
            expiry_date: row.expiry_date,
            quantity: row.quantity,
            unit_price: row.purchase_price || 0,
            notes: row.rack_location ? `Rack: ${row.rack_location}` : null,
            transaction_date: new Date().toISOString(),
          });
        }

        success++;
      } catch (e: any) {
        failed++;
        errors.push(`Row ${i + 2} (${row.name}): ${e.message}`);
      }
    }

    setResult({ success, failed, errors });
    setSaving(false);
  };

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => !!r.error).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-success-500" /> Bulk Upload — Excel</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-success-200 bg-success-50 py-12 hover:border-success-400"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="mb-3 h-14 w-14 text-success-300" />
            <p className="text-lg font-medium text-success-600">Click to select Excel file (.xlsx)</p>
            <p className="mt-2 text-sm text-gray-400">
              Columns: <strong>drug_name, batch_number, expiry_date, quantity, mrp, purchase_price, gst_percent</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">Expiry formats: YYYY-MM-DD · DD-MM-YYYY · MM/YYYY · MMM-YYYY</p>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />

          {rows.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex gap-6 text-sm">
                <span><strong>{rows.length}</strong> total</span>
                <span className="text-success-600"><CheckCircle className="mr-1 inline h-4 w-4" /><strong>{validCount}</strong> valid</span>
                {errorCount > 0 && <span className="text-danger-600"><AlertCircle className="mr-1 inline h-4 w-4" /><strong>{errorCount}</strong> errors</span>}
              </div>
              <Button onClick={uploadAll} disabled={saving || validCount === 0} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Uploading..." : `Upload ${validCount} rows`}
              </Button>
            </div>
          )}

          {result && (
            <div className={`rounded-lg p-4 ${result.failed === 0 ? "bg-success-50" : "bg-warning-50"}`}>
              <p className="font-semibold">Upload Complete</p>
              <p className="text-sm">✓ {result.success} successful · {result.failed} failed</p>
              {result.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-danger-600">Show errors</summary>
                  <ul className="mt-1 space-y-0.5 text-xs text-danger-500">
                    {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Batch</th>
                    <th className="px-3 py-2 text-left">Expiry</th>
                    <th className="px-3 py-2 text-right">Qty</th>
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
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.generic_name}</p>
                        {row.error && <p className="text-xs text-danger-500">{row.error}</p>}
                      </td>
                      <td className="px-3 py-2">{row.category}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.batch_number || "—"}</td>
                      <td className="px-3 py-2">{row.expiry_date || <span className="text-danger-400">missing</span>}</td>
                      <td className="px-3 py-2 text-right">{row.quantity}</td>
                      <td className="px-3 py-2 text-right">₹{row.mrp}</td>
                      <td className="px-3 py-2 text-right">{row.gst_percent}%</td>
                      <td className="px-3 py-2">
                        {row.error
                          ? <span className="text-xs text-danger-500">Error</span>
                          : <CheckCircle className="h-4 w-4 text-success-500" />}
                      </td>
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
