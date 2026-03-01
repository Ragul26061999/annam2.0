import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Eye, Edit, Trash2, RefreshCw, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import type { DrugPurchase } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function PurchaseList() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<DrugPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("drug_purchases")
        .select("*, supplier:suppliers(name, supplier_code)")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (paymentFilter !== "all") query = query.eq("payment_status", paymentFilter);
      if (search) {
        query = query.or(
          `purchase_number.ilike.%${search}%,invoice_number.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (!error && data) setPurchases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  useEffect(() => {
    const t = setTimeout(loadPurchases, 300);
    return () => clearTimeout(t);
  }, [loadPurchases]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search purchase no., invoice no..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="received">Received</option>
              <option value="verified">Verified</option>
              <option value="cancelled">Cancelled</option>
            </Select>
            <Select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="w-36">
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
            </Select>
            <Button onClick={loadPurchases} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => navigate("/purchase/new")} className="gap-2">
              <Plus className="h-4 w-4" /> New Purchase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-500" />
            Drug Purchases ({purchases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Purchase No.</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-gray-400">Loading...</TableCell>
                </TableRow>
              ) : purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-gray-400">No purchases found</TableCell>
                </TableRow>
              ) : (
                purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-semibold">{p.purchase_number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{(p.supplier as any)?.name ?? "—"}</p>
                        <p className="text-xs text-gray-400">{(p.supplier as any)?.supplier_code}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.invoice_number ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(p.purchase_date)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.total_amount)}</TableCell>
                    <TableCell>{formatCurrency(p.paid_amount)}</TableCell>
                    <TableCell className="capitalize">{p.payment_mode}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(p.payment_status)}`}>
                        {p.payment_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${getStatusColor(p.status)}`}>
                        {p.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-danger-500"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">Page {page + 1}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={purchases.length < PAGE_SIZE}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
