import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, RefreshCw, RotateCcw, X, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { PurchaseReturn as IPurchaseReturn, Supplier, Medication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

export function PurchaseReturn() {
  const [returns, setReturns] = useState<IPurchaseReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState("");
  const [returnDate, setReturnDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("expired");
  const [reasonDetails, setReasonDetails] = useState("");
  const [items, setItems] = useState([{ medication_id: "", medication_name: "", batch_number: "", quantity: 1, unit_price: 0, gst_percent: 12, gst_amount: 0, total_amount: 0 }]);
  const [medSearch, setMedSearch] = useState<Record<number, string>>({});
  const [medResults, setMedResults] = useState<Record<number, any[]>>({});

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("purchase_returns")
        .select("*, supplier:suppliers(name)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("return_number", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setReturns(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { loadReturns(); }, [loadReturns]);
  useEffect(() => {
    supabase.from("suppliers").select("*").eq("status", "active").order("name").then(({ data }) => setSuppliers(data ?? []));
  }, []);

  const searchMed = async (idx: number, q: string) => {
    setMedSearch((p) => ({ ...p, [idx]: q }));
    if (q.length < 2) { setMedResults((p) => ({ ...p, [idx]: [] })); return; }
    const { data } = await supabase.from("medications").select("id, name, selling_price").ilike("name", `%${q}%`).limit(8);
    setMedResults((p) => ({ ...p, [idx]: data ?? [] }));
  };

  const selectMed = (idx: number, med: any) => {
    setItems((prev) => prev.map((item, i) => i !== idx ? item : { ...item, medication_id: med.id, medication_name: med.name, unit_price: med.selling_price || 0 }));
    setMedSearch((p) => ({ ...p, [idx]: med.name }));
    setMedResults((p) => ({ ...p, [idx]: [] }));
  };

  const updateItem = (idx: number, field: string, val: any) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: val };
      updated.gst_amount = updated.quantity * updated.unit_price * updated.gst_percent / 100;
      updated.total_amount = updated.quantity * updated.unit_price + updated.gst_amount;
      return updated;
    }));
  };

  const saveReturn = async () => {
    if (!supplierId || !items[0].medication_id) { alert("Fill required fields"); return; }
    setSaving(true);
    try {
      const returnNumber = `PR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
      const totalAmount = items.reduce((s, i) => s + i.total_amount, 0);
      const { data: ret, error } = await supabase.from("purchase_returns").insert({
        return_number: returnNumber,
        supplier_id: supplierId,
        return_date: returnDate,
        reason,
        reason_details: reasonDetails || null,
        subtotal: items.reduce((s, i) => s + i.quantity * i.unit_price, 0),
        gst_amount: items.reduce((s, i) => s + i.gst_amount, 0),
        total_amount: totalAmount,
        status: "submitted",
      }).select().single();
      if (error) throw error;
      await supabase.from("purchase_return_items").insert(items.map((item) => ({ return_id: ret.id, ...item })));
      alert(`Return ${returnNumber} created!`);
      setShowCreate(false);
      loadReturns();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search return no..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </Select>
            <Button onClick={loadReturns} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Return
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary-500" />
            Purchase Returns ({returns.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return No.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit Note</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : returns.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">No purchase returns found</TableCell></TableRow>
              ) : returns.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-semibold">{r.return_number}</TableCell>
                  <TableCell>{(r.supplier as any)?.name ?? "—"}</TableCell>
                  <TableCell>{formatDate(r.return_date)}</TableCell>
                  <TableCell className="capitalize">{r.reason?.replace("_", " ")}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(r.total_amount)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(r.status)}`}>{r.status}</span>
                  </TableCell>
                  <TableCell>{r.credit_note_number ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} className="max-w-3xl">
        <DialogHeader onClose={() => setShowCreate(false)}>
          <DialogTitle>New Purchase Return</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Supplier *</label>
              <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="Select supplier">
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Return Date</label>
              <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reason *</label>
              <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
                <option value="quality_issue">Quality Issue</option>
                <option value="wrong_item">Wrong Item</option>
                <option value="excess_stock">Excess Stock</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reason Details</label>
              <Input value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} placeholder="Additional details..." />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Return Items</p>
              <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { medication_id: "", medication_name: "", batch_number: "", quantity: 1, unit_price: 0, gst_percent: 12, gst_amount: 0, total_amount: 0 }])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-6 gap-2">
                <div className="relative col-span-2">
                  <Input placeholder="Search medicine..." value={medSearch[idx] ?? item.medication_name} onChange={(e) => searchMed(idx, e.target.value)} className="text-sm" />
                  {(medResults[idx]?.length ?? 0) > 0 && (
                    <div className="absolute left-0 top-10 z-10 w-56 rounded-lg border bg-white shadow-lg">
                      {medResults[idx].map((m) => (
                        <button key={m.id} onClick={() => selectMed(idx, m)} className="flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-gray-50">
                          <span className="font-medium">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input placeholder="Batch No." value={item.batch_number} onChange={(e) => updateItem(idx, "batch_number", e.target.value)} className="text-sm" />
                <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="text-right text-sm" />
                <Input type="number" placeholder="Rate" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="text-right text-sm" />
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold">{formatCurrency(item.total_amount)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-danger-500" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={saveReturn} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Create Return"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
