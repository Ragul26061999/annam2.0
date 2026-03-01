import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Eye, RefreshCw, DollarSign, Save, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { CashCollection as ICashCollection } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "@/components/ui/dialog";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export function CashCollection() {
  const [collections, setCollections] = useState<ICashCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showClose, setShowClose] = useState<ICashCollection | null>(null);
  const [saving, setSaving] = useState(false);

  // Create form state
  const [shift, setShift] = useState<"morning" | "afternoon" | "night" | "general">("morning");
  const [collectorName, setCollectorName] = useState("");
  const [openingCash, setOpeningCash] = useState(0);
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().slice(0, 10));

  // Close form state
  const [actualCash, setActualCash] = useState(0);
  const [denominations, setDenominations] = useState<Record<string, number>>({});
  const [closeRemarks, setCloseRemarks] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("pharmacy_cash_collections").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (search) query = query.ilike("collector_name", `%${search}%`);
      const { data, error } = await query;
      if (!error && data) setCollections(data);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const denominationTotal = DENOMINATIONS.reduce(
    (s, d) => s + d * (denominations[String(d)] || 0),
    0
  );

  const openCollection = async () => {
    if (!collectorName) { alert("Enter collector name"); return; }
    setSaving(true);
    try {
      const collectionNumber = `CC-${collectionDate.replace(/-/g, "")}-${Math.floor(Math.random() * 9000) + 1000}`;
      const { error } = await supabase.from("pharmacy_cash_collections").insert({
        collection_number: collectionNumber,
        collection_date: collectionDate,
        shift,
        collected_by: collectorName,
        collector_name: collectorName,
        opening_cash: openingCash,
        cash_sales: 0,
        card_collections: 0,
        upi_collections: 0,
        insurance_collections: 0,
        credit_collections: 0,
        cash_refunds: 0,
        total_collections: 0,
        total_bills: 0,
        total_returns: 0,
        expected_cash: openingCash,
        cash_difference: 0,
        status: "open",
      });
      if (error) throw error;
      alert("Collection opened!");
      setShowCreate(false);
      load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const closeCollection = async () => {
    if (!showClose) return;
    setSaving(true);
    try {
      const difference = actualCash - (showClose.expected_cash || 0);
      const { error } = await supabase.from("pharmacy_cash_collections").update({
        actual_cash: actualCash,
        cash_difference: difference,
        denominations,
        remarks: closeRemarks || null,
        status: Math.abs(difference) > 100 ? "discrepancy" : "closed",
      }).eq("id", showClose.id);
      if (error) throw error;
      alert("Collection closed!");
      setShowClose(null);
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
              <Input placeholder="Search collector..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="verified">Verified</option>
              <option value="discrepancy">Discrepancy</option>
            </Select>
            <Button onClick={load} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Open Collection
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary-500" />
            Cash Collections ({collections.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Collector</TableHead>
                <TableHead>Opening Cash</TableHead>
                <TableHead>Cash Sales</TableHead>
                <TableHead>Card</TableHead>
                <TableHead>UPI</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Difference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={13} className="py-8 text-center text-gray-400">Loading...</TableCell></TableRow>
              ) : collections.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="py-8 text-center text-gray-400">No collections found</TableCell></TableRow>
              ) : collections.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs font-semibold">{c.collection_number}</TableCell>
                  <TableCell>{formatDate(c.collection_date)}</TableCell>
                  <TableCell className="capitalize">{c.shift}</TableCell>
                  <TableCell>{c.collector_name ?? c.collected_by}</TableCell>
                  <TableCell>{formatCurrency(c.opening_cash)}</TableCell>
                  <TableCell>{formatCurrency(c.cash_sales)}</TableCell>
                  <TableCell>{formatCurrency(c.card_collections)}</TableCell>
                  <TableCell>{formatCurrency(c.upi_collections)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(c.expected_cash)}</TableCell>
                  <TableCell>{c.actual_cash != null ? formatCurrency(c.actual_cash) : "—"}</TableCell>
                  <TableCell className={c.cash_difference < 0 ? "text-danger-600 font-semibold" : c.cash_difference > 0 ? "text-success-600 font-semibold" : ""}>
                    {c.cash_difference != null ? formatCurrency(c.cash_difference) : "—"}
                  </TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(c.status)}`}>{c.status}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                      {c.status === "open" && (
                        <Button variant="outline" size="sm" onClick={() => { setShowClose(c); setActualCash(c.expected_cash); }}>
                          Close
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Open Collection Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)}>
        <DialogHeader onClose={() => setShowCreate(false)}>
          <DialogTitle>Open Cash Collection</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Collection Date</label>
              <Input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Shift</label>
              <Select value={shift} onChange={(e) => setShift(e.target.value as any)}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
                <option value="general">General</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Collector Name *</label>
              <Input value={collectorName} onChange={(e) => setCollectorName(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Opening Cash (₹)</label>
              <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
          <Button onClick={openCollection} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Opening..." : "Open Collection"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Close Collection Dialog */}
      <Dialog open={!!showClose} onClose={() => setShowClose(null)} className="max-w-2xl">
        <DialogHeader onClose={() => setShowClose(null)}>
          <DialogTitle>Close Collection — {showClose?.collection_number}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {showClose && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
              <div><span className="text-gray-500">Cash Sales:</span> <strong>{formatCurrency(showClose.cash_sales)}</strong></div>
              <div><span className="text-gray-500">Card:</span> <strong>{formatCurrency(showClose.card_collections)}</strong></div>
              <div><span className="text-gray-500">UPI:</span> <strong>{formatCurrency(showClose.upi_collections)}</strong></div>
              <div><span className="text-gray-500">Insurance:</span> <strong>{formatCurrency(showClose.insurance_collections)}</strong></div>
              <div className="col-span-2 border-t pt-2">
                <span className="text-gray-500">Expected Cash:</span> <strong className="text-primary-600">{formatCurrency(showClose.expected_cash)}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">Denomination Count</label>
            <div className="grid grid-cols-2 gap-2">
              {DENOMINATIONS.map((d) => (
                <div key={d} className="flex items-center gap-2">
                  <span className="w-16 text-right text-sm font-medium">₹{d}</span>
                  <Input
                    type="number"
                    min={0}
                    value={denominations[String(d)] || ""}
                    onChange={(e) => setDenominations((prev) => ({ ...prev, [String(d)]: parseInt(e.target.value) || 0 }))}
                    className="text-right text-sm"
                    placeholder="0"
                  />
                  <span className="w-24 text-right text-sm text-gray-500">
                    = {formatCurrency(d * (denominations[String(d)] || 0))}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg bg-primary-50 p-3 text-center">
              <p className="text-sm text-primary-600">Denomination Total</p>
              <p className="text-xl font-bold text-primary-700">{formatCurrency(denominationTotal)}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Actual Cash Count (₹)</label>
            <Input type="number" value={actualCash} onChange={(e) => setActualCash(parseFloat(e.target.value) || 0)} />
          </div>

          {showClose && (
            <div className={`rounded-lg p-3 text-center ${actualCash < showClose.expected_cash ? "bg-danger-50" : "bg-success-50"}`}>
              <p className="text-sm">Difference</p>
              <p className={`text-xl font-bold ${actualCash < showClose.expected_cash ? "text-danger-700" : "text-success-700"}`}>
                {formatCurrency(actualCash - showClose.expected_cash)}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Remarks</label>
            <Input value={closeRemarks} onChange={(e) => setCloseRemarks(e.target.value)} placeholder="Any remarks..." />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowClose(null)}>Cancel</Button>
          <Button onClick={closeCollection} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? "Closing..." : "Close Collection"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
