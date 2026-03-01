import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, RefreshCw, Receipt, TrendingUp,
  DollarSign, Clock, CheckCircle, AlertCircle, Wifi, WifiOff,
} from "lucide-react";
import { supabase, isMissingColumnError } from "@/lib/supabase";
import { getCachedBills, cacheItems } from "@/lib/db";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Bill {
  id: string;
  bill_number?: string;
  customer_name?: string;
  customer_type?: string;
  patient_uhid?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount?: number;
  amount_paid?: number;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
  staff_name?: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  paid:    { icon: CheckCircle,  cls: "bg-success-50 text-success-700 border-success-200", label: "Paid" },
  partial: { icon: AlertCircle, cls: "bg-warning-50 text-warning-700 border-warning-200", label: "Partial" },
  pending: { icon: Clock,        cls: "bg-danger-50 text-danger-700 border-danger-200",   label: "Pending" },
};

const METHOD_ICON: Record<string, string> = {
  cash: "💵", card: "💳", upi: "📱", credit: "⏳",
};

export function BillingList() {
  const navigate = useNavigate();
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [source, setSource] = useState<"cache" | "cloud" | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  /* Filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  /* ── Stats derived from allBills ── */
  const today = new Date().toISOString().slice(0, 10);
  const todayBills = allBills.filter((b) => b.created_at?.slice(0, 10) === today);
  const todaySales = todayBills.reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const pendingCount = allBills.filter((b) => b.payment_status === "pending").length;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthSales = allBills.filter((b) => (b.created_at ?? "") >= monthStart)
    .reduce((s, b) => s + (b.total_amount ?? 0), 0);

  /* ── Local-first load ── */
  const loadFromCache = useCallback(async () => {
    const cached = await getCachedBills(500);
    if (cached.length) {
      setAllBills(cached as Bill[]);
      setSource("cache");
      setLoading(false);
    }
  }, []);

  const loadFromCloud = useCallback(async () => {
    setRefreshing(true);
    try {
      const baseCols = "id, bill_number, customer_name, customer_type, subtotal, discount, tax, amount_paid, payment_method, payment_status, created_at";

      const select1 = `${baseCols}, patient_uhid, total_amount`;
      const select2 = `${baseCols}, total_amount`;
      const select3 = `${baseCols}, patient_uhid`;
      const select4 = `${baseCols}`;

      const trySelect = async (columns: string) =>
        await supabase
          .from("billing")
          .select(columns)
          .order("created_at", { ascending: false })
          .limit(500);

      let r = await trySelect(select1);
      if (r.error && isMissingColumnError(r.error, "patient_uhid")) {
        r = await trySelect(select2);
      }
      if (r.error && isMissingColumnError(r.error, "total_amount")) {
        // Some schemas may not have total_amount; we compute it from subtotal/discount/tax.
        r = await trySelect(isMissingColumnError(r.error, "patient_uhid") ? select4 : select3);
      }

      if (r.error) throw r.error;

      const data = (r.data ?? []).map((row: any) => {
        const subtotal = Number(row.subtotal ?? 0);
        const discount = Number(row.discount ?? 0);
        const tax = Number(row.tax ?? 0);
        const computedTotal = subtotal - discount + tax;
        return {
          ...row,
          total_amount: row.total_amount ?? computedTotal,
        };
      });

      setAllBills(data as Bill[]);
      setSource("cloud");
      setIsOnline(true);
      await cacheItems("pharmacy_bills", data);
    } catch {
      setIsOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFromCache().then(() => loadFromCloud());
  }, []);

  /* ── Filtered + paginated view ── */
  const filtered = allBills.filter((b) => {
    if (statusFilter !== "all" && b.payment_status !== statusFilter) return false;
    if (methodFilter !== "all" && b.payment_method !== methodFilter) return false;
    if (dateFrom && (b.created_at ?? "") < dateFrom) return false;
    if (dateTo && (b.created_at ?? "") > dateTo + "T23:59:59") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        b.bill_number?.toLowerCase().includes(q) ||
        b.customer_name?.toLowerCase().includes(q) ||
        b.patient_uhid?.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-5">
      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Today's Sales", value: formatCurrency(todaySales), sub: `${todayBills.length} bills`, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Monthly Collection", value: formatCurrency(monthSales), sub: "This month", icon: DollarSign, color: "text-success-600", bg: "bg-success-50" },
          { label: "Total Bills", value: filtered.length.toString(), sub: "Matching filters", icon: Receipt, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "Pending", value: pendingCount.toString(), sub: "Awaiting payment", icon: Clock, color: "text-danger-600", bg: "bg-danger-50" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                <p className="mt-1 text-xl font-bold text-gray-800 tabular-nums">{loading ? "—" : s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
              <div className={cn("rounded-xl p-2", s.bg)}>
                <s.icon className={cn("h-4 w-4", s.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls row ── */}
      <div className="card !p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search bill no, patient, UHID…"
              className="input-field pl-9 py-2"
            />
          </div>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>

          <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
            <option value="all">All Methods</option>
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="upi">📱 UPI</option>
            <option value="credit">⏳ Credit</option>
          </select>

          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />

          {/* Source + refresh */}
          <div className="flex items-center gap-1.5 ml-auto">
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-success-500" /> : <WifiOff className="h-3.5 w-3.5 text-danger-500" />}
            {source && (
              <span className="text-[11px] text-gray-400">
                {source === "cache" ? "Local cache" : "Live"}{refreshing ? " · syncing…" : ""}
              </span>
            )}
            <button onClick={loadFromCloud} disabled={refreshing}
              className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-colors">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </button>
          </div>

          <button onClick={() => navigate("/billing/new")}
            className="btn-primary flex items-center gap-2 py-2 px-4">
            <Plus className="h-4 w-4" /> New Bill
          </button>
        </div>
      </div>

      {/* ── Bills table ── */}
      <div className="card !p-0 overflow-hidden">
        {loading && allBills.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-orange-300 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Loading bills…</p>
            </div>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Receipt className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No bills found</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Bill No.</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Patient / Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date & Time</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Method</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((bill) => {
                  const status = STATUS_CONFIG[bill.payment_status ?? "pending"] ?? STATUS_CONFIG.pending;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={bill.id}
                      onClick={() => {/* TODO: bill detail */ }}
                      className="border-b border-gray-50 hover:bg-orange-50/30 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                          {bill.bill_number ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{bill.customer_name || "Walk-in"}</p>
                        {bill.patient_uhid && (
                          <p className="text-xs text-orange-500 font-medium">{bill.patient_uhid}</p>
                        )}
                        {bill.customer_type && (
                          <p className="text-[11px] text-gray-400 capitalize">{bill.customer_type.replace("_", " ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {bill.created_at ? formatDateTime(bill.created_at) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm" title={bill.payment_method}>
                          {METHOD_ICON[bill.payment_method ?? ""] ?? "💰"}
                        </span>
                        <span className="ml-1 text-xs text-gray-400 capitalize">{bill.payment_method}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-gray-800">{formatCurrency(bill.total_amount ?? 0)}</span>
                        {bill.amount_paid != null && bill.amount_paid < (bill.total_amount ?? 0) && (
                          <p className="text-[11px] text-danger-500 mt-0.5">Paid: {formatCurrency(bill.amount_paid)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border", status.cls)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ← Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn("h-7 w-7 text-xs rounded-lg border transition-colors",
                  i === page ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 hover:bg-orange-50"
                )}>
                {i + 1}
              </button>
            ))}
            <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-orange-50 hover:border-orange-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
