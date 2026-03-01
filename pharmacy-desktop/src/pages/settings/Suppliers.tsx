import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit, Trash2, RefreshCw, Truck, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStatusColor } from "@/lib/utils";
import type { Supplier } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

const emptySupplier = (): Partial<Supplier> => ({
  name: "", contact_person: "", phone: "", email: "",
  address: "", city: "", state: "", pincode: "",
  gstin: "", drug_license_no: "", payment_terms: "",
  credit_days: 30, status: "active", notes: "",
});

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Supplier>>(emptySupplier());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("suppliers").select("*").order("name");
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setSuppliers(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditingId(null); setForm(emptySupplier()); setShowForm(true); };
  const openEdit = (s: Supplier) => { setEditingId(s.id); setForm({ ...s }); setShowForm(true); };

  const saveSupplier = async () => {
    if (!form.name) { alert("Supplier name is required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("suppliers").update({ ...form, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
      } else {
        const supplierCode = `SUP-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}`;
        const { error } = await supabase.from("suppliers").insert({ ...form, supplier_code: supplierCode });
        if (error) throw error;
      }
      alert(editingId ? "Supplier updated!" : "Supplier created!");
      setShowForm(false);
      load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (!error) load();
  };

  const field = (key: keyof Supplier, label: string, type = "text", options?: string[]) => (
    <div key={key}>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      {options ? (
        <Select value={String(form[key] ?? "")} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}>
          {options.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
        </Select>
      ) : (
        <Input
          type={type}
          value={String(form[key] ?? "")}
          onChange={(e) => setForm((p) => ({ ...p, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
          placeholder={label}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input placeholder="Search supplier name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="blacklisted">Blacklisted</option>
            </Select>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Add Supplier
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary-500" />
            Suppliers ({suppliers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>GSTIN</TableHead>
                <TableHead>Credit Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : suppliers.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="py-8 text-center text-gray-400">No suppliers found</TableCell></TableRow>
              ) : suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.supplier_code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{s.name}</p>
                      {s.drug_license_no && <p className="text-xs text-gray-400">DL: {s.drug_license_no}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{s.contact_person ?? "—"}</TableCell>
                  <TableCell>{s.phone ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.email ?? "—"}</TableCell>
                  <TableCell>{s.city ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.gstin ?? "—"}</TableCell>
                  <TableCell>{s.credit_days} days</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(s.status)}`}>{s.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-danger-500" onClick={() => deleteSupplier(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} className="max-w-2xl">
        <DialogHeader onClose={() => setShowForm(false)}>
          <DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="grid grid-cols-2 gap-4">
          {field("name", "Name *")}
          {field("contact_person", "Contact Person")}
          {field("phone", "Phone", "tel")}
          {field("email", "Email", "email")}
          {field("address", "Address")}
          {field("city", "City")}
          {field("state", "State")}
          {field("pincode", "Pincode")}
          {field("gstin", "GSTIN")}
          {field("drug_license_no", "Drug License No.")}
          {field("payment_terms", "Payment Terms")}
          {field("credit_days", "Credit Days", "number")}
          {field("status", "Status", "text", ["active", "inactive", "blacklisted"])}
          <div className="col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
              placeholder="Any notes..."
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button onClick={saveSupplier} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : editingId ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
