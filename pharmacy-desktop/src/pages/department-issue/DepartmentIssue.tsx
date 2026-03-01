import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, RefreshCw, Building2, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { DepartmentDrugIssue, Medication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

export function DepartmentIssue() {
  const [issues, setIssues] = useState<DepartmentDrugIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  // Form state
  const [deptName, setDeptName] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [purpose, setPurpose] = useState("");
  const [items, setItems] = useState([{ medication_id: "", medication_name: "", requested_quantity: 1, issued_quantity: 0, unit_price: 0, total_amount: 0, status: "pending" as const }]);
  const [medSearch, setMedSearch] = useState<Record<number, string>>({});
  const [medResults, setMedResults] = useState<Record<number, any[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("department_drug_issues").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("department_name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setIssues(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    supabase.from("departments").select("id, name").order("name").then(({ data }) => setDepartments(data ?? []));
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
      updated.total_amount = updated.requested_quantity * updated.unit_price;
      return updated;
    }));
  };

  const saveIssue = async () => {
    if (!deptName) { alert("Select department"); return; }
    setSaving(true);
    try {
      const issueNumber = `DI-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
      const totalValue = items.reduce((s, i) => s + i.total_amount, 0);
      const { data: issue, error } = await supabase.from("department_drug_issues").insert({
        issue_number: issueNumber,
        department_name: deptName,
        requester_name: requesterName || null,
        issue_date: issueDate,
        purpose: purpose || null,
        total_items: items.length,
        total_value: totalValue,
        status: "pending",
      }).select().single();
      if (error) throw error;
      await supabase.from("department_drug_issue_items").insert(items.map((item) => ({ issue_id: issue.id, ...item })));
      alert(`Issue ${issueNumber} created!`);
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
              <Input placeholder="Search department..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="issued">Issued</option>
              <option value="partial">Partial</option>
              <option value="rejected">Rejected</option>
              <option value="returned">Returned</option>
            </Select>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Issue
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary-500" />
            Department Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue No.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : issues.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-gray-400">No issues found</TableCell></TableRow>
              ) : issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-mono text-xs font-semibold">{issue.issue_number}</TableCell>
                  <TableCell className="font-medium">{issue.department_name}</TableCell>
                  <TableCell>{issue.requester_name ?? "—"}</TableCell>
                  <TableCell>{formatDate(issue.issue_date)}</TableCell>
                  <TableCell>{issue.total_items}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(issue.total_value)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(issue.status)}`}>{issue.status}</span>
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

      <Dialog open={showCreate} onClose={() => setShowCreate(false)} className="max-w-3xl">
        <DialogHeader onClose={() => setShowCreate(false)}>
          <DialogTitle>New Department Drug Issue</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Department *</label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Department name" list="dept-list" />
              <datalist id="dept-list">{departments.map((d) => <option key={d.id} value={d.name} />)}</datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Requester Name</label>
              <Input value={requesterName} onChange={(e) => setRequesterName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Issue Date</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Purpose</label>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Purpose of issue" />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Items</p>
              <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, { medication_id: "", medication_name: "", requested_quantity: 1, issued_quantity: 0, unit_price: 0, total_amount: 0, status: "pending" }])}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-5 gap-2 items-center">
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
                <Input type="number" placeholder="Qty" value={item.requested_quantity} onChange={(e) => updateItem(idx, "requested_quantity", parseInt(e.target.value) || 1)} className="text-right text-sm" />
                <Input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="text-right text-sm" />
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
          <Button onClick={saveIssue} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Create Issue"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
