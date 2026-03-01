import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Edit, RefreshCw, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getCachedMedications, cacheItems } from "@/lib/db";
import { formatCurrency, formatDate, getStatusColor, isExpired, isExpiringSoon } from "@/lib/utils";
import type { Medication } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface MedicationWithBatch extends Medication {
  batch_number?: string;
  expiry_date?: string;
  batch_available?: number;
}

export function Inventory() {
  const [medications, setMedications] = useState<MedicationWithBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [allMedications, setAllMedications] = useState<MedicationWithBatch[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Derive filtered + paginated view from allMedications
  useEffect(() => {
    let filtered = allMedications;
    if (statusFilter !== "all") filtered = filtered.filter((m) => m.status === statusFilter);
    if (categoryFilter !== "all") filtered = filtered.filter((m) => m.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) => m.name?.toLowerCase().includes(q));
    }
    setMedications(filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE));
    if (page === 0) {
      const cats = [...new Set(filtered.map((m) => m.category).filter(Boolean))] as string[];
      setCategories(cats);
    }
  }, [allMedications, statusFilter, categoryFilter, search, page]);

  // ── local-first load ──────────────────────────────────────────────────
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedMedications();
    if (cached.length) {
      setAllMedications(cached as MedicationWithBatch[]);
      setLoading(false);
    }
  }, []);

  const loadFromCloud = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("name")
        .limit(2000);
      if (!error && data) {
        setAllMedications(data as MedicationWithBatch[]);
        await cacheItems("medications", data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadInventory = loadFromCloud;

  useEffect(() => {
    loadFromCache().then(() => loadFromCloud());
  }, []);

  function getStockBadge(med: MedicationWithBatch) {
    if ((med.available_stock ?? 0) <= 0)
      return <Badge variant="destructive">Out of Stock</Badge>;
    if ((med.available_stock ?? 0) <= (med.minimum_stock_level ?? 0))
      return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search medicine name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="w-36"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </Select>
            <Select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              className="w-40"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
            <Button onClick={loadInventory} variant="ghost" size="icon">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Medicine
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-500" />
            Inventory ({medications.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Dosage Form</TableHead>
                <TableHead>Available Stock</TableHead>
                <TableHead>Min Stock</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stock Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : medications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-8 text-center text-gray-400">
                    No medications found
                  </TableCell>
                </TableRow>
              ) : (
                medications.map((med) => (
                  <TableRow key={med.id}>
                    <TableCell className="font-mono text-xs">{med.medicine_code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{med.name}</p>
                        <p className="text-xs text-gray-400">{med.generic_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{med.category}</TableCell>
                    <TableCell>{med.dosage_form} {med.strength}</TableCell>
                    <TableCell className="font-medium">{med.available_stock ?? 0}</TableCell>
                    <TableCell className="text-gray-500">{med.minimum_stock_level ?? 0}</TableCell>
                    <TableCell>{formatCurrency(med.mrp)}</TableCell>
                    <TableCell>{formatCurrency(med.selling_price)}</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(med.status)}`}>
                        {med.status}
                      </span>
                    </TableCell>
                    <TableCell>{getStockBadge(med)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-gray-500">
              Page {page + 1} · {medications.length} results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={medications.length < PAGE_SIZE}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
