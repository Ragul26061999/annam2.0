import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, RefreshCw, AlertTriangle, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { DrugBrokenRecord, Medication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

export function DrugBroken() {
  const [records, setRecords] = useState<DrugBrokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [medicationId, setMedicationId] = useState("");
  const [medicationName, setMedicationName] = useState("");
  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState<any[]>([]);
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [damageType, setDamageType] = useState("broken");
  const [damageDescription, setDamageDescription] = useState("");
  const [location, setLocation] = useState("");
  const [discovererName, setDiscovererName] = useState("");
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("drug_broken_records").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("medication_name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const searchMed = async (q: string) => {
    setMedSearch(q);
    if (q.length < 2) { setMedResults([]); return; }
    const { data } = await supabase.from("medications").select("id, name, selling_price").ilike("name", `%${q}%`).limit(8);
    setMedResults(data ?? []);
  };

  const selectMed = (med: any) => {
    setMedicationId(med.id);
    setMedicationName(med.name);
    setUnitPrice(med.selling_price || 0);
    setMedSearch(med.name);
    setMedResults([]);
  };

  const totalLoss = quantity * unitPrice;

  const saveRecord = async () => {
    if (!medicationId) { alert("Select a medication"); return; }
    setSaving(true);
    try {
      const recordNumber = `DB-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
      const { error } = await supabase.from("drug_broken_records").insert({
        record_number: recordNumber,
        record_date: recordDate,
        medication_id: medicationId,
        medication_name: medicationName,
        batch_number: batchNumber,
        expiry_date: expiryDate || null,
        quantity,
        unit_price: unitPrice,
        total_loss: totalLoss,
        damage_type: damageType,
        damage_description: damageDescription || null,
        location: location || null,
        discoverer_name: discovererName || null,
        disposal_method: "pending",
        status: "reported",
        remarks: remarks || null,
      });
      if (error) throw error;
      alert(`Record ${recordNumber} created!`);
      setShowCreate(false);
      load();
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
              <Input placeholder="Search medicine name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="reported">Reported</option>
              <option value="verified">Verified</option>
              <option value="disposed">Disposed</option>
              <option value="claimed">Claimed</option>
            </Select>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Record Damage
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            Drug Damage Records ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record No.</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total Loss</TableHead>
                <TableHead>Damage Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-gray-400">No damage records found</TableCell></TableRow>
              ) : records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-semibold">{r.record_number}</TableCell>
                  <TableCell className="font-medium">{r.medication_name}</TableCell>
                  <TableCell>{r.batch_number}</TableCell>
                  <TableCell>{formatDate(r.record_date)}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell className="font-semibold text-danger-600">{formatCurrency(r.total_loss)}</TableCell>
                  <TableCell className="capitalize">{r.damage_type?.replace("_", " ")}</TableCell>
                  <TableCell>{r.location ?? "—"}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(r.status)}`}>{r.status}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} className="max-w-2xl">
        <DialogHeader onClose={() => setShowCreate(false)}>
          <DialogTitle>Record Drug Damage</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Medicine *</label>
              <div className="relative">
                <Input placeholder="Search medicine..." value={medSearch} onChange={(e) => searchMed(e.target.value)} />
                {medResults.length > 0 && (
                  <div className="absolute left-0 top-10 z-10 w-full rounded-lg border bg-white shadow-lg">
                    {medResults.map((m) => (
                      <button key={m.id} onClick={() => selectMed(m)} className="flex w-full px-3 py-2 text-left text-sm hover:bg-gray-50">
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Batch Number *</label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="Batch" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Expiry Date</label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Quantity *</label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unit Price</label>
              <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Damage Type *</label>
              <Select value={damageType} onChange={(e) => setDamageType(e.target.value)}>
                <option value="broken">Broken</option>
                <option value="leaked">Leaked</option>
                <option value="contaminated">Contaminated</option>
                <option value="packaging_damaged">Packaging Damaged</option>
                <option value="temperature_damage">Temperature Damage</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Record Date</label>
              <Input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Location Found</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where found" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Discovered By</label>
              <Input value={discovererName} onChange={(e) => setDiscovererName(e.target.value)} placeholder="Name" />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Damage Description</label>
              <textarea value={damageDescription} onChange={(e) => setDamageDescription(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" rows={2} placeholder="Describe the damage..." />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium">Remarks</label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Additional remarks" />
            </div>
          </div>
          {totalLoss > 0 && (
            <div className="rounded-lg bg-danger-50 p-3 text-center">
              <p className="text-sm text-danger-600">Estimated Loss</p>
              <p className="text-xl font-bold text-danger-700">{formatCurrency(totalLoss)}</p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={saveRecord} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Record"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
