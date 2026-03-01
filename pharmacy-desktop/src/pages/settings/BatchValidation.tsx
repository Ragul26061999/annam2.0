import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, CheckSquare, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface BatchRecord {
  id: string;
  medication_id: string;
  medication_name?: string;
  batch_number: string;
  expiry_date?: string;
  quantity: number;
  transaction_type: string;
  created_at: string;
  isValid?: boolean;
  validationNote?: string;
}

function validateBatchNumber(batch: string): { valid: boolean; note: string } {
  if (!batch || batch.trim() === "") return { valid: false, note: "Empty batch number" };
  if (batch.length < 3) return { valid: false, note: "Too short (< 3 chars)" };
  if (batch.length > 50) return { valid: false, note: "Too long (> 50 chars)" };
  if (/[^a-zA-Z0-9\-\/]/.test(batch)) return { valid: false, note: "Contains special characters" };
  return { valid: true, note: "Valid" };
}

export function BatchValidation() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showOnlyInvalid, setShowOnlyInvalid] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("stock_transactions")
        .select("id, medication_id, batch_number, expiry_date, quantity, transaction_type, created_at, medication:medications(name)")
        .eq("transaction_type", "purchase")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) query = query.ilike("batch_number", `%${search}%`);

      const { data, error } = await query;
      if (!error && data) {
        const validated = data.map((d: any) => {
          const { valid, note } = validateBatchNumber(d.batch_number);
          return {
            ...d,
            medication_name: d.medication?.name,
            isValid: valid,
            validationNote: note,
          };
        });
        setBatches(showOnlyInvalid ? validated.filter((b) => !b.isValid) : validated);
      }
    } finally {
      setLoading(false);
    }
  }, [search, showOnlyInvalid, page]);

  useEffect(() => { load(); }, [load]);

  const invalidCount = batches.filter((b) => !b.isValid).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search batch number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={showOnlyInvalid}
                onChange={(e) => { setShowOnlyInvalid(e.target.checked); setPage(0); }}
                className="rounded"
              />
              Show only invalid
            </label>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Batches (page)</p>
            <p className="text-2xl font-bold">{batches.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Valid</p>
            <p className="text-2xl font-bold text-success-600">{batches.length - invalidCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Invalid</p>
            <p className="text-2xl font-bold text-danger-600">{invalidCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary-500" />
            Batch Validation ({batches.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Number</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : batches.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-8 text-center text-gray-400">No batches found</TableCell></TableRow>
              ) : batches.map((b) => (
                <TableRow key={b.id} className={!b.isValid ? "bg-danger-50" : ""}>
                  <TableCell className="font-mono text-sm font-semibold">{b.batch_number}</TableCell>
                  <TableCell className="font-medium">{b.medication_name ?? b.medication_id}</TableCell>
                  <TableCell>{b.expiry_date ? formatDate(b.expiry_date) : <span className="text-danger-400">missing</span>}</TableCell>
                  <TableCell>{b.quantity}</TableCell>
                  <TableCell>{formatDate(b.created_at)}</TableCell>
                  <TableCell>
                    {b.isValid
                      ? <CheckCircle className="h-4 w-4 text-success-500" />
                      : <AlertCircle className="h-4 w-4 text-danger-500" />}
                  </TableCell>
                  <TableCell className={`text-xs ${b.isValid ? "text-gray-400" : "text-danger-600 font-medium"}`}>
                    {b.validationNote}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={batches.length < PAGE_SIZE}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
