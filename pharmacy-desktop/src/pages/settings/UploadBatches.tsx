import { useState, useRef } from "react";
import { Upload, FileText, Save, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BatchRow {
  medication_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  mrp: number;
  unit_price: number;
  rack_location?: string;
  medication_id?: string;
  error?: string;
}

function parseExpiryDate(raw: string): string | null {
  if (!raw) return null;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Try DD-MM-YYYY
  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  // Try MM/YYYY
  const mmyyyy = raw.match(/^(\d{2})\/(\d{4})$/);
  if (mmyyyy) return `${mmyyyy[2]}-${mmyyyy[1]}-01`;
  // Try MMM-YYYY (Jan-2027)
  const mmmyyyy = raw.match(/^([A-Za-z]{3})-(\d{4})$/);
  if (mmmyyyy) {
    const months: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const m = months[mmmyyyy[1].toLowerCase()];
    if (m) return `${mmmyyyy[2]}-${m}-01`;
  }
  return null;
}

export function UploadBatches() {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseCSV = async (text: string): Promise<BatchRow[]> => {
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[\s\/\-]/g, "_"));

    const parsed: BatchRow[] = lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim());
      const get = (keys: string[]) => {
        for (const k of keys) {
          const idx = headers.indexOf(k);
          if (idx !== -1 && vals[idx]) return vals[idx];
        }
        return "";
      };

      const expRaw = get(["expiry_date", "expiry", "exp_date", "exp"]);
      const expiryDate = parseExpiryDate(expRaw) || "";

      const row: BatchRow = {
        medication_name: get(["medication_name", "medicine_name", "name", "drug_name"]),
        batch_number: get(["batch_number", "batch_no", "batch"]),
        expiry_date: expiryDate,
        quantity: parseFloat(get(["quantity", "qty", "stock"])) || 0,
        mrp: parseFloat(get(["mrp", "max_retail_price"])) || 0,
        unit_price: parseFloat(get(["unit_price", "purchase_price", "price"])) || 0,
        rack_location: get(["rack_location", "rack", "location"]) || undefined,
      };

      if (!row.medication_name) row.error = "Medicine name required";
      else if (!row.batch_number) row.error = "Batch number required";
      else if (!row.expiry_date) row.error = `Cannot parse expiry date: ${expRaw}`;

      return row;
    });

    // Match medications in Supabase
    const names = [...new Set(parsed.filter((r) => !r.error).map((r) => r.medication_name))];
    if (names.length > 0) {
      const { data: meds } = await supabase
        .from("medications")
        .select("id, name")
        .in("name", names);

      const medMap: Record<string, string> = {};
      for (const m of meds ?? []) medMap[m.name] = m.id;

      return parsed.map((row) => {
        if (row.error) return row;
        const id = medMap[row.medication_name];
        if (!id) return { ...row, error: `Medicine not found: ${row.medication_name}` };
        return { ...row, medication_id: id };
      });
    }

    return parsed;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = await parseCSV(text);
    setRows(parsed);
    setResult(null);
  };

  const uploadAll = async () => {
    const valid = rows.filter((r) => !r.error && r.medication_id);
    if (valid.length === 0) { alert("No valid rows"); return; }
    setSaving(true);
    let success = 0, failed = 0;
    for (const row of valid) {
      const { error } = await supabase.from("stock_transactions").insert({
        medication_id: row.medication_id,
        transaction_type: "purchase",
        batch_number: row.batch_number,
        expiry_date: row.expiry_date,
        quantity: row.quantity,
        unit_price: row.unit_price,
        notes: row.rack_location ? `Rack: ${row.rack_location}` : null,
        transaction_date: new Date().toISOString(),
      });
      if (error) failed++;
      else {
        // Update available stock
        await supabase.rpc("increment_stock", {
          p_medication_id: row.medication_id,
          p_quantity: row.quantity,
        }).maybeSingle();
        success++;
      }
    }
    setResult({ success, failed });
    setSaving(false);
  };

  const validCount = rows.filter((r) => !r.error).length;
  const errorCount = rows.filter((r) => !!r.error).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary-500" /> Upload Batches CSV</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50 py-12 hover:border-primary-400"
            onClick={() => fileRef.current?.click()}
          >
            <FileText className="mb-3 h-12 w-12 text-primary-300" />
            <p className="text-lg font-medium text-primary-600">Click to select CSV file</p>
            <p className="mt-1 text-sm text-gray-400">
              Required columns: <strong>medication_name, batch_number, expiry_date, quantity</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">Expiry formats: YYYY-MM-DD, DD-MM-YYYY, MM/YYYY, MMM-YYYY</p>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />

          {rows.length > 0 && (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex gap-6 text-sm">
                <span><strong>{rows.length}</strong> total</span>
                <span className="text-success-600"><CheckCircle className="mr-1 inline h-4 w-4" /><strong>{validCount}</strong> valid</span>
                {errorCount > 0 && <span className="text-danger-600"><AlertCircle className="mr-1 inline h-4 w-4" /><strong>{errorCount}</strong> errors</span>}
              </div>
              <Button onClick={uploadAll} disabled={saving || validCount === 0} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Uploading..." : `Upload ${validCount} Batches`}
              </Button>
            </div>
          )}

          {result && (
            <div className={`rounded-lg p-4 ${result.failed === 0 ? "bg-success-50" : "bg-warning-50"}`}>
              <p className="font-semibold">Upload Complete</p>
              <p className="text-sm">✓ {result.success} uploaded · {result.failed} failed</p>
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
                    <th className="px-3 py-2 text-left">Medicine</th>
                    <th className="px-3 py-2 text-left">Batch No.</th>
                    <th className="px-3 py-2 text-left">Expiry</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">MRP</th>
                    <th className="px-3 py-2 text-left">Rack</th>
                    <th className="px-3 py-2 text-left">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`border-b ${row.error ? "bg-danger-50" : ""}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{row.medication_name}</p>
                        {row.error && <p className="text-xs text-danger-500">{row.error}</p>}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{row.batch_number}</td>
                      <td className="px-3 py-2">{row.expiry_date || <span className="text-danger-400">invalid</span>}</td>
                      <td className="px-3 py-2 text-right">{row.quantity}</td>
                      <td className="px-3 py-2 text-right">₹{row.mrp}</td>
                      <td className="px-3 py-2">{row.rack_location || "—"}</td>
                      <td className="px-3 py-2">
                        {row.medication_id ? (
                          <CheckCircle className="h-4 w-4 text-success-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-danger-400" />
                        )}
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
