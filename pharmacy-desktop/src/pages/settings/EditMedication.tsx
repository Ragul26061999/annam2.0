import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw, Edit, ChevronDown, ChevronRight, Plus, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Medication, MedicationBatch } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

interface MedWithBatches extends Medication {
  batches?: MedicationBatch[];
  expanded?: boolean;
}

export function EditMedication() {
  const [medications, setMedications] = useState<MedWithBatches[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;
  const [editingMed, setEditingMed] = useState<MedWithBatches | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("medications")
        .select("*")
        .order("name")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (search) query = query.ilike("name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setMedications(data.map((m) => ({ ...m, expanded: false })));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const toggleExpand = async (med: MedWithBatches) => {
    if (!med.expanded && !med.batches) {
      // Load batches lazily
      const { data } = await supabase
        .from("stock_transactions")
        .select("batch_number, expiry_date, quantity, transaction_type, created_at")
        .eq("medication_id", med.id)
        .eq("transaction_type", "purchase")
        .order("created_at", { ascending: false });

      setMedications((prev) =>
        prev.map((m) =>
          m.id === med.id ? { ...m, expanded: true, batches: data as any ?? [] } : m
        )
      );
    } else {
      setMedications((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, expanded: !m.expanded } : m))
      );
    }
  };

  const saveMedication = async () => {
    if (!editingMed) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("medications")
        .update({
          name: editingMed.name,
          generic_name: editingMed.generic_name,
          manufacturer: editingMed.manufacturer,
          category: editingMed.category,
          dosage_form: editingMed.dosage_form,
          strength: editingMed.strength,
          unit: editingMed.unit,
          selling_price: editingMed.selling_price,
          mrp: editingMed.mrp,
          purchase_price: editingMed.purchase_price,
          minimum_stock_level: editingMed.minimum_stock_level,
          status: editingMed.status,
          hsn_code: editingMed.hsn_code,
          gst_percent: editingMed.gst_percent,
          cgst_percent: editingMed.cgst_percent,
          sgst_percent: editingMed.sgst_percent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingMed.id);
      if (error) throw error;
      alert("Medication updated!");
      setEditingMed(null);
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
              <Input placeholder="Search medication name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-9" />
            </div>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Edit Medications ({medications.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="py-8 text-center text-gray-400">Loading...</p>
          ) : medications.length === 0 ? (
            <p className="py-8 text-center text-gray-400">No medications found</p>
          ) : (
            <div>
              {medications.map((med) => (
                <div key={med.id} className="border-b">
                  {/* Medication Row */}
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <button onClick={() => toggleExpand(med)} className="text-gray-400">
                      {med.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="flex-1 grid grid-cols-6 gap-4 text-sm">
                      <div className="col-span-2">
                        <p className="font-medium">{med.name}</p>
                        <p className="text-xs text-gray-400">{med.generic_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Category</p>
                        <p>{med.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Dosage Form</p>
                        <p>{med.dosage_form} {med.strength}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Stock / MRP</p>
                        <p>{med.available_stock} / {formatCurrency(med.mrp)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Status</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${med.status === "active" ? "bg-success-100 text-success-700" : "bg-gray-100 text-gray-600"}`}>
                          {med.status}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMed({ ...med })}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Batch Details */}
                  {med.expanded && (
                    <div className="border-t bg-gray-50 px-8 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Batches / Purchase History</p>
                      {!med.batches || med.batches.length === 0 ? (
                        <p className="text-sm text-gray-400">No batch records found</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-gray-500">
                              <th className="pb-1 text-left">Batch No.</th>
                              <th className="pb-1 text-left">Expiry Date</th>
                              <th className="pb-1 text-right">Qty</th>
                              <th className="pb-1 text-left">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(med.batches as any[]).map((b, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1 font-mono">{b.batch_number}</td>
                                <td className="py-1">{formatDate(b.expiry_date)}</td>
                                <td className="py-1 text-right">{b.quantity}</td>
                                <td className="py-1">{formatDate(b.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={medications.length < PAGE_SIZE}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingMed && (
        <Dialog open={!!editingMed} onClose={() => setEditingMed(null)} className="max-w-2xl">
          <DialogHeader onClose={() => setEditingMed(null)}>
            <DialogTitle>Edit: {editingMed.name}</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid grid-cols-2 gap-4">
            {([
              ["name", "Name *"],
              ["generic_name", "Generic Name"],
              ["manufacturer", "Manufacturer"],
              ["category", "Category"],
              ["dosage_form", "Dosage Form"],
              ["strength", "Strength"],
              ["unit", "Unit"],
              ["hsn_code", "HSN Code"],
            ] as [keyof Medication, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <Input
                  value={String(editingMed[key] ?? "")}
                  onChange={(e) => setEditingMed((p) => p ? { ...p, [key]: e.target.value } : p)}
                />
              </div>
            ))}
            {([
              ["selling_price", "Selling Price"],
              ["mrp", "MRP"],
              ["purchase_price", "Purchase Price"],
              ["minimum_stock_level", "Min Stock Level"],
              ["gst_percent", "GST %"],
              ["cgst_percent", "CGST %"],
              ["sgst_percent", "SGST %"],
            ] as [keyof Medication, string][]).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <Input
                  type="number"
                  value={String(editingMed[key] ?? "")}
                  onChange={(e) => setEditingMed((p) => p ? { ...p, [key]: parseFloat(e.target.value) || 0 } : p)}
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <Select value={editingMed.status} onChange={(e) => setEditingMed((p) => p ? { ...p, status: e.target.value as any } : p)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMed(null)}>Cancel</Button>
            <Button onClick={saveMedication} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </Dialog>
      )}
    </div>
  );
}
